<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bot_redirect_requests', function (Blueprint $table) {
            $table->id();
            $table->string('product_id');
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
            $table->string('bot_name', 80);
            $table->timestamps();

            $table->index(['bot_name', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bot_redirect_requests');
    }
};
