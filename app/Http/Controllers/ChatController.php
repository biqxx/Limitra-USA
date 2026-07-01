<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Services\AiProviderFactory;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function message(Request $request)
    {
        $request->validate([
            'messages'           => 'required|array|min:1|max:20',
            'messages.*.role'    => 'required|in:user,assistant',
            'messages.*.content' => 'required|string|max:10000',
        ]);

        $system   = $this->buildSystemPrompt($this->buildCatalog());
        $messages = $request->input('messages');

        return response()->stream(function () use ($system, $messages) {
            // Flush any output buffers so chunks reach the browser immediately
            while (ob_get_level() > 0) ob_end_flush();

            try {
                AiProviderFactory::make()->stream(
                    $system,
                    $messages,
                    function (string $chunk) {
                        echo 'data: ' . json_encode(['text' => $chunk]) . "\n\n";
                        flush();
                    }
                );
            } catch (\Throwable $e) {
                echo 'data: ' . json_encode(['error' => 'Assistant unavailable. Please try again.']) . "\n\n";
                flush();
            }

            echo "data: [DONE]\n\n";
            flush();
        }, 200, [
            'Content-Type'      => 'text/event-stream',
            'Cache-Control'     => 'no-cache, no-store',
            'X-Accel-Buffering' => 'no',   // prevents Nginx from buffering the stream
            'Connection'        => 'keep-alive',
        ]);
    }

    private function buildCatalog(): string
    {
        $lines = Product::with(['category', 'subcategory'])
            ->get()
            ->map(function ($p) {
                $parts = [
                    'ID: '       . $p->id,
                    'Name: '     . $p->name,
                    'Category: ' . implode(' › ', array_filter([$p->category?->name, $p->subcategory?->name])),
                    'Price: '    . $p->price,
                ];
                if ($p->description) $parts[] = 'Description: ' . $p->description;
                return implode(' | ', $parts);
            })
            ->implode("\n");

        return mb_substr($lines, 0, 6000);
    }

    private function buildSystemPrompt(string $catalog): string
    {
        return <<<PROMPT
You are Elo — a warm, knowledgeable personal shopping guide for Limitra USA, a curated product discovery platform covering fashion, beauty, home, lifestyle, and travel.

Your job is to recommend specific products from the catalog below that best match what the user is looking for.

PRODUCT CATALOG:
{$catalog}

SHOWING PRODUCTS TO THE CUSTOMER:
When you mention a product, embed its tag immediately after naming it so a clickable card appears in the chat:
  <product:PRODUCT_ID>
Use the exact ID from the "ID:" field. Example:
  "I'd start with the Limitra Linen Blazer <product:limitra-linen-blazer> — it anchors any look effortlessly."
Always embed 2–4 product tags per reply. Never skip the tag when recommending a product.

RULES:
- Keep replies short: 2–4 sentences. No long paragraphs.
- End each reply with one brief follow-up question to refine the recommendation.
- Never mention prices — users discover them when they click through.
- Tone: warm, editorial, like a trusted style friend.
- If the user asks something unrelated to shopping, gently steer back.
PROMPT;
    }
}
