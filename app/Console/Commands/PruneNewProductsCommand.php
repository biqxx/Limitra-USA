<?php

namespace App\Console\Commands;

use App\Services\PruneNewArrivalsService;
use Illuminate\Console\Command;

class PruneNewProductsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'products:prune-new {--days= : Override TTL in days}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Remove is_new flag, New badge, and new tags from products older than the configured TTL days';

    /**
     * Execute the console command.
     */
    public function handle(PruneNewArrivalsService $service): int
    {
        $days = $this->option('days') ? (int) $this->option('days') : null;

        $this->info('Starting pruning of expired new products...');
        $count = $service->prune($days);
        $this->info("Successfully pruned {$count} product(s).");

        return Command::SUCCESS;
    }
}
