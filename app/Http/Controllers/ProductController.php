<?php

namespace App\Http\Controllers;

use App\Models\Look;
use App\Models\Product;
use Inertia\Inertia;

class ProductController extends Controller
{
    public function show(string $id)
    {
        $product = Product::with(['category', 'subcategory', 'detail'])->findOrFail($id);

        $relatedProducts = Product::with(['category', 'subcategory'])
            ->whereIn('id', $product->related_products ?? [])
            ->get()
            ->map(fn ($p) => $p->toFrontend());

        $looks = Look::all();

        $detail = null;
        if ($product->detail) {
            $detail = [
                'about_paragraphs' => $product->detail->about ?? [],
                'highlights' => $product->detail->highlights ?? [],
                'specs' => $product->detail->specs ?? [],
            ];
        }

        return Inertia::render('Product', [
            'product' => $product->toFrontend(),
            'relatedProducts' => $relatedProducts,
            'looks' => $looks,
            'detail' => $detail,
        ]);
    }
}
