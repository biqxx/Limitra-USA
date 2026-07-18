<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Guide extends Model
{
    protected $fillable = ['slug','tag','title','excerpt','img','read_time','slot','featured','sort_order'];
    protected $casts = ['featured' => 'boolean'];
}
