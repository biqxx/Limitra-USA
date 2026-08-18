<?php

use App\Console\Commands\PruneNewProductsCommand;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Run product TTL pruning every 24 hours
Schedule::command(PruneNewProductsCommand::class)->daily();
