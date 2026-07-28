<?php

namespace App\Http\Controllers;

use App\Models\Article;
use App\Models\Guide;
use App\Models\Product;
use App\Models\Video;
use Inertia\Inertia;

class GuidesController extends Controller
{
    public function index()
    {
        $guides = Guide::orderByDesc('featured')->orderBy('sort_order')->get();
        $articles = Article::orderByDesc('featured')->get();
        $videos = Video::allWithProducts();

        return Inertia::render('Guides', [
            'guides' => $guides,
            'articles' => $articles,
            'videos' => $videos,
        ]);
    }

    public function show(string $slug)
    {
        $guide = Guide::where('slug', $slug)->firstOrFail();

        $sections = collect($guide->sections ?? [])->map(function ($section) {
            $ids = $section['product_ids'] ?? [];

            $products = Product::with(['category', 'subcategory'])
                ->whereIn('id', $ids)
                ->get()
                ->sortBy(fn ($p) => array_search($p->id, $ids))
                ->map(fn ($p) => $p->toFrontend())
                ->values();

            return [
                'title' => $section['title'] ?? '',
                'products' => $products,
            ];
        })->filter(fn ($s) => $s['title'] || $s['products']->isNotEmpty())->values();

        $otherGuides = Guide::where('slug', '!=', $slug)
            ->orderByDesc('featured')
            ->orderBy('sort_order')
            ->take(3)
            ->get();

        return Inertia::render('Guide', [
            'guide' => $guide,
            'sections' => $sections,
            'otherGuides' => $otherGuides,
        ]);
    }
}
