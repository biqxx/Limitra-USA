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
        Schema::create('static_pages', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->string('title');
            $table->string('eyebrow')->nullable();
            $table->string('headline');
            $table->text('lead')->nullable();
            $table->text('hero_img')->nullable();
            $table->json('sections')->nullable();
            $table->text('note')->nullable();
            $table->string('cta_text')->nullable();
            $table->string('cta_href')->nullable();
            $table->boolean('has_form')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('static_pages');
    }
};
