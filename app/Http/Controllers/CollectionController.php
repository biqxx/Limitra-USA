<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Occasion;
use App\Models\Product;
use Inertia\Inertia;

use Illuminate\Http\Request;

class CollectionController extends Controller
{
    public function show(Request $request, string $type)
    {
        $catParam = $request->query('cat') ?? $request->query('category');

        $products = match($type) {
            'new' => Product::where(function ($q) {
                $q->where('is_new', true)
                  ->orWhereJsonContains('tags', 'new')
                  ->orWhere('badge', 'like', '%new%');
            })->with(['category', 'subcategory'])->get(),
            'editors' => Product::where('is_featured', true)->with(['category', 'subcategory'])->get(),
            'trending' => Product::whereNotNull('badge')->with(['category', 'subcategory'])->get(),
            'gifts' => Product::with(['category', 'subcategory'])->get(),
            'search' => Product::where(function ($q) use ($request) {
                $searchTerm = trim($request->query('q', ''));
                if ($searchTerm !== '') {
                    $q->where('name', 'like', "%{$searchTerm}%")
                      ->orWhere('brand', 'like', "%{$searchTerm}%")
                      ->orWhere('description', 'like', "%{$searchTerm}%")
                      ->orWhere('badge', 'like', "%{$searchTerm}%")
                      ->orWhereHas('category', fn ($cat) => $cat->where('name', 'like', "%{$searchTerm}%"))
                      ->orWhereHas('subcategory', fn ($sub) => $sub->where('name', 'like', "%{$searchTerm}%"));
                }
            })->with(['category', 'subcategory'])->get(),
            default => Product::where(function ($q) use ($type) {
                $occasion = Occasion::where('key', $type)->first();
                if ($occasion && $occasion->product_ids) {
                    // Explicit per-product curation from the admin editor — takes priority.
                    $q->whereIn('id', $occasion->product_ids);
                } elseif ($occasion && $occasion->subcats) {
                    // Legacy/bulk curation by subcategory, kept for occasions configured this way.
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
            'initialCategory' => $catParam,
            'searchQuery' => $request->query('q', ''),
        ]);
    }
}
