<?php

namespace App\Http\Controllers;

use App\Models\Article;
use App\Models\Category;
use App\Models\Guide;
use App\Models\Look;
use App\Models\Product;
use App\Models\StaticPage;
use Illuminate\Http\Response;

class SitemapController extends Controller
{
    public function index(): Response
    {
        // ── Static / collection pages ────────────────────────────────────────
        $static = [
            ['loc' => url('/'),          'priority' => '1.00', 'changefreq' => 'daily'],
            ['loc' => url('/guides'),    'priority' => '0.80', 'changefreq' => 'weekly'],
            ['loc' => url('/looks'),     'priority' => '0.80', 'changefreq' => 'weekly'],
            // Named collections
            ['loc' => url('/collection/new'),      'priority' => '0.80', 'changefreq' => 'daily'],
            ['loc' => url('/collection/editors'),  'priority' => '0.70', 'changefreq' => 'weekly'],
            ['loc' => url('/collection/trending'), 'priority' => '0.70', 'changefreq' => 'weekly'],
            ['loc' => url('/collection/gifts'),    'priority' => '0.60', 'changefreq' => 'monthly'],
        ];

        // ── DB-driven content ────────────────────────────────────────────────

        // Categories & their subcategories
        $categories = Category::with('subcategories')->orderBy('sort_order')->get();
        $categoryUrls = [];
        foreach ($categories as $cat) {
            $categoryUrls[] = [
                'loc'        => url("/category/{$cat->slug}"),
                'priority'   => '0.90',
                'changefreq' => 'weekly',
            ];
            foreach ($cat->subcategories as $sub) {
                $subSlug = str_replace(' ', '-', strtolower($sub->name));
                $categoryUrls[] = [
                    'loc'        => url("/category/{$cat->slug}/{$subSlug}"),
                    'priority'   => '0.80',
                    'changefreq' => 'weekly',
                ];
            }
        }

        // Products — select only the columns needed for the sitemap
        $products = Product::select('id', 'updated_at')->get()->map(fn ($p) => [
            'loc'        => url("/product/{$p->id}"),
            'lastmod'    => $p->updated_at?->toAtomString(),
            'priority'   => '0.60',
            'changefreq' => 'monthly',
        ]);

        // Articles
        $articles = Article::select('slug', 'updated_at')->get()->map(fn ($a) => [
            'loc'        => url("/article/{$a->slug}"),
            'lastmod'    => $a->updated_at?->toAtomString(),
            'priority'   => '0.70',
            'changefreq' => 'monthly',
        ]);

        // Guides
        $guides = Guide::select('slug', 'updated_at')->get()->map(fn ($g) => [
            'loc'        => url("/guide/{$g->slug}"),
            'lastmod'    => $g->updated_at?->toAtomString(),
            'priority'   => '0.70',
            'changefreq' => 'monthly',
        ]);

        // Style looks
        $looks = Look::select('slug', 'updated_at')->get()->map(fn ($l) => [
            'loc'        => url("/look/{$l->slug}"),
            'lastmod'    => $l->updated_at?->toAtomString(),
            'priority'   => '0.65',
            'changefreq' => 'monthly',
        ]);

        // Static CMS pages (e.g. about, contact, privacy-policy, etc.)
        $cmsPages = StaticPage::select('key', 'updated_at')->get()->map(fn ($p) => [
            'loc'        => url("/page/{$p->key}"),
            'lastmod'    => $p->updated_at?->toAtomString(),
            'priority'   => '0.50',
            'changefreq' => 'yearly',
        ]);

        $urls = collect($static)
            ->concat($categoryUrls)
            ->concat($products)
            ->concat($articles)
            ->concat($guides)
            ->concat($looks)
            ->concat($cmsPages);

        $xml = view('sitemap', ['urls' => $urls])->render();

        return response($xml, 200, [
            'Content-Type' => 'application/xml; charset=utf-8',
        ]);
    }
}
