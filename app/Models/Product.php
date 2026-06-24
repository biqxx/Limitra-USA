<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['id','name','brand','price','category_id','subcategory_id','retailer','affiliate_url','image','slot','description','editor_note','is_featured','is_resort','is_new','badge','rating','days_ago','tags','related_products','features'];

    protected $casts = [
        'tags' => 'array',
        'related_products' => 'array',
        'features' => 'array',
        'is_featured' => 'boolean',
        'is_resort' => 'boolean',
        'is_new' => 'boolean',
    ];

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

    public function toFrontend(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'brand' => $this->brand,
            'price' => $this->price,
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
