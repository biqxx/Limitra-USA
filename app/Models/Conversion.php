<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Conversion extends Model
{
    protected $fillable = [
        'click_id', 'product_id', 'retailer_id', 'order_date',
        'units', 'sale_amount', 'commission_amount', 'status',
    ];

    protected $casts = [
        'order_date' => 'date',
        'sale_amount' => 'decimal:2',
        'commission_amount' => 'decimal:2',
    ];

    public function click()
    {
        return $this->belongsTo(Click::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function retailer()
    {
        return $this->belongsTo(Retailer::class);
    }
}
