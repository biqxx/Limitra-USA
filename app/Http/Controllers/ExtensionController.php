<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use App\Models\Retailer;
use App\Models\RetailerProductImport;
use App\Services\ProductWriter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Token-authenticated API for the ProductPicker Chrome extension (see EnsureExtensionToken).
 * Separate from AdminController on purpose — this is a different auth boundary (bearer
 * token, not an admin session) and a different contract (plain JSON in/out, not Inertia).
 */
class ExtensionController extends Controller
{
    public function __construct(private ProductWriter $productWriter)
    {
    }

    /** Lightweight category/subcategory list for the basket page's dropdowns. */
    public function categories()
    {
        $categories = Category::with('subcategories')->orderBy('sort_order')->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'subs' => $c->subcategories->pluck('name')->values()->toArray(),
            ]);

        return response()->json(['categories' => $categories]);
    }

    /**
     * For each {retailer, externalId, url}, reports whether it's already been imported
     * before — checked against the permanent import log, not the live catalog, so a
     * product that was later edited or deleted still counts as a duplicate.
     */
    public function checkDuplicates(Request $request)
    {
        $data = $request->validate([
            'items'               => 'required|array|min:1',
            'items.*.retailer'    => 'required|string',
            'items.*.externalId'  => 'nullable|string',
            'items.*.url'         => 'required|string',
        ]);

        $results = collect($data['items'])->map(function ($item) {
            $match = null;

            if (!empty($item['externalId'])) {
                $match = RetailerProductImport::where('retailer', $item['retailer'])
                    ->where('external_id', $item['externalId'])
                    ->first();
            }

            if (!$match) {
                $match = RetailerProductImport::where('retailer', $item['retailer'])
                    ->where('external_url', $item['url'])
                    ->first();
            }

            return [
                'retailer'           => $item['retailer'],
                'externalId'         => $item['externalId'] ?? null,
                'url'                => $item['url'],
                'duplicate'          => (bool) $match,
                'importedAt'         => $match?->imported_at,
                'productId'          => $match?->product_id,
                'productStillExists' => $match && $match->product_id
                    ? Product::whereKey($match->product_id)->exists()
                    : false,
            ];
        });

        return response()->json(['results' => $results->values()]);
    }

    /**
     * Creates a live Product per item (no draft/review step — the admin already
     * edited everything in the extension's basket page) and logs each into the
     * permanent import log. Best-effort per item: one bad row doesn't fail the batch.
     */
    public function uploadProducts(Request $request)
    {
        set_time_limit(120);

        $data = $request->validate([
            'importedBy'      => 'nullable|string|max:255',
            'items'           => 'required|array|min:1',
            'items.*.retailer'   => 'required|string',
            'items.*.externalId' => 'nullable|string',
            'items.*.url'        => 'required|string',
            'items.*.name'       => 'required|string',
            'items.*.price'      => 'required|string',
        ]);

        $importedBy = $data['importedBy'] ?? null;

        $results = collect($data['items'])->map(function ($item) use ($importedBy) {
            try {
                return DB::transaction(function () use ($item, $importedBy) {
                    $retailer = Retailer::firstOrCreate(['name' => $item['retailer']]);

                    $product = $this->productWriter->createFromArray([
                        'name'        => $item['name'],
                        'brand'       => $item['brand'] ?? null,
                        'price'       => $item['price'],
                        'category'    => $item['categoryName'] ?? null,
                        'subcategory' => $item['subcategoryName'] ?? null,
                        'retailer'    => $item['retailer'],
                        'retailer_id' => $retailer->id,
                        'affiliateUrl' => $item['url'],
                        'image'       => $item['image'] ?? null,
                        'description' => $item['description'] ?? null,
                        'about'       => $item['about'] ?? [],
                        'highlights'  => $item['highlights'] ?? [],
                        'specs'       => $item['specs'] ?? [],
                    ]);

                    RetailerProductImport::create([
                        'retailer'     => $item['retailer'],
                        'external_id'  => $item['externalId'] ?? null,
                        'external_url' => $item['url'],
                        'product_id'   => $product->id,
                        'imported_by'  => $importedBy,
                        'imported_at'  => now(),
                    ]);

                    return [
                        'externalId' => $item['externalId'] ?? null,
                        'status'     => 'created',
                        'productId'  => $product->id,
                    ];
                });
            } catch (\Throwable $e) {
                Log::error('[Extension] Product import failed', [
                    'error' => $e->getMessage(),
                    'item'  => $item,
                    'file'  => $e->getFile() . ':' . $e->getLine(),
                ]);

                return [
                    'externalId' => $item['externalId'] ?? null,
                    'status'     => 'error',
                    'message'    => $e->getMessage(),
                ];
            }
        });

        return response()->json(['results' => $results->values()]);
    }
}
