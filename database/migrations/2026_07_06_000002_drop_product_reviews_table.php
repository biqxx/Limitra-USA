<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('product_reviews');
    }

    public function down(): void
    {
        // The product reviews feature was removed; nothing to restore.
    }
};
