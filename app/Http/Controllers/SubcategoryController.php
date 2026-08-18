<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SubcategoryController extends Controller
{
    public function show(Request $request, string $catSlug, string $subSlug)
    {
        $category = Category::with('subcategories')->where('slug', $catSlug)->firstOrFail();

        $subName = str_replace('-', ' ', urldecode($subSlug));
        $subcategory = $category->subcategories()->whereRaw('LOWER(name) = ?', [strtolower($subName)])->first()
            ?? $category->subcategories()->first();

        $categoryData = [
            'id' => $category->id,
            'name' => $category->name,
            'slug' => $category->slug,
            'tagline' => $category->tagline,
            'banner_img' => $category->banner_img,
            'subcategories' => $category->subcategories->pluck('name'),
        ];

        $sort = $request->query('sort', 'featured');
        $query = Product::with(['category', 'subcategory'])
            ->where('subcategory_id', $subcategory?->id);

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

        return Inertia::render('Subcategory', [
            'category'           => $categoryData,
            'subcategory'        => $subcategory?->name,
            'subcategorySeoDesc' => $subcategory?->seo_description,
            'products'           => $products,
            'initialSort'        => $sort,
        ]);
    }
}
