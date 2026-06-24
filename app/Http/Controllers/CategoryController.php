<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use Inertia\Inertia;

class CategoryController extends Controller
{
    public function show(string $slug)
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

        $products = Product::with(['category', 'subcategory'])
            ->where('category_id', $category->id)
            ->get()
            ->map(fn ($p) => $p->toFrontend());

        return Inertia::render('Category', [
            'category' => $categoryData,
            'products' => $products,
        ]);
    }
}
