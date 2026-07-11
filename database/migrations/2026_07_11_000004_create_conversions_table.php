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
        Schema::create('conversions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('click_id')->nullable()->constrained('clicks')->nullOnDelete();
            $table->string('product_id');
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
            $table->foreignId('retailer_id')->constrained('retailers')->cascadeOnDelete();
            $table->date('order_date');
            $table->unsignedInteger('units')->default(1);
            $table->decimal('sale_amount', 10, 2);
            $table->decimal('commission_amount', 10, 2);
            $table->string('status')->default('pending'); // pending|confirmed|paid|reversed
            $table->timestamps();

            $table->index('status');
            $table->index('order_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('conversions');
    }
};
