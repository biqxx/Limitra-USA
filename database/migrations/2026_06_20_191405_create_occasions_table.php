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
        Schema::create('occasions', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('title');
            $table->string('eyebrow')->nullable();
            $table->text('tagline')->nullable();
            $table->string('badge')->nullable();
            $table->text('img')->nullable();
            $table->string('link')->nullable();
            $table->boolean('featured')->default(false);
            $table->boolean('is_hero')->default(false);
            $table->string('color')->nullable();
            $table->string('accent')->nullable();
            $table->json('subcats')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('occasions');
    }
};
