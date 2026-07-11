<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use App\Models\Retailer;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Builds the Admin Analytics Dashboard payload.
 *
 * Every widget method below is a placeholder — clicks/conversions have no
 * real rows yet — but each is documented with the query it will become once
 * they do. The numbers are deterministic (seeded by date/product/category/
 * retailer) so a reload doesn't jump around, and they're layered on the real
 * product/category/retailer catalog so the dashboard reads like this store.
 * Swap a method's body for the real query; the return shape is the contract
 * the frontend already relies on, so nothing else needs to change.
 */
class AnalyticsService
{
    public function summary(int $days): array
    {
        $days = max(1, min(90, $days));

        return [
            'range' => $days,
            'kpis' => $this->kpis($days),
            'salesTrend' => $this->salesTrend($days),
            'salesByCategory' => $this->salesByCategory($days),
            'retailerRatio' => $this->retailerRatio($days),
            'topProducts' => $this->topProducts($days),
            'clicksByDevice' => $this->clicksByDevice($days),
            'topSourcePages' => $this->topSourcePages($days),
        ];
    }

    // ── Placeholder helpers ─────────────────────────────────────

    /** Stable pseudo-random float in [0, 1) for a given seed string. */
    private function rand(string $seed): float
    {
        return hexdec(substr(md5($seed), 0, 8)) / 0xFFFFFFFF;
    }

    private function between(string $seed, float $min, float $max): float
    {
        return $min + $this->rand($seed) * ($max - $min);
    }

    private function categories(): Collection
    {
        return Category::orderBy('sort_order')->get(['id', 'name']);
    }

    private function retailers(): Collection
    {
        return Retailer::orderBy('name')->get(['id', 'name']);
    }

    private function catalogSample(int $limit = 60): Collection
    {
        return Product::with('category')
            ->whereNotNull('retailer_id')
            ->orderBy('id')
            ->limit($limit)
            ->get();
    }

    /**
     * SQL: SELECT DATE(created_at) d, COUNT(*) clicks FROM clicks
     *      WHERE created_at >= NOW() - INTERVAL ? DAY GROUP BY d
     * (joined conceptually with the equivalent per-day conversions query) —
     * this is the shared daily series every widget below slices from, so
     * clicks/orders/sales/commission stay internally consistent everywhere.
     */
    private function dailySeries(int $days): array
    {
        $out = [];
        $today = Carbon::today();

        for ($i = $days - 1; $i >= 0; $i--) {
            $date = $today->copy()->subDays($i);
            $key = $date->toDateString();

            $clicks = (int) round($this->between("clicks:$key", 90, 260));
            $convRate = $this->between("convrate:$key", 0.018, 0.055);
            $orders = (int) round($clicks * $convRate);
            $aov = $this->between("aov:$key", 55, 190);
            $sale = round($orders * $aov, 2);
            $commissionRate = $this->between("comm:$key", 0.05, 0.12);
            $commission = round($sale * $commissionRate, 2);

            // Split the day's commission across the pipeline: older days have
            // had more time to settle toward confirmed/paid, recent days are
            // still mostly pending. Reversed is a flat risk slice regardless
            // of age (returns/fraud), consistent across the whole range.
            $reversedShare = $this->between("rev:$key", 0.02, 0.07);
            $settledShare = min(0.92, 0.15 + $i * 0.03);
            $paidShare = max(0, $settledShare - 0.25);
            $confirmedShare = max(0, $settledShare - $paidShare);
            $pendingShare = max(0, 1 - $settledShare - $reversedShare);

            $out[] = [
                'date' => $key,
                'clicks' => $clicks,
                'orders' => $orders,
                'sale_amount' => $sale,
                'commission_amount' => $commission,
                'pending' => round($commission * $pendingShare, 2),
                'confirmed' => round($commission * $confirmedShare, 2),
                'paid' => round($commission * $paidShare, 2),
                'reversed' => round($commission * $reversedShare, 2),
            ];
        }

        return $out;
    }

    /**
     * SQL:
     *   SELECT COUNT(*) FROM clicks WHERE created_at >= NOW() - INTERVAL ? DAY;
     *   SELECT COUNT(*), SUM(sale_amount), SUM(commission_amount) FROM conversions
     *     WHERE order_date >= NOW() - INTERVAL ? DAY AND status != 'reversed';
     *   SELECT status, SUM(commission_amount) FROM conversions
     *     WHERE order_date >= NOW() - INTERVAL ? DAY GROUP BY status
     *     (feeds reversal_rate/settled_rate — the only two places this
     *     query's reversed slice is surfaced, now that there's no dedicated
     *     pipeline widget).
     */
    private function kpis(int $days): array
    {
        $rows = $this->dailySeries($days);

        $clicks = array_sum(array_column($rows, 'clicks'));
        $orders = array_sum(array_column($rows, 'orders'));
        $sales = array_sum(array_column($rows, 'sale_amount'));
        $commission = array_sum(array_column($rows, 'commission_amount'));

        $pending = array_sum(array_column($rows, 'pending'));
        $confirmed = array_sum(array_column($rows, 'confirmed'));
        $paid = array_sum(array_column($rows, 'paid'));
        $reversed = array_sum(array_column($rows, 'reversed'));
        $grossCommission = $pending + $confirmed + $paid + $reversed;

        return [
            'clicks' => $clicks,
            'orders' => $orders,
            'conversion_rate' => $clicks > 0 ? round($orders / $clicks * 100, 2) : 0.0,
            'sales_volume' => round($sales, 2),
            'commission_earned' => round($commission, 2),
            'epc' => $clicks > 0 ? round($commission / $clicks, 2) : 0.0,
            'aov' => $orders > 0 ? round($sales / $orders, 2) : 0.0,
            'reversal_rate' => $grossCommission > 0 ? round($reversed / $grossCommission * 100, 1) : 0.0,
            'settled_rate' => $grossCommission > 0 ? round(($paid + $confirmed) / $grossCommission * 100, 1) : 0.0,
            'hasData' => $clicks > 0,
        ];
    }

    /**
     * SQL: SELECT order_date, SUM(sale_amount) FROM conversions
     *      WHERE order_date >= NOW() - INTERVAL ? DAY AND status != 'reversed'
     *      GROUP BY order_date ORDER BY order_date
     * Plus a trailing 7-day moving average computed here over that series,
     * and a % change against the immediately preceding period of equal length.
     */
    private function salesTrend(int $days): array
    {
        $rows = $this->dailySeries($days);
        $series = array_map(fn ($r) => ['date' => $r['date'], 'sales' => $r['sale_amount']], $rows);

        $values = array_column($series, 'sales');
        $movingAverage = [];
        foreach ($values as $i => $_) {
            $window = array_slice($values, max(0, $i - 6), min($i, 6) + 1);
            $movingAverage[] = round(array_sum($window) / count($window), 2);
        }

        $currentTotal = array_sum($values);
        $priorRows = $this->dailySeries($days * 2);
        $priorTotal = array_sum(array_column(array_slice($priorRows, 0, $days), 'sale_amount'));
        $changePct = $priorTotal > 0 ? round((($currentTotal - $priorTotal) / $priorTotal) * 100, 1) : 0.0;

        return [
            'series' => $series,
            'moving_average' => $movingAverage,
            'change_pct' => $changePct,
            'hasData' => $currentTotal > 0,
        ];
    }

    /**
     * SQL: SELECT c.name, SUM(cv.sale_amount) FROM conversions cv
     *      JOIN products p ON p.id = cv.product_id
     *      JOIN categories c ON c.id = p.category_id
     *      WHERE cv.order_date >= NOW() - INTERVAL ? DAY AND cv.status != 'reversed'
     *      GROUP BY c.name ORDER BY 2 DESC
     */
    private function salesByCategory(int $days): array
    {
        $categories = $this->categories();
        if ($categories->isEmpty()) {
            return ['items' => [], 'top_category' => null, 'hasData' => false];
        }

        $totalSales = $this->kpis($days)['sales_volume'];
        $weights = $categories->mapWithKeys(fn ($c) => [$c->id => $this->between("cat:{$c->id}:$days", 0.4, 1.6)]);
        $weightSum = $weights->sum();

        $items = $categories->map(function ($c) use ($weights, $weightSum, $totalSales) {
            $share = $weightSum > 0 ? $weights[$c->id] / $weightSum : 0;
            return [
                'category' => $c->name,
                'sales' => round($totalSales * $share, 2),
            ];
        })->sortByDesc('sales')->values();

        return [
            'items' => $items->all(),
            'top_category' => $items->first()['category'] ?? null,
            'hasData' => $totalSales > 0,
        ];
    }

    /**
     * SQL: SELECT r.name, SUM(cv.sale_amount) FROM conversions cv
     *      JOIN retailers r ON r.id = cv.retailer_id
     *      WHERE cv.order_date >= NOW() - INTERVAL ? DAY AND cv.status != 'reversed'
     *      GROUP BY r.name
     */
    private function retailerRatio(int $days): array
    {
        $retailers = $this->retailers();
        if ($retailers->isEmpty()) {
            return ['items' => [], 'hasData' => false];
        }

        $totalSales = $this->kpis($days)['sales_volume'];
        $weights = $retailers->mapWithKeys(fn ($r) => [$r->id => $this->between("ret:{$r->id}:$days", 0.3, 1.7)]);
        $weightSum = $weights->sum();

        $items = $retailers->map(function ($r) use ($weights, $weightSum, $totalSales) {
            $share = $weightSum > 0 ? $weights[$r->id] / $weightSum : 0;
            return [
                'retailer' => $r->name,
                'sales' => round($totalSales * $share, 2),
                'pct' => round($share * 100, 1),
            ];
        })->sortByDesc('sales')->values();

        return [
            'items' => $items->all(),
            'hasData' => $totalSales > 0,
        ];
    }

    /**
     * SQL: SELECT p.*, SUM(cv.units) units, SUM(cv.sale_amount) sales,
     *        SUM(cv.commission_amount) commission
     *      FROM conversions cv JOIN products p ON p.id = cv.product_id
     *      WHERE cv.order_date >= NOW() - INTERVAL ? DAY AND cv.status != 'reversed'
     *      GROUP BY p.id ORDER BY units DESC LIMIT 5
     */
    private function topProducts(int $days): array
    {
        $products = $this->catalogSample();
        if ($products->isEmpty()) {
            return ['items' => [], 'hasData' => false];
        }

        $items = $products->map(function ($p) use ($days) {
            $units = (int) round($this->between("units:{$p->id}:$days", 4, 60) * ($days / 30));
            $unitPrice = $this->between("price:{$p->id}", 40, 320);
            $sales = round($units * $unitPrice, 2);
            $commission = round($sales * $this->between("prodcomm:{$p->id}", 0.05, 0.12), 2);

            return [
                'id' => $p->id,
                'name' => $p->name,
                'brand' => $p->brand,
                'image' => $p->image,
                'category' => $p->category?->name,
                'retailer' => $p->retailer,
                'units' => max(1, $units),
                'sales' => $sales,
                'commission' => $commission,
            ];
        })->sortByDesc('units')->take(5)->values();

        return [
            'items' => $items->all(),
            'hasData' => $items->isNotEmpty(),
        ];
    }

    /**
     * SQL: SELECT device, COUNT(*) FROM clicks
     *      WHERE created_at >= NOW() - INTERVAL ? DAY GROUP BY device ORDER BY 2 DESC
     */
    private function clicksByDevice(int $days): array
    {
        $totalClicks = $this->kpis($days)['clicks'];
        if ($totalClicks <= 0) {
            return ['items' => [], 'hasData' => false];
        }

        $devices = ['Mobile', 'Desktop', 'Tablet'];
        $weights = collect($devices)->mapWithKeys(fn ($d) => [$d => $this->between("device:$d:$days", 0.5, 1.6)]);
        $weightSum = $weights->sum();

        $items = collect($devices)->map(function ($d) use ($weights, $weightSum, $totalClicks) {
            $share = $weightSum > 0 ? $weights[$d] / $weightSum : 0;
            $clicks = (int) round($totalClicks * $share);
            return ['device' => $d, 'clicks' => $clicks, 'pct' => round($share * 100, 1)];
        })->sortByDesc('clicks')->values();

        return ['items' => $items->all(), 'hasData' => true];
    }

    /**
     * SQL: SELECT source_page, COUNT(*) clicks FROM clicks
     *      WHERE created_at >= NOW() - INTERVAL ? DAY
     *      GROUP BY source_page ORDER BY clicks DESC LIMIT 5
     */
    private function topSourcePages(int $days): array
    {
        $totalClicks = $this->kpis($days)['clicks'];
        if ($totalClicks <= 0) {
            return ['items' => [], 'hasData' => false];
        }

        $pages = ['/', '/category/women', '/category/men', '/looks', '/guides', '/collection/new', '/collection/trending', '/collection/gifts'];
        $weights = collect($pages)->mapWithKeys(fn ($p) => [$p => $this->between("page:$p:$days", 0.3, 1.8)]);
        $weightSum = $weights->sum();

        $items = collect($pages)->map(function ($p) use ($weights, $weightSum, $totalClicks) {
            $share = $weightSum > 0 ? $weights[$p] / $weightSum : 0;
            $clicks = (int) round($totalClicks * $share);
            return ['page' => $p, 'clicks' => $clicks, 'pct' => round($share * 100, 1)];
        })->sortByDesc('clicks')->take(5)->values();

        return ['items' => $items->all(), 'hasData' => true];
    }
}
