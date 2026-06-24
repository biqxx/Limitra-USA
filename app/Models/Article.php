<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Article extends Model
{
    protected $fillable = ['slug','tag','category','title','excerpt','date','author','read_time','img','featured','body'];
    protected $casts = ['body' => 'array', 'featured' => 'boolean'];
}
