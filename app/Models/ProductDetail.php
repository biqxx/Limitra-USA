<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductDetail extends Model
{
    protected $fillable = ['product_id','about','highlights','specs'];
    protected $casts = ['about' => 'array', 'highlights' => 'array', 'specs' => 'array'];

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
}
