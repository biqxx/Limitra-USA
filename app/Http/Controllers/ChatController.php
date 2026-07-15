<?php

namespace App\Http\Controllers;

use App\Models\Product;
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
            'messages'           => 'required|array|min:1|max:20',
            'messages.*.role'    => 'required|in:user,assistant',
            'messages.*.content' => 'present|string|max:10000',
        ]);

        $messages = collect($request->input('messages'))
            ->filter(fn ($m) => filled($m['content'] ?? ''))
            ->values()
            ->toArray();

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

        // Step 1: Intent detection
        Log::info('[Chat] Step 1 — detecting intent');
        $intent = $this->detectIntent($provider, $messages);
        Log::info('[Chat] Intent result', [
            'needs_products' => $intent['needs_products'],
            'search'         => $intent['search'],
        ]);

        // Step 2: Product search
        $catalog = '';
        if ($intent['needs_products'] && ! empty($intent['search'])) {
            Log::info('[Chat] Step 2 — searching products', ['search' => $intent['search']]);
            $catalog = $this->searchProducts($intent['search']);
            $productCount = $catalog ? substr_count($catalog, "\n") + 1 : 0;
            Log::info('[Chat] Product search complete', ['products_found' => $productCount]);
        } else {
            Log::info('[Chat] Step 2 — skipped (no product search needed)');
        }

        $system = $this->buildSystemPrompt($catalog);

        Log::info('[Chat] Step 3 — starting stream');

        return response()->stream(function () use ($provider, $system, $messages) {
            while (ob_get_level() > 0) ob_end_flush();

            try {
                $provider->stream(
                    $system,
                    $messages,
                    function (string $chunk) {
                        echo 'data: ' . json_encode(['text' => $chunk]) . "\n\n";
                        flush();
                    }
                );
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

    // ── Intent detection ──────────────────────────────────────────────────────

    private function detectIntent(AiProvider $provider, array $messages): array
    {
        $system = <<<SYS
You are a JSON-only classifier for a shopping assistant. Analyze the conversation and decide if products need to be looked up.

CRITICAL: Reply with RAW JSON only — no markdown, no code fences (```), no explanation, no extra text whatsoever.

If yes, build a "search" object using any combination of these fields (set unused fields to null):

- "text"        : searches both name AND description (OR) — use for general product type searches e.g. "handbag"
- "name"        : searches product name only — use when text is null and you want name-specific search
- "description" : searches product description only — use when text is null and you want description-specific search
- "brand"       : partial match on brand name e.g. "armani", "nike"
- "price"       : MUST use EXACTLY this format: {"op": "lt|lte|gt|gte|eq|between", "value": NUMBER}
                  "under $100" → {"op": "lte", "value": 100}
                  "less than $50" → {"op": "lt", "value": 50}
                  "over $200" → {"op": "gt", "value": 200}
                  "between $50 and $200" → {"op": "between", "value": [50, 200]}
                  DO NOT use keys like "max", "min", "under", "above" — only "op" and "value" are valid.

All non-null filters are combined with AND.
Common examples:
  General search → {"text": "beach bag", "brand": null, "name": null, "description": null, "price": null}
  Brand + type  → {"text": "handbag", "brand": "gucci", "name": null, "description": null, "price": null}
  Budget range  → {"text": "swimwear", "brand": null, "name": null, "description": null, "price": {"op": "lte", "value": 150}}
  Gift under $100 → {"text": "gift", "brand": null, "name": null, "description": null, "price": {"op": "lte", "value": 100}}
  Name only     → {"text": null, "brand": null, "name": "linen blazer", "description": null, "price": null}
  Brand budget  → {"text": null, "brand": "armani", "name": null, "description": "hand bag", "price": {"op": "lt", "value": 200}}

Reply ONLY with raw valid JSON (no code fences):
{"needs_products": true, "search": {"text": "...", "name": null, "description": null, "brand": null, "price": null}}
or:
{"needs_products": false, "search": null}
SYS;

        try {
            $raw = $provider->chat($system, $messages, 200, false);
            Log::debug('[Chat] Intent raw response', ['raw' => $raw]);

            // Strip markdown code fences the model may wrap around the JSON
            $cleaned = preg_replace('/^```(?:json)?\s*/i', '', trim($raw));
            $cleaned = preg_replace('/\s*```$/', '', $cleaned);

            preg_match('/\{.*\}/s', $cleaned, $match);
            $json = $match[0] ?? null;

            if (! $json) {
                Log::warning('[Chat] Intent — no JSON found in response', ['raw' => $raw]);
                return ['needs_products' => false, 'search' => null];
            }

            $data = json_decode($json, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::warning('[Chat] Intent — JSON parse failed', ['json' => $json, 'error' => json_last_error_msg()]);
                return ['needs_products' => false, 'search' => null];
            }

            // Normalize price: model sometimes returns {min, max} instead of {op, value}
            if (isset($data['search']['price']) && is_array($data['search']['price'])) {
                $data['search']['price'] = $this->normalizePriceFilter($data['search']['price']);
            }

            return [
                'needs_products' => (bool) ($data['needs_products'] ?? false),
                'search'         => $data['search'] ?? null,
            ];
        } catch (\Throwable $e) {
            Log::error('[Chat] Intent detection failed', [
                'error' => $e->getMessage(),
                'file'  => $e->getFile() . ':' . $e->getLine(),
            ]);
            return ['needs_products' => false, 'search' => null];
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

    /** Searches name OR description — the common case for product type lookups */
    private function filterByText(Builder $query, string $term): void
    {
        $query->where(function ($q) use ($term) {
            $q->where('name', 'like', "%{$term}%")
              ->orWhere('description', 'like', "%{$term}%");
        });
    }

    /** Searches product name only */
    private function filterByName(Builder $query, string $term): void
    {
        $query->where('name', 'like', "%{$term}%");
    }

    /** Searches product description only */
    private function filterByDescription(Builder $query, string $term): void
    {
        $query->where('description', 'like', "%{$term}%");
    }

    /** Searches brand — partial match so "armani" matches "Giorgio Armani" */
    private function filterByBrand(Builder $query, string $term): void
    {
        $query->where('brand', 'like', "%{$term}%");
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

    private function searchProducts(array $search): string
    {
        $query = Product::with(['category', 'subcategory']);

        // Text searches name OR description; if text is set, individual name/description are skipped
        if (filled($search['text'] ?? null)) {
            Log::debug('[Chat] Filter: text', ['term' => $search['text']]);
            $this->filterByText($query, $search['text']);
        } else {
            if (filled($search['name'] ?? null)) {
                Log::debug('[Chat] Filter: name', ['term' => $search['name']]);
                $this->filterByName($query, $search['name']);
            }
            if (filled($search['description'] ?? null)) {
                Log::debug('[Chat] Filter: description', ['term' => $search['description']]);
                $this->filterByDescription($query, $search['description']);
            }
        }

        if (filled($search['brand'] ?? null)) {
            Log::debug('[Chat] Filter: brand', ['term' => $search['brand']]);
            $this->filterByBrand($query, $search['brand']);
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
            return '';
        }

        Log::info('[Chat] Query returned ' . $products->count() . ' product(s)', [
            'ids' => $products->pluck('id')->all(),
        ]);

        if ($products->isEmpty()) return '';

        return $products->map(function ($p) {
            $parts = [
                'ID: '       . $p->id,
                'Name: '     . $p->name,
                'Brand: '    . ($p->brand ?? 'Limitra Select'),
                'Category: ' . implode(' › ', array_filter([$p->category?->name, $p->subcategory?->name])),
                'Price: '    . $p->price,
            ];
            if ($p->description) $parts[] = 'Description: ' . $p->description;
            return implode(' | ', $parts);
        })->implode("\n");
    }

    // ── System prompt ─────────────────────────────────────────────────────────

    private function buildSystemPrompt(string $catalog): string
    {
        if ($catalog) {
            $productSection = <<<SECTION
RELEVANT PRODUCTS:
{$catalog}

SHOWING PRODUCTS TO THE CUSTOMER:
When you mention a product, embed its tag immediately after naming it so a clickable card appears in the chat:
  <product:PRODUCT_ID>
Use the exact ID from the "ID:" field. Example:
  "I'd start with the Limitra Linen Blazer <product:limitra-linen-blazer> — it anchors any look effortlessly."
Always embed 2–4 product tags per reply. Never skip the tag when recommending a product.
SECTION;
        } else {
            $productSection = 'No specific products matched this query. Give helpful general shopping advice and ask a clarifying question to better understand what the customer needs. Do not embed any product tags.';
        }

        return <<<PROMPT
You are Elo — a warm, knowledgeable personal shopping guide for Limitra USA, a curated product discovery platform covering fashion, beauty, home, lifestyle, and travel.

{$productSection}

RULES:
- Keep replies short: 2–4 sentences. No long paragraphs.
- End each reply with one brief follow-up question to refine the recommendation.
- Never mention prices — users discover them when they click through.
- Tone: warm, editorial, like a trusted style friend.
- If the user asks something unrelated to shopping, gently steer back.
PROMPT;
    }
}
