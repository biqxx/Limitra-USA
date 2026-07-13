<?php

namespace App\Services;

use App\Models\ArticleView;
use App\Models\Click;
use App\Models\Conversion;
use App\Models\VideoView;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Builds the Admin Analytics Dashboard payload from real clicks/conversions/
 * article_views/video_views. Every widget's `hasData` flag reflects whether
 * that query actually returned rows — until real traffic/imports accumulate,
 * widgets correctly show their "No conversions yet in this range" state
 * instead of fabricating numbers.
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
            'topArticles' => $this->topArticles($days),
            'topVideos' => $this->topVideos($days),
        ];
    }

    private function since(int $days): Carbon
    {
        return Carbon::today()->subDays($days - 1)->startOfDay();
    }

    /**
     * SQL: SELECT DATE(created_at) d, COUNT(*) clicks FROM clicks
     *        WHERE created_at >= NOW() - INTERVAL ? DAY GROUP BY d;
     *      SELECT order_date d, status, COUNT(*) orders, SUM(sale_amount), SUM(commission_amount)
     *        FROM conversions WHERE order_date >= NOW() - INTERVAL ? DAY GROUP BY d, status
     * The shared daily series every other widget slices from, so clicks/
     * orders/sales/commission stay internally consistent everywhere.
     */
    private function dailySeries(int $days): array
    {
        $since = $this->since($days);
        $sinceDate = $since->toDateString();

        $clicksByDay = Click::where('created_at', '>=', $since)
            ->selectRaw('DATE(created_at) as d, COUNT(*) as c')
            ->groupBy('d')
            ->pluck('c', 'd');

        // order_date is a DATE column, but Eloquent's `date` cast doesn't
        // truncate the time component on save — normalize with DATE() so
        // rows group by calendar day regardless of what got stored.
        $conversionsByDay = Conversion::where('order_date', '>=', $sinceDate)
            ->selectRaw('DATE(order_date) as d, status, COUNT(*) as orders, SUM(sale_amount) as sale_amount, SUM(commission_amount) as commission_amount')
            ->groupBy(DB::raw('DATE(order_date)'), 'status')
            ->get()
            ->groupBy('d');

        $out = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $key = Carbon::today()->subDays($i)->toDateString();

            $dayRows = $conversionsByDay->get($key, collect());
            $nonReversed = $dayRows->whereNotIn('status', ['reversed']);
            $byStatus = $dayRows->keyBy('status');

            $out[] = [
                'date' => $key,
                'clicks' => (int) ($clicksByDay[$key] ?? 0),
                'orders' => (int) $nonReversed->sum('orders'),
                'sale_amount' => (float) $nonReversed->sum('sale_amount'),
                'commission_amount' => (float) $nonReversed->sum('commission_amount'),
                'pending' => (float) ($byStatus->get('pending')->commission_amount ?? 0),
                'confirmed' => (float) ($byStatus->get('confirmed')->commission_amount ?? 0),
                'paid' => (float) ($byStatus->get('paid')->commission_amount ?? 0),
                'reversed' => (float) ($byStatus->get('reversed')->commission_amount ?? 0),
            ];
        }

        return $out;
    }

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
     * Daily sales series (from dailySeries) plus a trailing 7-day moving
     * average, and a % change against the immediately preceding period.
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
        $rows = Conversion::query()
            ->join('products', 'products.id', '=', 'conversions.product_id')
            ->join('categories', 'categories.id', '=', 'products.category_id')
            ->where('conversions.order_date', '>=', $this->since($days)->toDateString())
            ->where('conversions.status', '!=', 'reversed')
            ->selectRaw('categories.name as category, SUM(conversions.sale_amount) as sales')
            ->groupBy('categories.name')
            ->orderByDesc('sales')
            ->get();

        if ($rows->isEmpty()) {
            return ['items' => [], 'top_category' => null, 'hasData' => false];
        }

        $items = $rows->map(fn ($r) => ['category' => $r->category, 'sales' => round((float) $r->sales, 2)]);

        return [
            'items' => $items->all(),
            'top_category' => $items->first()['category'] ?? null,
            'hasData' => true,
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
        $rows = Conversion::query()
            ->join('retailers', 'retailers.id', '=', 'conversions.retailer_id')
            ->where('conversions.order_date', '>=', $this->since($days)->toDateString())
            ->where('conversions.status', '!=', 'reversed')
            ->selectRaw('retailers.name as retailer, SUM(conversions.sale_amount) as sales')
            ->groupBy('retailers.name')
            ->orderByDesc('sales')
            ->get();

        $totalSales = (float) $rows->sum('sales');
        if ($rows->isEmpty() || $totalSales <= 0) {
            return ['items' => [], 'hasData' => false];
        }

        $items = $rows->map(fn ($r) => [
            'retailer' => $r->retailer,
            'sales' => round((float) $r->sales, 2),
            'pct' => round(((float) $r->sales / $totalSales) * 100, 1),
        ]);

        return ['items' => $items->all(), 'hasData' => true];
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
        $rows = Conversion::query()
            ->join('products', 'products.id', '=', 'conversions.product_id')
            ->leftJoin('categories', 'categories.id', '=', 'products.category_id')
            ->where('conversions.order_date', '>=', $this->since($days)->toDateString())
            ->where('conversions.status', '!=', 'reversed')
            ->selectRaw('products.id as id, products.name as name, products.brand as brand, products.image as image,
                products.retailer as retailer, categories.name as category,
                SUM(conversions.units) as units, SUM(conversions.sale_amount) as sales, SUM(conversions.commission_amount) as commission')
            ->groupBy('products.id', 'products.name', 'products.brand', 'products.image', 'products.retailer', 'categories.name')
            ->orderByDesc('units')
            ->take(5)
            ->get();

        if ($rows->isEmpty()) {
            return ['items' => [], 'hasData' => false];
        }

        $items = $rows->map(fn ($r) => [
            'id' => $r->id,
            'name' => $r->name,
            'brand' => $r->brand,
            'image' => $r->image,
            'category' => $r->category,
            'retailer' => $r->retailer,
            'units' => (int) $r->units,
            'sales' => round((float) $r->sales, 2),
            'commission' => round((float) $r->commission, 2),
        ]);

        return ['items' => $items->all(), 'hasData' => true];
    }

    /**
     * SQL: SELECT device, COUNT(*) FROM clicks
     *      WHERE created_at >= NOW() - INTERVAL ? DAY GROUP BY device ORDER BY 2 DESC
     */
    private function clicksByDevice(int $days): array
    {
        $since = $this->since($days);
        $total = Click::where('created_at', '>=', $since)->count();
        if ($total <= 0) {
            return ['items' => [], 'hasData' => false];
        }

        $rows = Click::where('created_at', '>=', $since)
            ->selectRaw("COALESCE(device, 'Desktop') as device, COUNT(*) as clicks")
            ->groupBy('device')
            ->orderByDesc('clicks')
            ->get();

        $items = $rows->map(fn ($r) => [
            'device' => $r->device,
            'clicks' => (int) $r->clicks,
            'pct' => round(((int) $r->clicks / $total) * 100, 1),
        ]);

        return ['items' => $items->all(), 'hasData' => true];
    }

    /**
     * SQL: SELECT source_page, COUNT(*) clicks FROM clicks
     *      WHERE created_at >= NOW() - INTERVAL ? DAY
     *      GROUP BY source_page ORDER BY clicks DESC LIMIT 5
     */
    private function topSourcePages(int $days): array
    {
        $since = $this->since($days);
        $total = Click::where('created_at', '>=', $since)->count();

        $rows = Click::where('created_at', '>=', $since)
            ->whereNotNull('source_page')
            ->selectRaw('source_page as page, COUNT(*) as clicks')
            ->groupBy('source_page')
            ->orderByDesc('clicks')
            ->take(5)
            ->get();

        if ($rows->isEmpty() || $total <= 0) {
            return ['items' => [], 'hasData' => false];
        }

        $items = $rows->map(fn ($r) => [
            'page' => $r->page,
            'clicks' => (int) $r->clicks,
            'pct' => round(((int) $r->clicks / $total) * 100, 1),
        ]);

        return ['items' => $items->all(), 'hasData' => true];
    }

    /**
     * SQL: SELECT a.title, a.slug, a.img, COUNT(*) views FROM article_views v
     *      JOIN articles a ON a.id = v.article_id
     *      WHERE v.created_at >= NOW() - INTERVAL ? DAY
     *      GROUP BY a.id ORDER BY views DESC LIMIT 5
     */
    private function topArticles(int $days): array
    {
        $rows = ArticleView::query()
            ->join('articles', 'articles.id', '=', 'article_views.article_id')
            ->where('article_views.created_at', '>=', $this->since($days))
            ->selectRaw('articles.id as id, articles.title as title, articles.slug as slug, articles.img as img, COUNT(*) as views')
            ->groupBy('articles.id', 'articles.title', 'articles.slug', 'articles.img')
            ->orderByDesc('views')
            ->take(5)
            ->get();

        if ($rows->isEmpty()) {
            return ['items' => [], 'hasData' => false];
        }

        $items = $rows->map(fn ($r) => [
            'title' => $r->title,
            'slug' => $r->slug,
            'img' => $r->img,
            'views' => (int) $r->views,
        ]);

        return ['items' => $items->all(), 'hasData' => true];
    }

    /**
     * SQL: SELECT v.title, v.thumb, COUNT(*) views FROM video_views vv
     *      JOIN videos v ON v.id = vv.video_id
     *      WHERE vv.created_at >= NOW() - INTERVAL ? DAY
     *      GROUP BY v.id ORDER BY views DESC LIMIT 5
     */
    private function topVideos(int $days): array
    {
        $rows = VideoView::query()
            ->join('videos', 'videos.id', '=', 'video_views.video_id')
            ->where('video_views.created_at', '>=', $this->since($days))
            ->selectRaw('videos.id as id, videos.title as title, videos.thumb as thumb, COUNT(*) as views')
            ->groupBy('videos.id', 'videos.title', 'videos.thumb')
            ->orderByDesc('views')
            ->take(5)
            ->get();

        if ($rows->isEmpty()) {
            return ['items' => [], 'hasData' => false];
        }

        $items = $rows->map(fn ($r) => [
            'title' => $r->title,
            'thumb' => $r->thumb,
            'views' => (int) $r->views,
        ]);

        return ['items' => $items->all(), 'hasData' => true];
    }
}
