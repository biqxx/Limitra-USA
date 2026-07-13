<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\TracksVisitorContext;
use App\Models\Article;
use App\Models\ArticleView;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ArticleController extends Controller
{
    use TracksVisitorContext;

    public function show(Request $request, string $slug)
    {
        $article = Article::where('slug', $slug)->firstOrFail();

        ArticleView::create([
            'article_id' => $article->id,
            'source_page' => $this->pathFromReferer($request->headers->get('referer')),
            'device' => $this->detectDevice($request->userAgent()),
        ]);

        $productIds = collect($article->body ?? [])
            ->where('type', 'products')
            ->flatMap(fn ($block) => $block['ids'] ?? [])
            ->unique()
            ->values()
            ->toArray();

        $products = Product::with(['category', 'subcategory'])
            ->where(fn ($q) => $q->whereIn('id', $productIds)->orWhereIn('slug', $productIds))
            ->get()
            ->map(fn ($p) => $p->toFrontend())
            ->values();

        $relatedArticles = Article::where('slug', '!=', $slug)
            ->orderByDesc('featured')
            ->orderByDesc('id')
            ->take(3)
            ->get();

        return Inertia::render('Article', [
            'article' => $article,
            'products' => $products,
            'relatedArticles' => $relatedArticles,
        ]);
    }
}
