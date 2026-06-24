<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Models\Video;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('app:seed-video-products')]
#[Description('Assign random products to every video for testing')]
class SeedVideoProducts extends Command
{
    public function handle()
    {
        $productIds = Product::pluck('id')->toArray();

        if (empty($productIds)) {
            $this->error('No products found.');
            return 1;
        }

        Video::all()->each(function (Video $video) use ($productIds) {
            shuffle($productIds);
            $pick = array_slice($productIds, 0, 4);
            $video->products = $pick;
            $video->save();
            $this->line($video->id . ' "' . $video->title . '" => [' . implode(', ', $pick) . ']');
        });

        $this->info('Done.');
        return 0;
    }
}
