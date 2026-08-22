<?php

namespace App\Http\Controllers;

use App\Models\Article;
use App\Models\Category;
use App\Models\Guide;
use App\Models\Look;
use App\Models\Product;
use App\Models\StaticPage;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;

class SitemapController extends Controller
{
    // The sitemap protocol permits up to 50,000 URLs per file; leave useful headroom.
    private const PRODUCTS_PER_SITEMAP = 40000;

    /** The stable crawler entry point: a sitemap index, not a growing URL list. */
    public function index(): Response
    {
        $version = (int) Cache::rememberForever('public_catalog_version', fn () => 1);

        $xml = Cache::remember("sitemap_index:v{$version}", now()->addDay(), function () {
            $productPages = max(1, (int) ceil(Product::count() / self::PRODUCTS_PER_SITEMAP));
            $sitemaps = [
                ['loc' => url('/sitemaps/core.xml')],
                ['loc' => url('/sitemaps/content.xml')],
            ];

            for ($page = 1; $page <= $productPages; $page++) {
                $sitemaps[] = ['loc' => url("/sitemaps/products/{$page}.xml")];
            }

            return view('sitemap-index', ['sitemaps' => $sitemaps])->render();
        });

        return $this->xmlResponse($xml);
    }

    /** Homepage, named collections, categories, and subcategories. */
    public function core(): Response
    {
        $urls = [
            ['loc' => url('/'), 'priority' => '1.00', 'changefreq' => 'daily'],
            ['loc' => url('/guides'), 'priority' => '0.80', 'changefreq' => 'weekly'],
            ['loc' => url('/looks'), 'priority' => '0.80', 'changefreq' => 'weekly'],
            ['loc' => url('/collection/new'), 'priority' => '0.80', 'changefreq' => 'daily'],
            ['loc' => url('/collection/editors'), 'priority' => '0.70', 'changefreq' => 'weekly'],
            ['loc' => url('/collection/trending'), 'priority' => '0.70', 'changefreq' => 'weekly'],
            ['loc' => url('/collection/gifts'), 'priority' => '0.60', 'changefreq' => 'monthly'],
        ];

        foreach (Category::with('subcategories')->orderBy('sort_order')->get() as $category) {
            $urls[] = ['loc' => url("/category/{$category->slug}"), 'priority' => '0.90', 'changefreq' => 'weekly'];
            foreach ($category->subcategories as $subcategory) {
                $slug = str_replace(' ', '-', strtolower($subcategory->name));
                $urls[] = ['loc' => url("/category/{$category->slug}/{$slug}"), 'priority' => '0.80', 'changefreq' => 'weekly'];
            }
        }

        return $this->urlSetResponse($urls);
    }

    /** Editorial and informational pages, separate from high-volume product URLs. */
    public function content(): Response
    {
        $articles = Article::select('slug', 'updated_at')->get()->map(fn ($article) => [
            'loc' => url("/article/{$article->slug}"), 'lastmod' => $article->updated_at?->toAtomString(), 'priority' => '0.70', 'changefreq' => 'monthly',
        ]);
        $guides = Guide::select('slug', 'updated_at')->get()->map(fn ($guide) => [
            'loc' => url("/guide/{$guide->slug}"), 'lastmod' => $guide->updated_at?->toAtomString(), 'priority' => '0.70', 'changefreq' => 'monthly',
        ]);
        $looks = Look::select('slug', 'updated_at')->get()->map(fn ($look) => [
            'loc' => url("/look/{$look->slug}"), 'lastmod' => $look->updated_at?->toAtomString(), 'priority' => '0.65', 'changefreq' => 'monthly',
        ]);
        $pages = StaticPage::select('key', 'updated_at')->get()->map(fn ($page) => [
            'loc' => url("/page/{$page->key}"), 'lastmod' => $page->updated_at?->toAtomString(), 'priority' => '0.50', 'changefreq' => 'yearly',
        ]);

        return $this->urlSetResponse($articles->concat($guides)->concat($looks)->concat($pages));
    }

    /** One bounded, cacheable product sitemap page. */
    public function products(int $page): Response
    {
        $version = (int) Cache::rememberForever('public_catalog_version', fn () => 1);
        $productPages = max(1, (int) ceil(Product::count() / self::PRODUCTS_PER_SITEMAP));
        abort_if($page < 1 || $page > $productPages, 404);

        $xml = Cache::remember("sitemap_products:v{$version}:page{$page}", now()->addDay(), function () use ($page) {
            $urls = Product::query()
                ->select('id', 'slug', 'updated_at')
                ->orderBy('id')
                ->forPage($page, self::PRODUCTS_PER_SITEMAP)
                ->get()
                ->map(fn ($product) => [
                    'loc' => url('/product/' . ($product->slug ?: $product->id)),
                    'lastmod' => $product->updated_at?->toAtomString(),
                    'priority' => '0.60',
                    'changefreq' => 'monthly',
                ]);

            return view('sitemap', ['urls' => $urls])->render();
        });

        return $this->xmlResponse($xml);
    }

    private function urlSetResponse(iterable $urls): Response
    {
        return $this->xmlResponse(view('sitemap', ['urls' => $urls])->render());
    }

    private function xmlResponse(string $xml): Response
    {
        return response($xml, 200, ['Content-Type' => 'application/xml; charset=utf-8']);
    }
}
