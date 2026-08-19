<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('product_views');

        Schema::create('product_views', function (Blueprint $table) {
            $table->id();
            $table->string('product_id');
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
            $table->string('source_page')->nullable();
            $table->string('device', 20)->nullable();
            $table->timestamps();

            $table->index(['product_id', 'created_at']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_views');
    }
};
