<?php

namespace App\Http\Controllers;

use App\Models\Article;
use App\Models\ChatMessage;
use App\Models\Product;
use App\Models\SiteSetting;
use App\Services\AiProvider;
use App\Services\AiProviderFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class ChatController extends Controller
{
    public function message(Request $request)
    {
        set_time_limit(120);

        $user = $request->user();

        if ($user) {
            // Authenticated: the server is the source of truth for conversation history —
            // the client only sends the single new message it just typed.
            $request->validate([
                'messages'           => 'required|array|min:1|max:1',
                'messages.0.role'    => 'required|in:user',
                'messages.0.content' => 'required|string|max:10000',
            ]);

            $incoming = trim($request->input('messages.0.content'));
            if ($incoming === '') {
                Log::warning('[Chat] Request rejected — empty message content');
                return response()->json(['error' => 'No messages provided.'], 422);
            }

            $user->chatMessages()->create(['role' => 'user', 'content' => $incoming]);

            $messages = $user->chatMessages()
                ->latest('created_at')->latest('id')
                ->limit(15)->get()
                ->reverse()->values()
                ->map(fn ($m) => ['role' => $m->role, 'content' => $m->content])
                ->toArray();
        } else {
            $request->validate([
                'messages'           => 'required|array|min:1|max:15',
                'messages.*.role'    => 'required|in:user,assistant',
                'messages.*.content' => 'present|string|max:10000',
            ]);

            $messages = collect($request->input('messages'))
                ->filter(fn ($m) => filled($m['content'] ?? ''))
                ->values()
                ->toArray();

            // Defensive net regardless of what the client sends — this is a public, rate-limited endpoint.
            $messages = array_slice($messages, -15);

            if (empty($messages)) {
                Log::warning('[Chat] Request rejected — no messages after filtering empty content');
                return response()->json(['error' => 'No messages provided.'], 422);
            }
        }

        $provider = AiProviderFactory::make();
        $msgCount = count($messages);
        $lastMsg  = $messages[$msgCount - 1]['content'] ?? '';

        Log::info('[Chat] Request received', [
            'message_count' => $msgCount,
            'last_user_msg' => mb_substr($lastMsg, 0, 120),
            'provider'      => get_class($provider),
        ]);

        // Step 1: Scanning — intent, safety, and (if no product search is needed) the reply itself
        Log::info('[Chat] Step 1 — scanning');
        $scan = $this->scanIntent($provider, $messages);
        Log::info('[Chat] Scan result', [
            'needs_products' => $scan['needs_products'],
            'safe'           => $scan['safe'],
            'failed'         => $scan['failed'],
        ]);

        $useDirectReply = !$scan['needs_products'] && !$scan['needs_journals'] && !$scan['failed'] && filled($scan['direct_reply']);

        if ($useDirectReply) {
            Log::info('[Chat] Step 2 — skipped (scanning phase answered directly)');
            Log::info('[Chat] Reply sent', ['length' => mb_strlen($scan['direct_reply']), 'text' => $scan['direct_reply']]);

            return response()->stream(function () use ($scan, $user, $provider, $lastMsg) {
                while (ob_get_level() > 0) ob_end_flush();
                echo 'data: ' . json_encode(['text' => $scan['direct_reply']]) . "\n\n";
                flush();

                $suggestions = $this->generateFollowUps($provider, $lastMsg, $scan['direct_reply']);
                if (! empty($suggestions)) {
                    echo 'data: ' . json_encode(['suggestions' => $suggestions]) . "\n\n";
                    flush();
                }

                echo "data: [DONE]\n\n";
                flush();

                if ($user) {
                    $user->chatMessages()->create(['role' => 'assistant', 'content' => $scan['direct_reply']]);
                }
            }, 200, [
                'Content-Type'      => 'text/event-stream',
                'Cache-Control'     => 'no-cache, no-store',
                'X-Accel-Buffering' => 'no',
                'Connection'        => 'keep-alive',
            ]);
        }

        // Step 2: Product search (also runs — with an empty list — if scanning failed
        // entirely or found no search terms, degrading to the existing no-match fallback)
        $products = [];
        $tokenMap = [];
        $clientProducts = [];
        if ($scan['needs_products'] && ! empty($scan['search'])) {
            Log::info('[Chat] Step 2 — searching products', ['search' => $scan['search']]);
            $result   = $this->searchProducts($scan['search']);
            $products = $result['products'];
            $tokenMap = $result['map'];
            $clientProducts = $result['client_products'] ?? [];
            Log::info('[Chat] Product search complete', ['products_found' => count($products)]);
        } else {
            Log::info('[Chat] Step 2 — skipped (no product search needed)');
        }

        // Step 2b: Journal (article) search — same "search now, ground on results" shape
        // as products, so Elo can point customers to an existing Limitra Journal guide
        // instead of only ever recommending products. Each matched journal also carries
        // its actual body content and the products referenced inside it (see
        // searchJournals()/extractArticleContent()) — those products are merged into the
        // same $products/$tokenMap pool the general catalog search uses, so the AI can
        // <product:TOKEN> tag anything a journal recommends with the exact same mechanism.
        $journals = [];
        $journalTokenMap = [];
        if ($scan['needs_journals'] && ! empty($scan['journal_search'])) {
            Log::info('[Chat] Step 2b — searching journals', ['search' => $scan['journal_search']]);
            $jresult = $this->searchJournals($scan['journal_search'], $products, $tokenMap, $clientProducts);
            $journals = $jresult['journals'];
            $journalTokenMap = $jresult['map'];
            $products = $jresult['products'];
            $tokenMap = $jresult['token_map'];
            $clientProducts = $jresult['client_products'] ?? $clientProducts;
            Log::info('[Chat] Journal search complete', ['journals_found' => count($journals)]);
        } else {
            Log::info('[Chat] Step 2b — skipped (no journal search needed)');
        }

        $system = $this->buildSystemPrompt(! empty($products), ! empty($journals));

        // Ground the model on exactly what's being asked and exactly what it may
        // recommend from — the last user turn's content becomes a single structured
        // JSON object instead of a bare string, so the model can't blend the actual
        // question or the actual catalog with anything else (prior turns, its own
        // outside "knowledge" of brands, etc.). This is the main lever against
        // hallucination: explicit, isolated fields beat prose glued into a system prompt.
        $groundedMessages = $messages;
        $lastIndex = count($groundedMessages) - 1;
        $groundedMessages[$lastIndex] = [
            'role'    => 'user',
            'content' => json_encode([
                'user'     => $groundedMessages[$lastIndex]['content'] ?? '',
                'system'   => 'Answer only what the "user" field asks. Use ONLY the products listed in "products" '
                    . '(if any) — never reference, describe, or imply any product, brand, or item that is not in '
                    . 'that array, even if you recognize it from general knowledge. If "products" is empty, do not '
                    . 'name or imply any specific product. Use ONLY the articles listed in "journals" (if any) when '
                    . 'recommending a Limitra Journal guide — never invent or imply the existence of an article that '
                    . 'is not in that array.',
                'products' => $products,
                'journals' => $journals,
            ], JSON_UNESCAPED_UNICODE),
        ];

        Log::info('[Chat] Step 3 — starting stream');

        return response()->stream(function () use ($provider, $system, $groundedMessages, $tokenMap, $journalTokenMap, $clientProducts, $user, $lastMsg) {
            while (ob_get_level() > 0) ob_end_flush();

            if (! empty($clientProducts)) {
                echo 'data: ' . json_encode(['products' => array_values($clientProducts)]) . "\n\n";
                flush();
            }

            // Buffers a possible partial "<product:...>" tag or "[label](journal:...)" link
            // across chunk boundaries, then substitutes the short token the AI used (e.g.
            // "p1"/"j1") for the real product ID / article URL before the chunk reaches the
            // browser — see substituteProductTokens() / substituteJournalTokens().
            $tagBuffer = '';
            $fullReply = '';
            $flushChunk = function (string $text) use (&$tagBuffer, &$fullReply, $tokenMap, $journalTokenMap) {
                $tagBuffer .= $text;

                // Hold back from the latest unclosed "<" or "[" — it might be an in-progress
                // <product:...> tag or [label](journal:...) link split across two stream
                // chunks. The length cap is a safety valve so a literal stray "<"/"[" in
                // prose (that never closes) doesn't get held back forever.
                $lastMarker = max(strrpos($tagBuffer, '<') ?: -1, strrpos($tagBuffer, '[') ?: -1);
                if ($lastMarker !== -1) {
                    $tail = substr($tagBuffer, $lastMarker);
                    $hasTerminator = str_contains($tail, '>') || str_contains($tail, ')');
                    if (!$hasTerminator && strlen($tail) <= 200) {
                        $safe      = substr($tagBuffer, 0, $lastMarker);
                        $tagBuffer = $tail;
                    } else {
                        $safe      = $tagBuffer;
                        $tagBuffer = '';
                    }
                } else {
                    $safe      = $tagBuffer;
                    $tagBuffer = '';
                }

                if ($safe !== '') {
                    $safe = $this->substituteProductTokens($safe, $tokenMap);
                    $safe = $this->substituteJournalTokens($safe, $journalTokenMap);
                    $fullReply .= $safe;
                    echo 'data: ' . json_encode(['text' => $safe]) . "\n\n";
                    flush();
                }
            };

            try {
                $provider->stream($system, $groundedMessages, $flushChunk);

                if ($tagBuffer !== '') {
                    $tail = $this->substituteProductTokens($tagBuffer, $tokenMap);
                    $tail = $this->substituteJournalTokens($tail, $journalTokenMap);
                    $fullReply .= $tail;
                    echo 'data: ' . json_encode(['text' => $tail]) . "\n\n";
                    flush();
                }

                Log::info('[Chat] Stream completed successfully');
                Log::info('[Chat] Reply sent', ['length' => mb_strlen($fullReply), 'text' => $fullReply]);

                if ($fullReply !== '') {
                    $suggestions = $this->generateFollowUps($provider, $lastMsg, $fullReply);
                    if (! empty($suggestions)) {
                        echo 'data: ' . json_encode(['suggestions' => $suggestions]) . "\n\n";
                        flush();
                    }
                }

                if ($user && $fullReply !== '') {
                    $user->chatMessages()->create(['role' => 'assistant', 'content' => $fullReply]);
                }
            } catch (\Throwable $e) {
                Log::error('[Chat] Stream failed', [
                    'error'          => $e->getMessage(),
                    'file'           => $e->getFile() . ':' . $e->getLine(),
                    'partial_reply'  => $fullReply,
                ]);
                echo 'data: ' . json_encode(['error' => 'Assistant unavailable. Please try again.']) . "\n\n";
                flush();
            }

            echo "data: [DONE]\n\n";
            flush();
        }, 200, [
            'Content-Type'      => 'text/event-stream',
            'Cache-Control'     => 'no-cache, no-store',
            'X-Accel-Buffering' => 'no',
            'Connection'        => 'keep-alive',
        ]);
    }

    /** Returns the authenticated user's full persisted chat thread, oldest first. */
    public function history(Request $request)
    {
        return response()->json([
            'messages' => $request->user()->chatMessages()
                ->get(['role', 'content'])
                ->map(fn ($m) => ['role' => $m->role, 'content' => $m->content]),
        ]);
    }

    /**
     * Deletes the authenticated user's entire persisted chat thread — "Clear chat" only ever
     * cleared local React state/localStorage, which did nothing for a logged-in user's
     * server-side history, so it silently came back on the next reload/merge.
     */
    public function clear(Request $request)
    {
        $request->user()->chatMessages()->delete();

        return response()->json(['cleared' => true]);
    }

    /**
     * One-shot guest→account chat seeding. Only seeds if the account has no prior
     * messages yet — a repeat login from any guest session must never duplicate history.
     */
    public function merge(Request $request)
    {
        $data = $request->validate([
            'messages'           => 'array',
            'messages.*.role'    => 'required_with:messages|in:user,assistant',
            'messages.*.content' => 'required_with:messages|string|max:10000',
        ]);

        $user = $request->user();

        if ($user->chatMessages()->exists()) {
            return response()->json([
                'merged'   => false,
                'messages' => $user->chatMessages()->get(['role', 'content']),
            ]);
        }

        foreach (($data['messages'] ?? []) as $m) {
            if (trim($m['content'] ?? '') === '') continue;
            $user->chatMessages()->create(['role' => $m['role'], 'content' => $m['content']]);
        }

        return response()->json(['merged' => true]);
    }

    /**
     * Site-wide "start chatting" suggestions shown when the chat widget is empty — the
     * same for every visitor (guest or logged in), refreshed hourly from what customers
     * have actually been asking about recently rather than a fixed hardcoded list.
     */
    public function starters()
    {
        return response()->json(['starters' => $this->trendingStarters()]);
    }

    /** Batch product lookup for chat widget historical items by IDs. */
    public function productsByIds(Request $request)
    {
        $ids = array_filter(explode(',', (string) $request->query('ids', '')));
        if (empty($ids)) {
            return response()->json(['products' => []]);
        }

        $products = Product::with(['category', 'subcategory'])
            ->whereIn('id', array_slice($ids, 0, 50))
            ->get()
            ->map(fn ($p) => [
                'id'          => (string) $p->id,
                'slug'        => $p->slug,
                'name'        => $p->name,
                'brand'       => $p->brand ?? 'Limitra Select',
                'category'    => $p->category?->name,
                'subcategory' => $p->subcategory?->name,
                'price'       => $p->price,
                'image'       => $p->image,
                'affiliate_url' => $p->affiliate_url,
            ]);

        return response()->json(['products' => $products]);
    }

    // ── Trending starters ─────────────────────────────────────────────────────

    /** Falls back to this when there isn't enough recent chat history to summarize yet. */
    private function defaultStarters(): array
    {
        return [
            "I'm looking for a gift under $100",
            "What's trending in beauty right now?",
            "Help me build a capsule wardrobe",
            "What should I pack for a beach trip?",
        ];
    }

    /**
     * Summarizes recent customer messages (across everyone — not per-user) into 4 fresh
     * starter prompts, cached for an hour so this never costs an AI call per page view.
     */
    private function trendingStarters(): array
    {
        return Cache::remember('chat.trending_starters', 3600, function () {
            $fallback = $this->defaultStarters();

            $recentMessages = ChatMessage::where('role', 'user')
                ->where('created_at', '>=', now()->subDays(3))
                ->orderByDesc('created_at')
                ->limit(150)
                ->pluck('content');

            // Not enough real signal yet to detect a trend from — keep the defaults
            // rather than asking the AI to invent themes from almost nothing.
            if ($recentMessages->count() < 10) {
                return $fallback;
            }

            try {
                $provider = AiProviderFactory::make();
                $system = <<<'EOF'
You generate 4 short "start chatting" suggestion prompts for a luxury fashion/lifestyle
shopping assistant's chat widget, written in first person as if a customer typed them.

You'll be given a sample of what customers have actually been asking the assistant recently.
Synthesize 4 SHORT (under 12 words each), varied, first-person prompts that reflect the
common or trending themes in that sample. Generalize into fresh natural phrasing — never
quote a real customer's message verbatim. Keep the tone consistent with a premium shopping
assistant.

Reply with RAW JSON only — no markdown, no code fences, no explanation. Use exactly this
shape: {"starters": ["...", "...", "...", "..."]}
EOF;

                $sample = $recentMessages->map(fn ($m) => '- ' . mb_substr($m, 0, 200))->implode("\n");
                $messages = [['role' => 'user', 'content' => "Recent customer messages:\n{$sample}"]];

                $raw = $provider->chat($system, $messages, 400, false, []);
                $cleaned = preg_replace('/^```(?:json)?\s*/i', '', trim($raw));
                $cleaned = preg_replace('/\s*```$/', '', $cleaned);
                $data = json_decode($cleaned, true);

                $starters = array_values(array_filter(array_map(
                    fn ($s) => trim((string) $s),
                    (array) ($data['starters'] ?? [])
                ), fn ($s) => $s !== ''));

                return count($starters) >= 2 ? array_slice($starters, 0, 4) : $fallback;
            } catch (\Throwable $e) {
                Log::error('[Chat] Trending starters generation failed', [
                    'error' => $e->getMessage(),
                    'file'  => $e->getFile() . ':' . $e->getLine(),
                ]);
                return $fallback;
            }
        });
    }

    /**
     * Suggests 0-2 short follow-up prompts after a reply — only when a genuine next step
     * exists; returns an empty array when the reply already resolves the request.
     */
    private function generateFollowUps(AiProvider $provider, string $userMsg, string $reply): array
    {
        try {
            $system = <<<'EOF'
You generate short follow-up prompt suggestions for a shopping-assistant chat widget, written
from the CUSTOMER's point of view (first person), as if the customer typed them next.

Given the customer's last message and the assistant's reply, suggest 0 to 2 natural next
messages the customer might send — only when a genuine next step exists (narrowing a
recommendation, comparing options, asking for styling advice, a related follow-up). Return an
empty array if the reply already fully resolves the request and no natural follow-up exists —
do not force one.

Each suggestion must be under 10 words, first-person, and a complete, sendable chat message —
not a question about the assistant, not meta-commentary.

Reply with RAW JSON only — no markdown, no code fences, no explanation. Use exactly this
shape: {"suggestions": ["...", "..."]}
EOF;

            $messages = [[
                'role'    => 'user',
                'content' => "Customer's message: \"{$userMsg}\"\n\nAssistant's reply: \"{$reply}\"",
            ]];

            $raw = $provider->chat($system, $messages, 200, false, []);
            $cleaned = preg_replace('/^```(?:json)?\s*/i', '', trim($raw));
            $cleaned = preg_replace('/\s*```$/', '', $cleaned);
            $data = json_decode($cleaned, true);

            $suggestions = array_values(array_filter(array_map(
                fn ($s) => trim((string) $s),
                (array) ($data['suggestions'] ?? [])
            ), fn ($s) => $s !== ''));

            return array_slice($suggestions, 0, 2);
        } catch (\Throwable $e) {
            Log::error('[Chat] Follow-up suggestion generation failed', [
                'error' => $e->getMessage(),
                'file'  => $e->getFile() . ':' . $e->getLine(),
            ]);
            return [];
        }
    }

    // ── Scanning phase ────────────────────────────────────────────────────────

    /**
     * Classifies intent/safety and, when no product or journal search is needed, composes
     * the entire customer-facing reply itself — letting the app skip the execution call
     * for that common case. Returns:
     *   needs_products: bool, search: array|null, needs_journals: bool, journal_search: array|null,
     *   safe: bool, direct_reply: string|null, failed: bool
     */
    private function scanIntent(AiProvider $provider, array $messages): array
    {
        $default = [
            'needs_products' => false, 'search' => null,
            'needs_journals' => false, 'journal_search' => null,
            'safe' => true, 'direct_reply' => null, 'failed' => false,
        ];

        try {
            $system = $this->resolvePlaceholders(require resource_path('prompts/elo-scanning-prompt.php'));
            // Passing [] (rather than null) just turns on Gemini's JSON response mode —
            // its contents aren't used as an actual schema yet, see GeminiProvider::chat().
            $raw    = $provider->chat($system, $messages, 700, false, []);
            Log::debug('[Chat] Scan raw response', ['raw' => $raw]);

            // Structured JSON mode should already return clean JSON — this fallback only
            // covers a provider/model that ignores the mode and wraps it in prose/fences.
            $cleaned = preg_replace('/^```(?:json)?\s*/i', '', trim($raw));
            $cleaned = preg_replace('/\s*```$/', '', $cleaned);

            $data = json_decode($cleaned, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                preg_match('/\{.*\}/s', $cleaned, $match);
                $data = isset($match[0]) ? json_decode($match[0], true) : null;
            }

            if (! is_array($data)) {
                Log::warning('[Chat] Scan — JSON parse failed', ['raw' => $raw]);
                return $default;
            }

            // Normalize price: model sometimes returns {min, max} instead of {op, value}
            if (isset($data['search']['price']) && is_array($data['search']['price'])) {
                $data['search']['price'] = $this->normalizePriceFilter($data['search']['price']);
            }

            $safe = (bool) ($data['safe'] ?? true);
            if (!$safe) {
                Log::warning('[Chat] Scan flagged message as unsafe', ['direct_reply' => $data['direct_reply'] ?? null]);
            }

            return [
                'needs_products' => (bool) ($data['needs_products'] ?? false),
                'search'         => $data['search'] ?? null,
                'needs_journals' => (bool) ($data['needs_journals'] ?? false),
                'journal_search' => $data['journal_search'] ?? null,
                'safe'           => $safe,
                'direct_reply'   => $data['direct_reply'] ?? null,
                'failed'         => false,
            ];
        } catch (\Throwable $e) {
            Log::error('[Chat] Scanning failed', [
                'error' => $e->getMessage(),
                'file'  => $e->getFile() . ':' . $e->getLine(),
            ]);
            return [
                'needs_products' => false, 'search' => null,
                'needs_journals' => false, 'journal_search' => null,
                'safe' => true, 'direct_reply' => null, 'failed' => true,
            ];
        }
    }

    /**
     * Normalize various price formats the AI may return into the canonical
     * {"op": "...", "value": ...} format that filterByPrice() expects.
     */
    private function normalizePriceFilter(array $price): array
    {
        // Already in canonical form
        if (isset($price['op'], $price['value'])) {
            return $price;
        }

        $min = $price['min'] ?? $price['gte'] ?? $price['gt'] ?? null;
        $max = $price['max'] ?? $price['lte'] ?? $price['lt'] ?? null;

        if ($min !== null && $max !== null) {
            return ['op' => 'between', 'value' => [(float) $min, (float) $max]];
        }
        if ($max !== null) {
            return ['op' => 'lte', 'value' => (float) $max];
        }
        if ($min !== null) {
            return ['op' => 'gte', 'value' => (float) $min];
        }

        // Unrecognised format — log and discard
        Log::warning('[Chat] Intent — unrecognised price format, ignoring', ['price' => $price]);
        return ['op' => null, 'value' => null];
    }

    // ── Search filters ────────────────────────────────────────────────────────

    /**
     * Normalizes a search field into a list of terms. Accepts a JSON array (preferred —
     * what the scanning prompt is instructed to send for related/synonym keywords), or
     * falls back to splitting a single string on "|"/"," in case the AI sends one anyway.
     */
    private function normalizeTerms(mixed $value): array
    {
        $parts = is_array($value) ? $value : preg_split('/[|,]/', (string) $value);

        return array_values(array_filter(array_map(
            fn ($t) => trim((string) $t),
            $parts
        ), fn ($t) => $t !== ''));
    }

    /** Flattens whichever of text/name/description terms were provided into one deduped list, for relevance scoring. */
    private function collectSearchTerms(array $search): array
    {
        return array_values(array_unique(array_merge(
            $this->normalizeTerms($search['text'] ?? null),
            $this->normalizeTerms($search['name'] ?? null),
            $this->normalizeTerms($search['description'] ?? null),
        )));
    }

    /**
     * Scores how well a product matches the request — used to rank the SQL candidate pool
     * so the AI is handed the best matches, not just whichever rows the query returned
     * first. A name match counts far more than a description mention; an exact/leading
     * match counts more than a mid-string one.
     */
    private function relevanceScore(Product $p, array $terms, array $brandTerms): float
    {
        $score = 0.0;
        $name  = mb_strtolower($p->name ?? '');
        $desc  = mb_strtolower($p->description ?? '');
        $brand = mb_strtolower($p->brand ?? '');

        foreach ($terms as $term) {
            $t = mb_strtolower(trim($term));
            if ($t === '') continue;

            if ($name === $t) {
                $score += 100;
            } elseif (str_starts_with($name, $t)) {
                $score += 60;
            } elseif (str_contains($name, $t)) {
                $score += 30;
            }

            if (str_contains($desc, $t)) {
                $score += 5;
            }
        }

        foreach ($brandTerms as $term) {
            $t = mb_strtolower(trim($term));
            if ($t !== '' && str_contains($brand, $t)) {
                $score += 40;
            }
        }

        // Tie-breaker only — never enough to outrank a genuine text/brand match above.
        if ($p->is_featured) $score += 1;

        return $score;
    }

    /** Searches name OR description for ANY of the given terms — the common case for product type lookups */
    private function filterByText(Builder $query, array $terms): void
    {
        $query->where(function ($q) use ($terms) {
            foreach ($terms as $term) {
                $q->orWhere(function ($qq) use ($term) {
                    $qq->where('name', 'like', "%{$term}%")
                       ->orWhere('description', 'like', "%{$term}%");
                });
            }
        });
    }

    /** Searches product name for ANY of the given terms, falling back to description so a name-only search doesn't miss matches */
    private function filterByName(Builder $query, array $terms): void
    {
        $query->where(function ($q) use ($terms) {
            foreach ($terms as $term) {
                $q->orWhere(function ($qq) use ($term) {
                    $qq->where('name', 'like', "%{$term}%")
                       ->orWhere('description', 'like', "%{$term}%");
                });
            }
        });
    }

    /** Searches product description for ANY of the given terms */
    private function filterByDescription(Builder $query, array $terms): void
    {
        $query->where(function ($q) use ($terms) {
            foreach ($terms as $term) {
                $q->orWhere('description', 'like', "%{$term}%");
            }
        });
    }

    /** Searches brand for ANY of the given terms — partial match so "armani" matches "Giorgio Armani" */
    private function filterByBrand(Builder $query, array $terms): void
    {
        $query->where(function ($q) use ($terms) {
            foreach ($terms as $term) {
                $q->orWhere('brand', 'like', "%{$term}%");
            }
        });
    }

    /**
     * Filters by price using the specified operator.
     * Supported ops: lt, lte, gt, gte, eq, between
     * For "between", $value must be [min, max].
     */
    private function filterByPrice(Builder $query, string $op, mixed $value): void
    {
        match ($op) {
            'lt'      => $query->whereRaw('price < ?',             [(float) $value]),
            'lte'     => $query->whereRaw('price <= ?',            [(float) $value]),
            'gt'      => $query->whereRaw('price > ?',             [(float) $value]),
            'gte'     => $query->whereRaw('price >= ?',            [(float) $value]),
            'eq'      => $query->whereRaw('price = ?',             [(float) $value]),
            'between' => $query->whereRaw('price BETWEEN ? AND ?', [(float) ($value[0] ?? 0), (float) ($value[1] ?? 0)]),
            default   => null,
        };
    }

    // ── Product search orchestrator ───────────────────────────────────────────

    /** @return array{products: array, map: array<string,string>} */
    private function searchProducts(array $search): array
    {
        $query = Product::with(['category', 'subcategory']);

        // Text searches name OR description; if text is set, individual name/description are skipped
        $textTerms = $this->normalizeTerms($search['text'] ?? null);
        if (!empty($textTerms)) {
            Log::debug('[Chat] Filter: text', ['terms' => $textTerms]);
            $this->filterByText($query, $textTerms);
        } else {
            $nameTerms = $this->normalizeTerms($search['name'] ?? null);
            if (!empty($nameTerms)) {
                Log::debug('[Chat] Filter: name', ['terms' => $nameTerms]);
                $this->filterByName($query, $nameTerms);
            }
            $descriptionTerms = $this->normalizeTerms($search['description'] ?? null);
            if (!empty($descriptionTerms)) {
                Log::debug('[Chat] Filter: description', ['terms' => $descriptionTerms]);
                $this->filterByDescription($query, $descriptionTerms);
            }
        }

        $brandTerms = $this->normalizeTerms($search['brand'] ?? null);
        if (!empty($brandTerms)) {
            Log::debug('[Chat] Filter: brand', ['terms' => $brandTerms]);
            $this->filterByBrand($query, $brandTerms);
        }

        if (! empty($search['price']['op'])) {
            Log::debug('[Chat] Filter: price', ['op' => $search['price']['op'], 'value' => $search['price']['value'] ?? 0]);
            $this->filterByPrice($query, $search['price']['op'], $search['price']['value'] ?? 0);
        }

        try {
            // Broader-than-final candidate pool — the WHERE clause above already narrows
            // to plausible matches, but doesn't rank them by relevance. Fetching more than
            // the final 15 gives the scoring below real matches to choose from instead of
            // just whatever the database's default (arbitrary) row order happens to return.
            $candidates = $query->limit(200)->get();
        } catch (\Throwable $e) {
            Log::error('[Chat] Product query failed', [
                'error' => $e->getMessage(),
                'sql'   => $query->toSql(),
                'file'  => $e->getFile() . ':' . $e->getLine(),
            ]);
            return ['products' => [], 'map' => []];
        }

        if ($candidates->isEmpty()) return ['products' => [], 'map' => []];

        // Rank candidates by how closely they actually match the request, then keep only
        // the best 15 — not just the first 15 the query happened to return.
        $terms      = $this->collectSearchTerms($search);
        $brandTerms = $this->normalizeTerms($search['brand'] ?? null);

        $products = $candidates
            ->sortByDesc(fn ($p) => $this->relevanceScore($p, $terms, $brandTerms))
            ->take(15)
            ->values();

        Log::info('[Chat] Query returned ' . $candidates->count() . ' candidate(s), kept top ' . $products->count(), [
            'ids' => $products->pluck('id')->all(),
        ]);

        // Give the AI a short token instead of the real UUID — LLMs reliably reproduce
        // "p1" inline but frequently mistype long random UUIDs, breaking the <product:ID>
        // tag. The real ID is substituted back in server-side before the reply is sent
        // (see substituteProductTokens()); the frontend never needs to see the token.
        //
        // Returned as a structured array (not a formatted text blob) so it can be embedded
        // as-is in the {user, system, products} JSON sent to the model — a clean, unambiguous
        // data boundary the model can be strictly instructed to stay within, rather than prose
        // it might paraphrase or blend with outside knowledge.
        $map = [];
        $clientProducts = [];
        $structured = $products->map(function ($p, $i) use (&$map, &$clientProducts) {
            $token = 'p' . ($i + 1);
            $pid = (string) $p->id;
            $map[$token] = $pid;

            $clientProducts[$pid] = [
                'id'          => $pid,
                'slug'        => $p->slug,
                'name'        => $p->name,
                'brand'       => $p->brand ?? 'Limitra Select',
                'category'    => $p->category?->name,
                'subcategory' => $p->subcategory?->name,
                'price'       => $p->price,
                'image'       => $p->image,
                'affiliate_url' => $p->affiliate_url,
            ];

            return [
                'id'          => $token,
                'name'        => $p->name,
                'brand'       => $p->brand ?? 'Limitra Select',
                'category'    => implode(' › ', array_filter([$p->category?->name, $p->subcategory?->name])),
                'price'       => $p->price,
                'description' => $p->description,
            ];
        })->values()->toArray();

        return ['products' => $structured, 'map' => $map, 'client_products' => $clientProducts];
    }

    /** Replaces AI-typed <product:TOKEN> short tokens with the real product ID. */
    private function substituteProductTokens(string $text, array $tokenMap): string
    {
        if (empty($tokenMap)) return $text;

        return preg_replace_callback('/<product:([a-z0-9_-]+)>/i', function ($m) use ($tokenMap) {
            return isset($tokenMap[$m[1]]) ? '<product:' . $tokenMap[$m[1]] . '>' : $m[0];
        }, $text);
    }

    // ── Journal (article) search orchestrator ─────────────────────────────────

    /**
     * Same shape as searchProducts(): scores candidates by relevance and returns a short
     * per-token map so the AI can reliably reproduce "j1" instead of a real slug inline.
     *
     * Each matched journal also carries its actual body content (extractArticleContent())
     * and the products referenced inside it, resolved and merged into the SAME product
     * pool/token map the general catalog search uses ($products/$tokenMap in, in that
     * order) — so a product a journal recommends can be <product:TOKEN> tagged exactly
     * like any other, and never gets a second, colliding token if it's already in the pool.
     *
     * @return array{journals: array, map: array<string,string>, products: array, token_map: array<string,string>, client_products: array}
     */
    private function searchJournals(array $search, array $products = [], array $tokenMap = [], array $clientProducts = []): array
    {
        $query = Article::query();

        $terms = $this->normalizeTerms($search['text'] ?? null);
        if (! empty($terms)) {
            $query->where(function ($q) use ($terms) {
                foreach ($terms as $term) {
                    $q->orWhere('title', 'like', "%{$term}%")
                        ->orWhere('excerpt', 'like', "%{$term}%");
                }
            });
        }

        $tagTerms = $this->normalizeTerms($search['tag'] ?? null);
        if (! empty($tagTerms)) {
            $query->where(function ($q) use ($tagTerms) {
                foreach ($tagTerms as $term) {
                    $q->orWhere('tag', 'like', "%{$term}%");
                }
            });
        }

        try {
            $candidates = $query->limit(100)->get();
        } catch (\Throwable $e) {
            Log::error('[Chat] Journal query failed', [
                'error' => $e->getMessage(),
                'sql'   => $query->toSql(),
                'file'  => $e->getFile() . ':' . $e->getLine(),
            ]);
            return ['journals' => [], 'map' => [], 'products' => $products, 'token_map' => $tokenMap, 'client_products' => $clientProducts];
        }

        if ($candidates->isEmpty()) {
            return ['journals' => [], 'map' => [], 'products' => $products, 'token_map' => $tokenMap, 'client_products' => $clientProducts];
        }

        $journals = $candidates
            ->sortByDesc(function ($a) use ($terms) {
                $score = 0.0;
                $title = mb_strtolower($a->title ?? '');
                $excerpt = mb_strtolower($a->excerpt ?? '');

                foreach ($terms as $term) {
                    $t = mb_strtolower(trim($term));
                    if ($t === '') continue;

                    if ($title === $t) $score += 100;
                    elseif (str_starts_with($title, $t)) $score += 60;
                    elseif (str_contains($title, $t)) $score += 30;

                    if (str_contains($excerpt, $t)) $score += 5;
                }

                if ($a->featured) $score += 1;

                return $score;
            })
            ->take(5)
            ->values();

        Log::info('[Chat] Journal query returned ' . $candidates->count() . ' candidate(s), kept top ' . $journals->count(), [
            'slugs' => $journals->pluck('slug')->all(),
        ]);

        // Token maps to the real slug (not an ID) — substituteJournalTokens() turns the
        // AI's "journal:j1" into the actual "/article/{slug}" URL server-side, so the
        // frontend just needs to render a normal markdown-style link, no lookup required.
        //
        // realIdToToken lets a product already found by the general catalog search (or an
        // earlier journal in this same loop) keep its existing token instead of being
        // added a second time under a new one.
        $realIdToToken = array_flip($tokenMap);
        $nextTokenNum  = count($tokenMap);

        $map = [];
        $structured = $journals->map(function ($a, $i) use (&$map, &$products, &$tokenMap, &$realIdToToken, &$nextTokenNum, &$clientProducts) {
            $token = 'j' . ($i + 1);
            $map[$token] = $a->slug;

            [$content, $productIds] = $this->extractArticleContent($a);

            // Cap how many of a single journal's products get pulled in — an article can
            // reference far more items than are useful to ground one reply on.
            $productIds = array_slice($productIds, 0, 6);
            $productTokens = [];

            if (! empty($productIds)) {
                foreach (Product::whereIn('id', $productIds)->get() as $p) {
                    $pid = (string) $p->id;

                    $clientProducts[$pid] = [
                        'id'          => $pid,
                        'slug'        => $p->slug,
                        'name'        => $p->name,
                        'brand'       => $p->brand ?? 'Limitra Select',
                        'category'    => $p->category?->name,
                        'subcategory' => $p->subcategory?->name,
                        'price'       => $p->price,
                        'image'       => $p->image,
                        'affiliate_url' => $p->affiliate_url,
                    ];

                    if (isset($realIdToToken[$pid])) {
                        $productTokens[] = $realIdToToken[$pid];
                        continue;
                    }

                    $pToken = 'p' . (++$nextTokenNum);
                    $tokenMap[$pToken] = $pid;
                    $realIdToToken[$pid] = $pToken;
                    $products[] = [
                        'id'          => $pToken,
                        'name'        => $p->name,
                        'brand'       => $p->brand ?? 'Limitra Select',
                        'category'    => implode(' › ', array_filter([$p->category?->name, $p->subcategory?->name])),
                        'price'       => $p->price,
                        'description' => $p->description,
                    ];
                    $productTokens[] = $pToken;
                }
            }

            return [
                'id'       => $token,
                'title'    => $a->title,
                'tag'      => $a->tag,
                'excerpt'  => $a->excerpt,
                'content'  => $content,
                'products' => $productTokens,
            ];
        })->values()->toArray();

        return ['journals' => $structured, 'map' => $map, 'products' => $products, 'token_map' => $tokenMap, 'client_products' => $clientProducts];
    }

    /**
     * Flattens an article's block-based body into plain-text content (for grounding the
     * AI on what the article actually says, not just its excerpt) and collects the product
     * IDs referenced across any "products" blocks.
     *
     * @return array{0: string, 1: array<int,string>}
     */
    private function extractArticleContent(Article $article): array
    {
        $text = [];
        $productIds = [];

        foreach ((array) ($article->body ?? []) as $block) {
            match ($block['type'] ?? null) {
                'lead', 'text', 'heading', 'pullquote' => $text[] = trim((string) ($block['text'] ?? '')),
                'products' => $productIds = array_merge($productIds, array_filter((array) ($block['ids'] ?? []))),
                default => null,
            };
        }

        $content = implode("\n\n", array_filter($text));
        if (mb_strlen($content) > 2000) {
            $content = mb_substr($content, 0, 2000) . '…';
        }

        return [$content, array_values(array_unique($productIds))];
    }

    /** Replaces AI-written "(journal:TOKEN)" markdown-link targets with the real article URL. */
    private function substituteJournalTokens(string $text, array $tokenMap): string
    {
        if (empty($tokenMap)) return $text;

        return preg_replace_callback('/\(journal:([a-z0-9_-]+)\)/i', function ($m) use ($tokenMap) {
            return isset($tokenMap[$m[1]]) ? '(/article/' . $tokenMap[$m[1]] . ')' : $m[0];
        }, $text);
    }

    /** Resolves the {{...}} placeholders shared by the scanning and execution prompts. */
    private function resolvePlaceholders(string $text): string
    {
        $settings = SiteSetting::allAsMap();

        $replacements = [
            '{{approved_support_contact}}'     => $settings['chat_support_contact']       ?? 'our support team via the Contact page',
            '{{approved_incident_contact}}'    => $settings['chat_incident_contact']      ?? 'our support team via the Contact page',
            '{{approved_partnership_contact}}' => $settings['chat_partnership_contact']   ?? 'our partnerships team via the Contact page',
            '{{limitra_product_page_url}}'     => $settings['chat_product_page_base_url'] ?? url('/product'),
        ];

        return strtr($text, $replacements);
    }

    // ── System prompt ─────────────────────────────────────────────────────────

    private function buildSystemPrompt(bool $hasProducts, bool $hasJournals = false): string
    {
        $formatSection = <<<SECTION
MESSAGE FORMAT

The customer's current message does not arrive as plain text. It arrives as the next user turn,
formatted as a single JSON object with exactly these fields:
  {"user": "<the customer's literal message, verbatim>", "system": "<a short reinforcement of the grounding rules below>", "products": [ ... ], "journals": [ ... ]}

Read "user" as the only thing the customer actually said this turn — answer that, specifically,
not a generalization of it. Prior turns in the conversation are still plain text and are
context only.
SECTION;

        if ($hasProducts) {
            $productSection = <<<SECTION
"products" is a non-empty array of objects, each shaped:
  {"id": "p1", "name": "...", "brand": "...", "category": "...", "price": "...", "description": "..."}

These were already searched and matched for this customer's request — this is not a case of
missing information. You MUST recommend at least one of them by name, with its tag, in this
reply. Do not withhold a recommendation to ask a clarifying question instead; ask a brief
refining question afterward only if it genuinely helps, but never in place of recommending
from this list.

STRICT GROUNDING RULES:
- Only reference products that appear in "products". Never name, describe, or imply the
  existence of any other product, brand, or item — including ones you recognize from general
  knowledge — that is not in that array. If it is not in "products", it does not exist for
  this reply.
- Only use the fields given for each product (name, brand, category, price, description).
  Never invent additional attributes, specifications, materials, reviews, ratings, or
  availability beyond what is provided.

When you mention a product, embed its tag immediately after naming it so a clickable card appears in the chat:
  <product:TOKEN>
Use the exact token from the "id" field (e.g. "p1") — do not invent or modify it. Example:
  "I'd start with the Limitra Linen Blazer <product:p1> — it anchors any look effortlessly."
Always embed 2–4 product tags per reply. Never skip the tag when recommending a product.
SECTION;
        } else {
            $productSection = '"products" is an empty array — no specific products matched this query. Give helpful '
                . 'general shopping advice and ask a clarifying question to better understand what the customer '
                . 'needs. Do not name, describe, or imply any specific product, brand, or item — there is nothing '
                . 'to recommend from yet. Do not embed any product tags.';
        }

        if ($hasJournals) {
            $journalSection = <<<SECTION
"journals" is a non-empty array of Limitra Journal articles, each shaped:
  {"id": "j1", "title": "...", "tag": "...", "excerpt": "...", "content": "...", "products": ["p1", "p2"]}

These were already searched and matched for this customer's request. "content" is the
article's actual body text (not just the excerpt) — read it to accurately describe what the
article covers, rather than guessing from the title alone. "products" lists the tokens of
products that article specifically recommends (these are already included in "products"
above too, using the exact same tokens). When one of these articles genuinely helps answer
the question (a styling/editorial guide, a "how to" topic, seasonal or trend content),
recommend it naturally in your reply.

STRICT GROUNDING RULES:
- Only reference articles that appear in "journals". Never name, describe, or imply the
  existence of any other article that is not in that array.
- Only use the fields given for each article (title, tag, excerpt, content). Never invent
  additional claims about an article's content beyond what "content" and "excerpt" say.

When you mention an article, write its title as a markdown link with the exact token from its
"id" field (e.g. "j1") as the link target, in this exact form:
  [Article title](journal:TOKEN)
Example:
  "Our guide on [Building a Capsule Wardrobe](journal:j1) walks through exactly that."
Do not invent or modify the token. This is separate from product tags — an article
recommendation is never wrapped in a <product:...> tag. If an article's "products" list gives
you specific items it recommends, you may also mention those using their own <product:TOKEN>
tag, exactly as you would for any other product in "products".
SECTION;
        } else {
            $journalSection = '"journals" is an empty array — no Limitra Journal article matched this query. Do not '
                . 'name, describe, or imply the existence of any article, and do not write a "[title](journal:...)" '
                . 'link.';
        }

        static $base = null;
        $base ??= require resource_path('prompts/elo-system-prompt.php');

        return $this->resolvePlaceholders($base) . "\n\n" . $formatSection . "\n\n" . $productSection . "\n\n" . $journalSection;
    }
}
