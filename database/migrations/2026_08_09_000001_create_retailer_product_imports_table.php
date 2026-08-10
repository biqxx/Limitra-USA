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
        Schema::create('retailer_product_imports', function (Blueprint $table) {
            $table->id();
            $table->string('retailer');
            $table->string('external_id')->nullable();
            $table->text('external_url');
            // Deliberately no FK constraint — this is a permanent audit log of what has
            // ever been imported, and must keep flagging a duplicate even after the
            // product it created is later edited or deleted from the live catalog.
            $table->string('product_id')->nullable();
            $table->string('imported_by')->nullable();
            $table->timestamp('imported_at')->useCurrent();
            $table->timestamps();

            $table->unique(['retailer', 'external_id']);
            $table->index(['retailer', 'external_url']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('retailer_product_imports');
    }
};
