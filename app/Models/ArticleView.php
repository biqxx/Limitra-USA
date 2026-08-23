<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ArticleView extends Model
{
    protected $fillable = ['article_id', 'source_page', 'device', 'visitor_hash', 'view_date', 'dedupe_key'];

    public function article()
    {
        return $this->belongsTo(Article::class);
    }
}
