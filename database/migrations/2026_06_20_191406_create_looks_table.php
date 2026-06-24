<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('looks', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('event');
            $table->json('tags')->nullable();
            $table->string('hero_slot')->nullable();
            $table->text('hero_img')->nullable();
            $table->text('style_notes')->nullable();
            $table->json('palette')->nullable();
            $table->json('products');
            $table->json('grid_items')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('looks');
    }
};
