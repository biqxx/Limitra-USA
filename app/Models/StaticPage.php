<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StaticPage extends Model
{
    protected $fillable = [
        'key', 'title', 'eyebrow', 'headline', 'lead', 'hero_img',
        'sections', 'note', 'cta_text', 'cta_href', 'has_form',
    ];

    protected $casts = [
        'sections' => 'array',
        'has_form' => 'boolean',
    ];
}
