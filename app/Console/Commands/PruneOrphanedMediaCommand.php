<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class PruneOrphanedMediaCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'media:prune-orphans
                            {--dry-run : Report orphaned files without deleting them}
                            {--force : Force deletion without interactive prompt}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Delete uploaded images and videos from storage that are no longer referenced in the database';

    /**
     * Tables and columns that store media file paths or URLs (including JSON columns).
     */
    private const TARGETS = [
        'categories' => ['img', 'feature_img', 'feature_img2', 'banner_img'],
        'products' => ['image'],
        'articles' => ['img', 'body'],
        'occasions' => ['img'],
        'looks' => ['hero_img', 'grid_items'],
        'videos' => ['thumb', 'video_url'],
        'guides' => ['img', 'sections'],
        'static_pages' => ['hero_img', 'sections'],
        'site_settings' => ['value'],
    ];

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $force = (bool) $this->option('force');

        $this->info('Scanning database for active media references...');
        $referencedPaths = $this->getReferencedPaths();
        $this->info('Found ' . count($referencedPaths) . ' active media references in DB.');

        $this->info('Scanning public storage disk for files...');
        $disk = Storage::disk('public');
        $allFiles = $disk->allFiles();

        $orphanedFiles = [];
        $totalBytes = 0;

        foreach ($allFiles as $file) {
            $filename = basename($file);
            // Ignore hidden system files like .gitignore or .DS_Store
            if (Str::startsWith($filename, '.')) {
                continue;
            }

            $normalizedFile = ltrim(str_replace('\\', '/', $file), '/');

            if (! $this->isReferenced($normalizedFile, $referencedPaths)) {
                $bytes = $disk->exists($file) ? $disk->size($file) : 0;
                $orphanedFiles[] = [
                    'path' => $file,
                    'bytes' => $bytes,
                ];
                $totalBytes += $bytes;
            }
        }

        if (empty($orphanedFiles)) {
            $this->info('No orphaned media files found. Storage is completely clean!');
            return Command::SUCCESS;
        }

        $formattedSize = $this->formatBytes($totalBytes);
        $count = count($orphanedFiles);

        $this->warn("Found {$count} orphaned file(s) occupying {$formattedSize}.");

        if ($dryRun) {
            $this->table(
                ['Orphaned File Path', 'Size'],
                array_map(fn ($item) => [$item['path'], $this->formatBytes($item['bytes'])], $orphanedFiles)
            );
            $this->info('Dry run completed. No files were deleted.');
            return Command::SUCCESS;
        }

        if (! $force && ! $this->confirm("Do you want to permanently delete these {$count} orphaned file(s)?")) {
            $this->info('Operation cancelled.');
            return Command::SUCCESS;
        }

        $deletedCount = 0;
        $deletedBytes = 0;

        foreach ($orphanedFiles as $item) {
            if ($disk->delete($item['path'])) {
                $deletedCount++;
                $deletedBytes += $item['bytes'];
            }
        }

        $freedSize = $this->formatBytes($deletedBytes);
        $this->info("Successfully deleted {$deletedCount} orphaned file(s) freeing {$freedSize} of disk space.");

        return Command::SUCCESS;
    }

    /**
     * Extracts all file path references from the configured database columns.
     */
    private function getReferencedPaths(): array
    {
        $paths = [];

        foreach (self::TARGETS as $table => $columns) {
            if (! DB::getSchemaBuilder()->hasTable($table)) {
                continue;
            }

            foreach (DB::table($table)->select($columns)->get() as $row) {
                foreach ($columns as $column) {
                    $value = $row->{$column};
                    if ($value === null || $value === '') {
                        continue;
                    }

                    if (is_string($value)) {
                        // Extract any storage path references like /storage/images/xyz.jpg or images/xyz.jpg
                        preg_match_all('#(?:/storage/|storage/|^|/)([\w\-\./]+\.(?:jpe?g|png|gif|webp|svg|mp4|webm|ogg|mov|avi))#i', $value, $matches);
                        if (! empty($matches[1])) {
                            foreach ($matches[1] as $match) {
                                $cleanPath = ltrim(str_replace('\\', '/', $match), '/');
                                $paths[$cleanPath] = true;
                            }
                        }
                    }
                }
            }
        }

        return array_keys($paths);
    }

    /**
     * Checks if a file path on disk matches any referenced path from the database.
     */
    private function isReferenced(string $file, array $referencedPaths): bool
    {
        $normalizedFile = ltrim(str_replace('\\', '/', $file), '/');

        foreach ($referencedPaths as $ref) {
            if ($ref === $normalizedFile || Str::endsWith($ref, $normalizedFile) || Str::endsWith($normalizedFile, $ref)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Formats bytes into a human-readable size string.
     */
    private function formatBytes(int $bytes): string
    {
        if ($bytes >= 1048576) {
            return round($bytes / 1048576, 2) . ' MB';
        }
        if ($bytes >= 1024) {
            return round($bytes / 1024, 2) . ' KB';
        }
        return $bytes . ' Bytes';
    }
}
