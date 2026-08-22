<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class PublicCatalogController extends Controller
{
    private const PER_PAGE = 100;

    /**
     * Public, crawler-friendly catalogue. It is deliberately paginated: loading all
     * products into one JSON response would become expensive and unwieldy at scale.
     */
    public function index(Request $request): JsonResponse
    {
        $page = max(1, (int) $request->query('page', 1));
        $version = (int) Cache::rememberForever('public_catalog_version', fn () => 1);
        $cacheKey = "public_catalog:v{$version}:page{$page}";

        $payload = Cache::remember($cacheKey, now()->addDay(), function () use ($page) {
            $products = Product::query()
                ->with(['category:id,name,slug', 'subcategory:id,name'])
                ->select([
                    'id', 'slug', 'name', 'brand', 'price', 'category_id', 'subcategory_id',
                    'retailer', 'affiliate_url', 'image', 'description', 'badge', 'rating',
                    'features', 'is_featured', 'is_resort', 'is_new', 'days_ago', 'tags', 'updated_at',
                ])
                ->orderByDesc('updated_at')
                ->orderBy('id')
                ->paginate(self::PER_PAGE, ['*'], 'page', $page);

            $items = $products->getCollection()->map(function (Product $product) {
                $frontEnd = $product->toFrontend();
                $productUrl = url("/product/{$product->slug}");

                return [
                    '@type' => 'Product',
                    'url' => $productUrl,
                    'name' => $frontEnd['name'],
                    'brand' => $frontEnd['brand'],
                    'description' => $frontEnd['description'],
                    'image' => $frontEnd['image'],
                    'price' => $frontEnd['price'],
                    'category' => $frontEnd['category'],
                    'subcategory' => $frontEnd['subcategory'],
                    'retailer' => $frontEnd['retailer'],
                    // This is the publicly intended affiliate destination, never a private API URL.
                    'retailer_product_url' => $frontEnd['affiliate_url'],
                    'outbound_url' => url("/go/{$product->id}"),
                    'link_relationship' => 'sponsored',
                    'affiliate_disclosure' => 'Limitra may earn a commission from qualifying purchases at no extra cost to the customer.',
                    'last_updated' => $product->updated_at?->toAtomString(),
                ];
            })->values();

            return [
                '@context' => 'https://schema.org',
                '@type' => 'ItemList',
                'name' => 'Limitra USA public product catalogue',
                'description' => 'Independently curated products from third-party retailers. Affiliate relationships are disclosed for every listing.',
                'url' => url('/catalog.json'),
                'generated_at' => now()->toAtomString(),
                'pagination' => [
                    'page' => $products->currentPage(),
                    'per_page' => $products->perPage(),
                    'total_products' => $products->total(),
                    'total_pages' => $products->lastPage(),
                    'next_page_url' => $products->hasMorePages() ? url('/catalog.json?page=' . ($products->currentPage() + 1)) : null,
                    'previous_page_url' => $products->onFirstPage() ? null : url('/catalog.json?page=' . ($products->currentPage() - 1)),
                ],
                'itemListElement' => $items,
            ];
        });

        return response()->json($payload)
            ->header('Cache-Control', 'public, max-age=900, s-maxage=3600, stale-while-revalidate=86400');
    }
}
