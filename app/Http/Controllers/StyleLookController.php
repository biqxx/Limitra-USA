<?php

namespace App\Http\Controllers;

use App\Models\Look;
use App\Models\Product;
use Inertia\Inertia;

class StyleLookController extends Controller
{
    public function index()
    {
        $looks = Look::all();

        return Inertia::render('StyleLooks', [
            'looks' => $looks,
        ]);
    }

    public function show(string $slug)
    {
        $look = Look::where('slug', $slug)->firstOrFail();

        $lookRefs = $look->products ?? [];
        $products = Product::with(['category', 'subcategory'])
            ->where(fn ($q) => $q->whereIn('id', $lookRefs)->orWhereIn('slug', $lookRefs))
            ->get()
            ->map(fn ($p) => $p->toFrontend())
            ->values();

        $otherLooks = Look::where('slug', '!=', $slug)->take(4)->get();

        return Inertia::render('StyleLook', [
            'look' => $look,
            'products' => $products,
            'otherLooks' => $otherLooks,
        ]);
    }
}
