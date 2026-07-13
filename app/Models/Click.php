<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Click extends Model
{
    protected $fillable = ['product_id', 'source_page', 'device', 'sub_id'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function conversions()
    {
        return $this->hasMany(Conversion::class);
    }
}
