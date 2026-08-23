<?php

namespace App\Http\Controllers;

use App\Models\Look;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProductController extends Controller
{
    public function show(Request $request, string $id)
    {
        $product = Product::with(['category', 'subcategory', 'detail'])
            ->where(fn ($q) => $q->where('id', $id)->orWhere('slug', $id))
            ->firstOrFail();

        // "More to discover" is a random sample from the same category rather than the
        // hand-curated related_products field — that field has no admin UI to set it at all,
        // so it's always empty in practice; a same-category random pick always has something
        // to show instead.
        $relatedProducts = Product::with(['category', 'subcategory'])
            ->where('id', '!=', $product->id)
            ->when($product->category_id, fn ($q) => $q->where('category_id', $product->category_id))
            ->inRandomOrder()
            ->limit(10)
            ->get()
            ->map(fn ($p) => $p->toFrontend());

        $looks = Look::take(4)->get();

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
