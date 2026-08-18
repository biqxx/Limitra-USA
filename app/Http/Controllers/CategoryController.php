<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CategoryController extends Controller
{
    public function show(Request $request, string $slug)
    {
        $category = Category::with('subcategories')->where('slug', $slug)->firstOrFail();

        $categoryData = [
            'id' => $category->id,
            'name' => $category->name,
            'slug' => $category->slug,
            'tagline' => $category->tagline,
            'banner_img' => $category->banner_img,
            'feature_img' => $category->feature_img,
            'feature_img2' => $category->feature_img2,
            'subcategories' => $category->subcategories->pluck('name'),
        ];

        $sub = $request->query('sub');
        $query = Product::with(['category', 'subcategory'])
            ->where('category_id', $category->id);

        if ($sub && $sub !== 'All') {
            $query->whereHas('subcategory', fn ($q) => $q->where('name', $sub));
        }

        $sort = $request->query('sort', 'featured');
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

        return Inertia::render('Category', [
            'category' => $categoryData,
            'products' => $products,
            'initialSub' => $sub ?? 'All',
            'initialSort' => $sort,
        ]);
    }
}
