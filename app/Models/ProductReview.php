<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductReview extends Model
{
    protected $fillable = ['product_id','reviewer_name','rating','date','title','body','verified'];
    protected $casts = ['verified' => 'boolean'];
}
