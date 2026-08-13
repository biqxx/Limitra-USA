<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Every uploaded image/video URL was saved with an absolute domain baked in (see
 * config/filesystems.php's 'public' disk, which used to prefix APP_URL onto every
 * Storage::url() call) — so when the site's domain/IP changes, every one of those stored
 * URLs points at the old host and breaks. This rewrites every already-stored URL to be
 * root-relative ("/storage/...") instead, matching the disk config's new behavior, across
 * every column across every table that can hold an uploaded image/video URL — including
 * JSON columns, since the same string-prefix pattern shows up unchanged inside JSON text.
 */
return new class extends Migration
{
    /** [table => [column, ...]] for every column that can hold an uploaded /storage/ URL. */
    private const TARGETS = [
        'categories' => ['img', 'feature_img', 'feature_img2', 'banner_img'],
        'products' => ['image'],
        'articles' => ['img', 'body'],
        'occasions' => ['img'],
        'looks' => ['hero_img', 'grid_items'],
        'videos' => ['thumb', 'video_url'],
        'guides' => ['img', 'sections'],
        'static_pages' => ['hero_img', 'sections'],
    ];

    public function up(): void
    {
        foreach (self::TARGETS as $table => $columns) {
            if (!DB::getSchemaBuilder()->hasTable($table)) {
                continue;
            }

            foreach (DB::table($table)->select(array_merge(['id'], $columns))->get() as $row) {
                $patch = [];
                foreach ($columns as $column) {
                    $original = $row->{$column};
                    if ($original === null || $original === '') {
                        continue;
                    }
                    $fixed = $this->stripStorageDomain($original);
                    if ($fixed !== $original) {
                        $patch[$column] = $fixed;
                    }
                }
                if ($patch) {
                    DB::table($table)->where('id', $row->id)->update($patch);
                }
            }
        }
    }

    /**
     * Strips any "scheme://host" immediately preceding "/storage/" — whatever the old domain
     * actually was (an IP, a since-replaced hostname, http vs https) — leaving a root-relative
     * "/storage/..." URL. Works unchanged on JSON-column text too: it's a plain substring
     * replace across the raw value, and a URL embedded as a JSON string value has the exact
     * same "http://host/storage/..." shape as a plain string column would.
     */
    private function stripStorageDomain(string $value): string
    {
        return preg_replace('#https?://[^/\s\'"]+/storage/#', '/storage/', $value);
    }

    /**
     * Not reversible — the whole point is that the prior absolute domain shouldn't be baked
     * back into stored data at all, and there's no way to know which domain each row
     * originally had once this has run.
     */
    public function down(): void
    {
    }
};
