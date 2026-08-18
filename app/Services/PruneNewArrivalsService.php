<?php

namespace App\Services;

use App\Models\Product;
use App\Models\SiteSetting;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class PruneNewArrivalsService
{
    /**
     * Removes the 'is_new' flag, 'New' badge, and 'new' tag from products created
     * longer ago than the configured New TTL (in days).
     *
     * @param int|null $overrideTtlDays Optional TTL in days to override site settings.
     * @return int Number of products updated.
     */
    public function prune(?int $overrideTtlDays = null): int
    {
        $ttlDays = $overrideTtlDays ?? (int) SiteSetting::getValue('new_ttl_days', '307');
        if ($ttlDays <= 0) {
            $ttlDays = 30;
        }

        $cutoff = Carbon::now()->subDays($ttlDays);

        // Find products created on or before the cutoff date that still carry any "new" attribute
        $products = Product::where('created_at', '<=', $cutoff)
            ->where(function ($q) {
                $q->where('is_new', true)
                  ->orWhereJsonContains('tags', 'new')
                  ->orWhere('badge', 'like', '%new%');
            })
            ->get();

        $updatedCount = 0;

        foreach ($products as $product) {
            $changed = false;

            // 1. Reset is_new boolean flag
            if ($product->is_new) {
                $product->is_new = false;
                $changed = true;
            }

            // 2. Remove 'new' (case-insensitive) from tags array if present
            if (is_array($product->tags) && !empty($product->tags)) {
                $filteredTags = array_values(array_filter(
                    $product->tags,
                    fn ($tag) => is_string($tag) && strtolower(trim($tag)) !== 'new'
                ));

                if (count($filteredTags) !== count($product->tags)) {
                    $product->tags = $filteredTags;
                    $changed = true;
                }
            }

            // 3. Clear badge if it equals 'New' (case-insensitive)
            if (!empty($product->badge) && strtolower(trim($product->badge)) === 'new') {
                $product->badge = null;
                $changed = true;
            }

            if ($changed) {
                $product->save();
                $updatedCount++;
            }
        }

        Log::info("[PruneNewArrivals] Pruned 'new' status from {$updatedCount} products created before {$cutoff->toDateTimeString()} (TTL: {$ttlDays} days).");

        return $updatedCount;
    }
}
