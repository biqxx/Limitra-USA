<?php

namespace App\Http\Controllers;

use App\Models\Article;
use App\Models\Occasion;
use App\Models\Product;
use App\Models\SiteSetting;
use App\Models\Video;
use Inertia\Inertia;

class HomeController extends Controller
{
    public function index()
    {
        $settings = SiteSetting::allAsMap();

        $featuredCount = (int) ($settings['home_featured_count'] ?? 8);
        $resortCount   = (int) ($settings['home_resort_count']   ?? 8);
        $articleCount  = (int) ($settings['home_articles_count'] ?? 6);

        $featured = Product::with(['category', 'subcategory'])
            ->where('is_featured', true)
            ->take($featuredCount)
            ->get()
            ->map(fn ($p) => $p->toFrontend());

        $resort = Product::with(['category', 'subcategory'])
            ->where('is_resort', true)
            ->take($resortCount)
            ->get()
            ->map(fn ($p) => $p->toFrontend());

        if ($featured->isEmpty()) {
            $featured = Product::with(['category', 'subcategory'])->take(4)->get()->map(fn ($p) => $p->toFrontend());
        }
        if ($resort->isEmpty()) {
            $featuredIds = $featured->pluck('id');
            $resort = Product::with(['category', 'subcategory'])->whereNotIn('id', $featuredIds)->take(4)->get()->map(fn ($p) => $p->toFrontend());
        }

        $occasions = Occasion::orderBy('sort_order')->get();
        $articles = Article::orderByDesc('featured')->orderByDesc('id')->take($articleCount)->get();
        $videos = Video::allWithProducts();

        // Sanitize fields rendered via dangerouslySetInnerHTML — strip disallowed tags and all attributes
        foreach (['announce_text'] as $field) {
            if (isset($settings[$field])) {
                $settings[$field] = strip_tags($settings[$field], '<strong><em><br><span>');
                $settings[$field] = preg_replace('/<(\w+)\s[^>]*>/', '<$1>', $settings[$field]);
            }
        }

        return Inertia::render('Home', [
            'featuredProducts' => $featured,
            'resortProducts'   => $resort,
            'occasions'        => $occasions,
            'articles'         => $articles,
            'videos'           => $videos,
            'settings'         => $settings,
            'catalogCount'     => Product::count(),
        ]);
    }
}
