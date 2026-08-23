<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Diagnostic-only log for bots blocked from affiliate redirect URLs. */
class BotRedirectRequest extends Model
{
    protected $fillable = ['product_id', 'bot_name'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
