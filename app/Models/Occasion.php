<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Occasion extends Model
{
    protected $fillable = ['key','title','eyebrow','tagline','badge','img','link','featured','is_hero','color','accent','subcats','sort_order'];
    protected $casts = ['subcats' => 'array', 'featured' => 'boolean', 'is_hero' => 'boolean'];
}
