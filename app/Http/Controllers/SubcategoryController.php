<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use Inertia\Inertia;

class SubcategoryController extends Controller
{
    public function show(string $catSlug, string $subSlug)
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

        $products = Product::with(['category', 'subcategory'])
            ->where('subcategory_id', $subcategory?->id)
            ->get()
            ->map(fn ($p) => $p->toFrontend());

        return Inertia::render('Subcategory', [
            'category'           => $categoryData,
            'subcategory'        => $subcategory?->name,
            'subcategorySeoDesc' => $subcategory?->seo_description,
            'products'           => $products,
        ]);
    }
}
