<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Retailer;
use Illuminate\Database\Seeder;

class RetailerSeeder extends Seeder
{
    /**
     * Seed one Retailer per distinct retailer name already used on products,
     * then backfill products.retailer_id to point at it.
     */
    public function run(): void
    {
        $names = Product::whereNotNull('retailer')->where('retailer', '!=', '')
            ->distinct()->pluck('retailer');

        foreach ($names as $name) {
            $retailer = Retailer::firstOrCreate(['name' => $name]);
            Product::where('retailer', $name)->update(['retailer_id' => $retailer->id]);
        }
    }
}
