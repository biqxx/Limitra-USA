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

        $sort = $request->query('sort', 'featured');

        $query = match($type) {
            'new' => Product::where(function ($q) {
                $q->where('is_new', true)
                  ->orWhereJsonContains('tags', 'new')
                  ->orWhere('badge', 'like', '%new%');
            })->with(['category', 'subcategory']),
            'editors' => Product::where('is_featured', true)->with(['category', 'subcategory']),
            'trending' => Product::whereNotNull('badge')->with(['category', 'subcategory']),
            'gifts' => Product::with(['category', 'subcategory']),
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
            })->with(['category', 'subcategory']),
            default => Product::where(function ($q) use ($type) {
                $occasion = Occasion::where('key', $type)->first();
                if ($occasion && $occasion->product_ids) {
                    // Explicit per-product curation from the admin editor — takes priority.
                    $q->whereIn('id', $occasion->product_ids);
                } elseif ($occasion && $occasion->subcats) {
                    // Legacy/bulk curation by subcategory, kept for occasions configured this way.
                    $q->whereHas('subcategory', fn ($sq) => $sq->whereIn('name', $occasion->subcats));
                }
            })->with(['category', 'subcategory']),
        };

        if ($catParam && $catParam !== 'all') {
            $query->whereHas('category', fn ($cat) => $cat->where('name', $catParam)->orWhere('slug', $catParam));
        }

        if ($sort === 'price-asc') {
            $query->orderByRaw('CAST(REGEXP_REPLACE(price, "[^0-9.]", "") AS DECIMAL(10,2)) ASC');
        } elseif ($sort === 'price-desc') {
            $query->orderByRaw('CAST(REGEXP_REPLACE(price, "[^0-9.]", "") AS DECIMAL(10,2)) DESC');
        } elseif ($sort === 'rating') {
            $query->orderByDesc('rating');
        } else {
            $query->orderByDesc('is_featured')->orderByDesc('id');
        }

        $products = $query->paginate(24)->withQueryString()->through(fn ($p) => $p->toFrontend());

        $occasion = Occasion::where('key', $type)->first();

        $categories = Category::with('subcategories')->orderBy('sort_order')->get()->map(fn ($c) => [
            'id' => $c->id,
            'name' => $c->name,
            'slug' => $c->slug,
            'subcategories' => $c->subcategories->pluck('name'),
        ]);

        return Inertia::render('Collection', [
            'type' => $type,
            'products' => $products,
            'occasion' => $occasion,
            'categories' => $categories,
            'initialCategory' => $catParam,
            'searchQuery' => $request->query('q', ''),
            'initialSort' => $sort,
        ]);
    }
}
