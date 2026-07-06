<?php

namespace App\Jobs;

use App\Models\BulkImportBatch;
use App\Services\BulkImportService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessBulkImport implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public function __construct(
        public int $batchId,
        public string $type,
        public array $items,
    ) {}

    public function handle(BulkImportService $service): void
    {
        $batch = BulkImportBatch::find($this->batchId);
        if (!$batch) {
            return;
        }

        try {
            $result = $service->import($this->type, $this->items);
            $batch->update([
                'status' => 'completed',
                'created_count' => $result['created'],
                'updated_count' => $result['updated'],
                'skipped_count' => $result['skipped'],
                'errors' => $result['errors'],
            ]);
        } catch (\Throwable $e) {
            $batch->update([
                'status' => 'failed',
                'errors' => [['row' => null, 'summary' => 'Import crashed', 'message' => $e->getMessage()]],
            ]);
        }
    }
}
