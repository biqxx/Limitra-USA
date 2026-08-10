<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RetailerProductImport extends Model
{
    protected $fillable = ['retailer', 'external_id', 'external_url', 'product_id', 'imported_by', 'imported_at'];

    protected $casts = ['imported_at' => 'datetime'];
}
