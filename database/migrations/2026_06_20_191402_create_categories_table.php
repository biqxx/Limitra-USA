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
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('count')->nullable();
            $table->string('desc')->nullable();
            $table->string('tagline')->nullable();
            $table->text('img')->nullable();
            $table->text('feature_img')->nullable();
            $table->text('feature_img2')->nullable();
            $table->text('banner_img')->nullable();
            $table->string('slot')->nullable();
            $table->string('feature_slot')->nullable();
            $table->string('banner_slot')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
