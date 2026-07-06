<?php

namespace App\Http\Controllers;

use App\Models\Article;
use App\Models\Product;
use Inertia\Inertia;

class ArticleController extends Controller
{
    public function show(string $slug)
    {
        $article = Article::where('slug', $slug)->firstOrFail();

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
