<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\TracksVisitorContext;
use App\Models\Article;
use App\Models\ArticleView;
use App\Models\Product;
use App\Models\ProductView;
use Illuminate\Http\Request;

class EngagementViewController extends Controller
{
    use TracksVisitorContext;

    public function product(Request $request, string $id)
    {
        $product = Product::where(fn ($q) => $q->where('id', $id)->orWhere('slug', $id))->firstOrFail();

        return $this->record($request, ProductView::class, 'product_id', $product->id, 'product');
    }

    public function article(Request $request, string $slug)
    {
        $article = Article::where('slug', $slug)->firstOrFail();

        return $this->record($request, ArticleView::class, 'article_id', $article->id, 'article');
    }

    private function record(Request $request, string $model, string $foreignKey, string|int $contentId, string $type)
    {
        $request->validate(['source_page' => 'nullable|string|max:255']);

        if ($this->isBot($request->userAgent())) {
            return response()->json(['ok' => true, 'ignored' => 'bot']);
        }

        $visitorHash = $this->visitorHash($request);
        $viewDate = now()->toDateString();

        $model::firstOrCreate(
            ['dedupe_key' => hash('sha256', implode('|', [$type, $contentId, $visitorHash, $viewDate]))],
            [
                $foreignKey => $contentId,
                'source_page' => $request->input('source_page'),
                'device' => $this->detectDevice($request->userAgent()),
                'visitor_hash' => $visitorHash,
                'view_date' => $viewDate,
            ]
        );

        return response()->json(['ok' => true]);
    }
}
