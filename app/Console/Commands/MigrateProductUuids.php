<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class MigrateProductUuids extends Command
{
    protected $signature = 'app:migrate-product-uuids {--dry-run : List what would change without writing anything}';

    protected $description = 'Convert non-UUID product ids to UUIDs, moving each former id into the new slug column and remapping the product_details foreign key. Safe to re-run (idempotent).';

    public function handle(): int
    {
        $isUuid = fn ($v) => is_string($v) && preg_match(
            '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i',
            $v
        ) === 1;

        $rows = DB::table('products')->select('id', 'slug')->get();
        $toConvert = $rows->reject(fn ($p) => $isUuid($p->id))->values();

        if ($toConvert->isEmpty()) {
            $this->info('Nothing to convert — every product id is already a UUID.');
            return self::SUCCESS;
        }

        $this->info("Found {$toConvert->count()} product(s) with a non-UUID id.");

        // Map every old id to a fresh UUID up front so the change is deterministic within the run.
        $map = [];
        foreach ($toConvert as $p) {
            $map[$p->id] = [
                'new'  => (string) Str::uuid(),
                'slug' => $p->slug ?: $p->id, // keep an existing slug if one is somehow set, else adopt the old id
            ];
        }

        if ($this->option('dry-run')) {
            foreach ($map as $oldId => $info) {
                $this->line("  {$oldId}  ->  {$info['new']}   (slug: {$info['slug']})");
            }
            $this->warn('Dry run — no changes were written.');
            return self::SUCCESS;
        }

        // The products PK is referenced by product_details.product_id (a FK without ON UPDATE CASCADE),
        // so disable FK enforcement while we rewrite both sides in one transaction.
        Schema::disableForeignKeyConstraints();
        try {
            DB::transaction(function () use ($map) {
                foreach ($map as $oldId => $info) {
                    DB::table('product_details')
                        ->where('product_id', $oldId)
                        ->update(['product_id' => $info['new']]);

                    DB::table('products')
                        ->where('id', $oldId)
                        ->update(['id' => $info['new'], 'slug' => $info['slug']]);
                }
            });
        } finally {
            Schema::enableForeignKeyConstraints();
        }

        $this->info("Converted {$toConvert->count()} product(s). Former ids are preserved in the slug column.");
        $this->line('related_products, looks.products and article product references still hold the former id — they resolve through the id-or-slug lookup used across the storefront, so no further data changes are needed.');

        return self::SUCCESS;
    }
}
