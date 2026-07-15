<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\SiteSetting;
use App\Services\AiProvider;
use App\Services\AiProviderFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ChatController extends Controller
{
    public function message(Request $request)
    {
        set_time_limit(120);

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

        $useDirectReply = !$scan['needs_products'] && !$scan['failed'] && filled($scan['direct_reply']);

        if ($useDirectReply) {
            Log::info('[Chat] Step 2 — skipped (scanning phase answered directly)');

            return response()->stream(function () use ($scan) {
                while (ob_get_level() > 0) ob_end_flush();
                echo 'data: ' . json_encode(['text' => $scan['direct_reply']]) . "\n\n";
                flush();
                echo "data: [DONE]\n\n";
                flush();
            }, 200, [
                'Content-Type'      => 'text/event-stream',
                'Cache-Control'     => 'no-cache, no-store',
                'X-Accel-Buffering' => 'no',
                'Connection'        => 'keep-alive',
            ]);
        }

        // Step 2: Product search (also runs — with an empty catalog — if scanning failed
        // entirely or found no search terms, degrading to the existing no-match fallback)
        $catalog  = '';
        $tokenMap = [];
        if ($scan['needs_products'] && ! empty($scan['search'])) {
            Log::info('[Chat] Step 2 — searching products', ['search' => $scan['search']]);
            $result       = $this->searchProducts($scan['search']);
            $catalog      = $result['catalog'];
            $tokenMap     = $result['map'];
            $productCount = count($tokenMap);
            Log::info('[Chat] Product search complete', ['products_found' => $productCount]);
        } else {
            Log::info('[Chat] Step 2 — skipped (no product search needed)');
        }

        $system = $this->buildSystemPrompt($catalog);

        Log::info('[Chat] Step 3 — starting stream');

        return response()->stream(function () use ($provider, $system, $messages, $tokenMap) {
            while (ob_get_level() > 0) ob_end_flush();

            // Buffers a possible partial "<product:..." tag across chunk boundaries, then
            // substitutes the short token the AI used (e.g. "p1") for the real product ID
            // before the chunk reaches the browser — see substituteProductTokens().
            $tagBuffer = '';
            $flushChunk = function (string $text) use (&$tagBuffer, $tokenMap) {
                $tagBuffer .= $text;

                $lastLt = strrpos($tagBuffer, '<');
                if ($lastLt !== false) {
                    $tail = substr($tagBuffer, $lastLt);
                    if (strpos($tail, '>') === false && preg_match('/^<[a-z0-9_:-]*$/i', $tail) && strlen($tail) <= 40) {
                        $safe      = substr($tagBuffer, 0, $lastLt);
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
                    echo 'data: ' . json_encode(['text' => $this->substituteProductTokens($safe, $tokenMap)]) . "\n\n";
                    flush();
                }
            };

            try {
                $provider->stream($system, $messages, $flushChunk);

                if ($tagBuffer !== '') {
                    echo 'data: ' . json_encode(['text' => $this->substituteProductTokens($tagBuffer, $tokenMap)]) . "\n\n";
                    flush();
                }

                Log::info('[Chat] Stream completed successfully');
            } catch (\Throwable $e) {
                Log::error('[Chat] Stream failed', [
                    'error' => $e->getMessage(),
                    'file'  => $e->getFile() . ':' . $e->getLine(),
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

    // ── Scanning phase ────────────────────────────────────────────────────────

    /**
     * Classifies intent/safety and, when no product search is needed, composes the
     * entire customer-facing reply itself — letting the app skip the execution call
     * for that common case. Returns:
     *   needs_products: bool, search: array|null, safe: bool, direct_reply: string|null, failed: bool
     */
    private function scanIntent(AiProvider $provider, array $messages): array
    {
        $default = ['needs_products' => false, 'search' => null, 'safe' => true, 'direct_reply' => null, 'failed' => false];

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
                'safe'           => $safe,
                'direct_reply'   => $data['direct_reply'] ?? null,
                'failed'         => false,
            ];
        } catch (\Throwable $e) {
            Log::error('[Chat] Scanning failed', [
                'error' => $e->getMessage(),
                'file'  => $e->getFile() . ':' . $e->getLine(),
            ]);
            return ['needs_products' => false, 'search' => null, 'safe' => true, 'direct_reply' => null, 'failed' => true];
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

    /** @return array{catalog: string, map: array<string,string>} */
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
            $products = $query->limit(15)->get();
        } catch (\Throwable $e) {
            Log::error('[Chat] Product query failed', [
                'error' => $e->getMessage(),
                'sql'   => $query->toSql(),
                'file'  => $e->getFile() . ':' . $e->getLine(),
            ]);
            return ['catalog' => '', 'map' => []];
        }

        Log::info('[Chat] Query returned ' . $products->count() . ' product(s)', [
            'ids' => $products->pluck('id')->all(),
        ]);

        if ($products->isEmpty()) return ['catalog' => '', 'map' => []];

        // Give the AI a short token instead of the real UUID — LLMs reliably reproduce
        // "p1" inline but frequently mistype long random UUIDs, breaking the <product:ID>
        // tag. The real ID is substituted back in server-side before the reply is sent
        // (see substituteProductTokens()); the frontend never needs to see the token.
        $map = [];
        $catalog = $products->map(function ($p, $i) use (&$map) {
            $token = 'p' . ($i + 1);
            $map[$token] = (string) $p->id;

            $parts = [
                'ID: '       . $token,
                'Name: '     . $p->name,
                'Brand: '    . ($p->brand ?? 'Limitra Select'),
                'Category: ' . implode(' › ', array_filter([$p->category?->name, $p->subcategory?->name])),
                'Price: '    . $p->price,
            ];
            if ($p->description) $parts[] = 'Description: ' . $p->description;
            return implode(' | ', $parts);
        })->implode("\n");

        return ['catalog' => $catalog, 'map' => $map];
    }

    /** Replaces AI-typed <product:TOKEN> short tokens with the real product ID. */
    private function substituteProductTokens(string $text, array $tokenMap): string
    {
        if (empty($tokenMap)) return $text;

        return preg_replace_callback('/<product:([a-z0-9_-]+)>/i', function ($m) use ($tokenMap) {
            return isset($tokenMap[$m[1]]) ? '<product:' . $tokenMap[$m[1]] . '>' : $m[0];
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

    private function buildSystemPrompt(string $catalog): string
    {
        if ($catalog) {
            $productSection = <<<SECTION
RELEVANT PRODUCTS:
{$catalog}

SHOWING PRODUCTS TO THE CUSTOMER:
These products were already searched and matched for this customer's request — this is not a
case of missing information. You MUST recommend at least one of them by name, with its tag,
in this reply. Do not withhold a recommendation to ask a clarifying question instead; ask a
brief refining question afterward only if it genuinely helps, but never in place of
recommending from this list.
When you mention a product, embed its tag immediately after naming it so a clickable card appears in the chat:
  <product:TOKEN>
Use the exact token from the "ID:" field (e.g. "p1") — do not invent or modify it. Example:
  "I'd start with the Limitra Linen Blazer <product:p1> — it anchors any look effortlessly."
Always embed 2–4 product tags per reply. Never skip the tag when recommending a product.
SECTION;
        } else {
            $productSection = 'No specific products matched this query. Give helpful general shopping advice and ask a clarifying question to better understand what the customer needs. Do not embed any product tags.';
        }

        static $base = null;
        $base ??= require resource_path('prompts/elo-system-prompt.php');

        return $this->resolvePlaceholders($base) . "\n\n" . $productSection;
    }
}
