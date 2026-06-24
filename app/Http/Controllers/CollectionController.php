<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Occasion;
use App\Models\Product;
use Inertia\Inertia;

class CollectionController extends Controller
{
    public function show(string $type)
    {
        $products = match($type) {
            'new' => Product::where('is_new', true)->with(['category', 'subcategory'])->get(),
            'editors' => Product::where('is_featured', true)->with(['category', 'subcategory'])->get(),
            'trending' => Product::whereNotNull('badge')->with(['category', 'subcategory'])->get(),
            'gifts' => Product::with(['category', 'subcategory'])->get(),
            default => Product::where(function ($q) use ($type) {
                $occasion = Occasion::where('key', $type)->first();
                if ($occasion && $occasion->subcats) {
                    $q->whereHas('subcategory', fn ($sq) => $sq->whereIn('name', $occasion->subcats));
                }
            })->with(['category', 'subcategory'])->get(),
        };

        $occasion = Occasion::where('key', $type)->first();

        $categories = Category::with('subcategories')->orderBy('sort_order')->get()->map(fn ($c) => [
            'id' => $c->id,
            'name' => $c->name,
            'slug' => $c->slug,
            'subcategories' => $c->subcategories->pluck('name'),
        ]);

        return Inertia::render('Collection', [
            'type' => $type,
            'products' => $products->map(fn ($p) => $p->toFrontend()),
            'occasion' => $occasion,
            'categories' => $categories,
        ]);
    }
}
