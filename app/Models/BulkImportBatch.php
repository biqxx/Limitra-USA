<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BulkImportBatch extends Model
{
    protected $fillable = ['type', 'filename', 'status', 'total', 'created_count', 'updated_count', 'skipped_count', 'errors'];

    protected $casts = ['errors' => 'array'];
}
