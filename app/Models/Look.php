<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Look extends Model
{
    protected $fillable = ['slug','event','tags','hero_slot','hero_img','style_notes','palette','products','grid_items'];
    protected $casts = ['tags' => 'array', 'palette' => 'array', 'products' => 'array', 'grid_items' => 'array'];
    protected $appends = ['product_ids'];

    public function getProductIdsAttribute(): array
    {
        return $this->products ?? [];
    }
}
