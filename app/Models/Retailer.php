<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Retailer extends Model
{
    protected $fillable = ['name', 'network'];

    public function conversions()
    {
        return $this->hasMany(Conversion::class);
    }
}
