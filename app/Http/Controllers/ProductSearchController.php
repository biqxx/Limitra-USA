<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductSearchController extends Controller
{
    /** Return a small set of type-ahead matches; never expose or load the full catalogue. */
    public function index(Request $request): JsonResponse
    {
        $term = trim((string) $request->query('q', ''));

        if (mb_strlen($term) < 2) {
            return response()->json(['products' => []]);
        }

        $term = mb_substr($term, 0, 80);
        // Escape wildcard characters so a visitor cannot turn a short query into a full-table match.
        $escaped = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $term);
        $prefix = $escaped . '%';
        $contains = '%' . $escaped . '%';

        $products = Product::query()
            ->with(['category', 'subcategory', 'detail'])
            ->where(function ($query) use ($prefix, $contains) {
                $query->where('name', 'like', $prefix)
                    ->orWhere('brand', 'like', $prefix)
                    ->orWhere('name', 'like', $contains)
                    ->orWhere('brand', 'like', $contains)
                    ->orWhere('description', 'like', $contains)
                    ->orWhere('retailer', 'like', $contains)
                    ->orWhere('features', 'like', $contains)
                    ->orWhereHas('detail', fn ($detail) => $detail
                        ->where('about', 'like', $contains)
                        ->orWhere('highlights', 'like', $contains)
                        ->orWhere('specs', 'like', $contains));
            })
            ->orderByRaw(
                'CASE WHEN name LIKE ? THEN 0 WHEN brand LIKE ? THEN 1 WHEN name LIKE ? THEN 2 WHEN brand LIKE ? THEN 3 ELSE 4 END',
                [$prefix, $prefix, $contains, $contains]
            )
            ->limit(8)
            ->get()
            ->map(fn (Product $product) => $product->toFrontend())
            ->values();

        return response()->json(['products' => $products]);
    }
}
