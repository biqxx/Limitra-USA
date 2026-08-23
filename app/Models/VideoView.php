<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VideoView extends Model
{
    protected $fillable = ['video_id', 'source_page', 'device', 'visitor_hash', 'view_date', 'dedupe_key'];

    public function video()
    {
        return $this->belongsTo(Video::class);
    }
}
