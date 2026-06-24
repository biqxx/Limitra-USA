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
        Schema::create('products', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name');
            $table->string('brand');
            $table->string('price');
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('subcategory_id')->nullable()->constrained()->nullOnDelete();
            $table->string('retailer')->nullable();
            $table->text('affiliate_url')->nullable();
            $table->text('image')->nullable();
            $table->string('slot')->nullable();
            $table->text('description')->nullable();
            $table->text('editor_note')->nullable();
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_resort')->default(false);
            $table->boolean('is_new')->default(false);
            $table->string('badge')->nullable();
            $table->decimal('rating', 3, 1)->nullable();
            $table->integer('days_ago')->default(0);
            $table->json('tags')->nullable();
            $table->json('related_products')->nullable();
            $table->json('features')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
