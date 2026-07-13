<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ArticleView extends Model
{
    protected $fillable = ['article_id', 'source_page', 'device'];

    public function article()
    {
        return $this->belongsTo(Article::class);
    }
}
