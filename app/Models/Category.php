<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    protected $fillable = ['name','slug','count','desc','tagline','img','feature_img','feature_img2','banner_img','slot','feature_slot','banner_slot','sort_order'];

    public function subcategories()
    {
        return $this->hasMany(Subcategory::class)->orderBy('sort_order');
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }

    public function getSubsAttribute()
    {
        return $this->subcategories->pluck('name');
    }
}
