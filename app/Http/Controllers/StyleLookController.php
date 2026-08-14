<?php

namespace App\Http\Controllers;

use App\Models\Look;
use App\Models\Product;
use Inertia\Inertia;

class StyleLookController extends Controller
{
    public function index()
    {
        // Newest first — the gallery page gives the first item a large featured treatment,
        // so this ordering is what actually decides which look gets featured.
        $looks = Look::orderByDesc('created_at')->get();

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
