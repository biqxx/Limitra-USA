<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductDetail;
use App\Models\Subcategory;
use Illuminate\Support\Str;

/**
 * Shared product-creation logic, extracted out of AdminController::storeProduct() so the
 * extension import endpoint (ExtensionController) can create products the exact same way
 * the admin form does, instead of a second drifting copy of the same field mapping.
 */
class ProductWriter
{
    public function cleanArray(array $arr): array
    {
        return array_values(array_filter(array_map('trim', $arr), fn ($x) => $x !== ''));
    }

    public function cleanSpecs(array $specs): array
    {
        return array_values(array_filter($specs, fn ($r) => ($r[0] ?? '') || ($r[1] ?? '')));
    }

    public function uniqueProductSlug(?string $source): string
    {
        $base = Str::slug($source ?: '') ?: Str::slug(Str::random(8));
        $slug = $base;
        $n = 2;
        while (Product::where('slug', $slug)->exists()) {
            $slug = $base . '-' . $n;
            $n++;
        }
        return $slug;
    }

    /**
     * Creates a Product (+ ProductDetail when there's any about/highlights/specs) from a
     * flat associative array — the same field shape as the admin product form's request body
     * (name, slug, brand, price, category, subcategory, retailer, retailer_id, affiliateUrl,
     * image, description, badge, rating, is_featured, is_resort, is_new, highlights, about, specs).
     */
    public function createFromArray(array $data): Product
    {
        $id = (string) Str::uuid();
        $name = $data['name'] ?? '';
        $slug = $this->uniqueProductSlug(($data['slug'] ?? null) ?: $name);

        $category = !empty($data['category']) ? Category::where('name', $data['category'])->first() : null;
        $subcategory = $category && !empty($data['subcategory'])
            ? Subcategory::where('category_id', $category->id)->where('name', $data['subcategory'])->first()
            : null;

        $product = Product::create([
            'id' => $id,
            'slug' => $slug,
            'name' => $name,
            'brand' => ($data['brand'] ?? '') ?: 'Limitra Select',
            'price' => $data['price'] ?? '',
            'category_id' => $category?->id,
            'subcategory_id' => $subcategory?->id,
            'retailer' => $data['retailer'] ?? null,
            'retailer_id' => $data['retailer_id'] ?? null,
            'affiliate_url' => $data['affiliateUrl'] ?? null,
            'image' => $data['image'] ?? null,
            'description' => ($data['description'] ?? '') ?: ($name . ' — a Limitra-curated pick.'),
            'badge' => ($data['badge'] ?? null) ?: null,
            'rating' => !empty($data['rating']) ? min(5, max(0, (float) $data['rating'])) : 4.8,
            'is_featured' => (bool) ($data['is_featured'] ?? false),
            'is_resort' => (bool) ($data['is_resort'] ?? false),
            'is_new' => (bool) ($data['is_new'] ?? false),
            'features' => $this->cleanArray($data['highlights'] ?? []),
            'slot' => null,
        ]);

        $about = $this->cleanArray($data['about'] ?? []);
        $highlights = $this->cleanArray($data['highlights'] ?? []);
        $specs = $this->cleanSpecs($data['specs'] ?? []);

        if ($about || $highlights || $specs) {
            ProductDetail::create([
                'product_id' => $id,
                'about' => $about,
                'highlights' => $highlights,
                'specs' => $specs,
            ]);
        }

        return $product;
    }
}
