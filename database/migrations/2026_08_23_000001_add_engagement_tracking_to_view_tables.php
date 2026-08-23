<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['product_views', 'article_views', 'video_views'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                $table->string('visitor_hash', 64)->nullable()->after('device');
                $table->date('view_date')->nullable()->after('visitor_hash');
                $table->string('dedupe_key', 64)->nullable()->unique()->after('view_date');
                $table->index('view_date');
            });
        }
    }

    public function down(): void
    {
        foreach (['product_views', 'article_views', 'video_views'] as $tableName) {
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                $table->dropUnique([$tableName . '_dedupe_key_unique']);
                $table->dropIndex([$tableName . '_view_date_index']);
                $table->dropColumn(['visitor_hash', 'view_date', 'dedupe_key']);
            });
        }
    }
};
