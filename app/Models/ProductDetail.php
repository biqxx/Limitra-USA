<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductDetail extends Model
{
    protected $fillable = ['product_id','about','highlights','specs','available_options'];
    protected $casts = ['about' => 'array', 'highlights' => 'array', 'specs' => 'array', 'available_options' => 'array'];

    protected static function booted(): void
    {
        static::saved(fn () => Product::invalidatePublicCatalogCache());
        static::deleted(fn () => Product::invalidatePublicCatalogCache());
    }

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
}
