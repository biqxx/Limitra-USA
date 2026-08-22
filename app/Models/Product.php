<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['id','slug','name','brand','price','category_id','subcategory_id','retailer','retailer_id','affiliate_url','image','slot','description','editor_note','is_featured','is_resort','is_new','badge','rating','days_ago','tags','related_products','features'];

    protected $casts = [
        'tags' => 'array',
        'related_products' => 'array',
        'features' => 'array',
        'is_featured' => 'boolean',
        'is_resort' => 'boolean',
        'is_new' => 'boolean',
    ];

    protected static function booted(): void
    {
        static::saved(function () {
            \Illuminate\Support\Facades\Cache::forget('inertia_shared_catalog');
            static::invalidatePublicCatalogCache();
        });

        static::deleted(function () {
            \Illuminate\Support\Facades\Cache::forget('inertia_shared_catalog');
            static::invalidatePublicCatalogCache();
        });
    }

    /**
     * Public catalogue responses are keyed by this version. Bumping it means product
     * edits take effect immediately without needing to iterate through every cached page.
     */
    public static function invalidatePublicCatalogCache(): void
    {
        $key = 'public_catalog_version';
        $current = (int) \Illuminate\Support\Facades\Cache::get($key, 1);

        \Illuminate\Support\Facades\Cache::forever($key, max(1, $current + 1));
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function subcategory()
    {
        return $this->belongsTo(Subcategory::class);
    }

    public function detail()
    {
        return $this->hasOne(ProductDetail::class, 'product_id');
    }

    public function favoritedBy()
    {
        return $this->belongsToMany(User::class, 'favorite_products', 'product_id', 'user_id')
            ->withTimestamps();
    }

    /**
     * Prices are stored as free-form strings, not a decimal column — the admin form already
     * prepends "$" itself when saving unless the value already carries some other currency
     * symbol (see ProductsView.jsx's submit()). Sources that bypass that form (bulk import,
     * the ProductPicker extension, which deliberately uploads a bare stripped number) don't
     * get that treatment, so this mirrors the same rule at display time: only a purely
     * numeric price (digits/comma/dot, no symbol at all) gets "$" added.
     */
    private function displayPrice(): string
    {
        $price = trim((string) $this->price);
        return ($price !== '' && preg_match('/^[0-9.,]+$/', $price)) ? '$' . $price : $price;
    }

    public function toFrontend(): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $this->name,
            'brand' => $this->brand,
            'price' => $this->displayPrice(),
            'description' => $this->description,
            'image' => $this->image,
            'affiliate_url' => $this->affiliate_url,
            'category' => $this->category?->name,
            'category_slug' => $this->category?->slug,
            'subcategory' => $this->subcategory?->name,
            'badge' => $this->badge,
            'rating' => $this->rating,
            'features' => $this->features ?? [],
            'retailer' => $this->retailer,
            'is_featured' => $this->is_featured,
            'is_resort' => $this->is_resort,
            'is_new' => $this->is_new,
            'days_ago' => $this->days_ago,
            'tags' => $this->tags ?? [],
        ];
    }
}
