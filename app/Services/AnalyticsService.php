<?php

namespace App\Services;

use App\Models\ArticleView;
use App\Models\Click;
use App\Models\ProductView;
use App\Models\VideoView;
use Illuminate\Support\Carbon;

/** Builds the admin analytics payload from activity recorded on Limitra. */
class AnalyticsService
{
    public function summary(int $days): array
    {
        $days = max(1, min(90, $days));
        return [
            'range' => $days, 'kpis' => $this->kpis($days), 'clickTrend' => $this->clickTrend($days),
            'engagement' => $this->engagement($days), 'topClickedProducts' => $this->topClickedProducts($days),
            'topViewedProducts' => $this->topViewedProducts($days), 'topBrands' => $this->topBrands($days),
            'clicksByDevice' => $this->clicksByDevice($days), 'topSourcePages' => $this->topSourcePages($days),
            'topArticles' => $this->topArticles($days), 'topVideos' => $this->topVideos($days),
        ];
    }

    private function since(int $days): Carbon { return Carbon::today()->subDays($days - 1)->startOfDay(); }

    private function kpis(int $days): array
    {
        $since = $this->since($days);
        $clicks = Click::where('created_at', '>=', $since)->count();
        $productViews = ProductView::where('created_at', '>=', $since)->count();
        return ['clicks' => $clicks, 'product_views' => $productViews,
            'click_through_rate' => $productViews ? round($clicks / $productViews * 100, 1) : 0.0,
            'hasData' => $clicks > 0 || $productViews > 0];
    }

    private function clickTrend(int $days): array
    {
        $clicksByDay = Click::where('created_at', '>=', $this->since($days))->selectRaw('DATE(created_at) as d, COUNT(*) as clicks')->groupBy('d')->pluck('clicks', 'd');
        $series = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = Carbon::today()->subDays($i)->toDateString();
            $series[] = ['date' => $date, 'clicks' => (int) ($clicksByDay[$date] ?? 0)];
        }
        $total = array_sum(array_column($series, 'clicks'));
        $priorClicks = Click::whereBetween('created_at', [Carbon::today()->subDays($days * 2 - 1)->startOfDay(), $this->since($days)->copy()->subSecond()])->count();
        $peak = collect($series)->sortByDesc('clicks')->first();
        return ['series' => $series, 'change_pct' => $priorClicks ? round((($total - $priorClicks) / $priorClicks) * 100, 1) : 0.0,
            'avg_daily_clicks' => round($total / $days, 1), 'peak_clicks' => (int) ($peak['clicks'] ?? 0),
            'peak_date' => $peak['date'] ?? null, 'hasData' => $total > 0];
    }

    private function engagement(int $days): array
    {
        $since = $this->since($days);
        $views = ProductView::where('created_at', '>=', $since)->count();
        $clicks = Click::where('created_at', '>=', $since)->count();
        return ['product_views' => $views, 'buy_now_clicks' => $clicks,
            'click_through_rate' => $views ? round($clicks / $views * 100, 1) : 0.0,
            'hasData' => $views > 0 || $clicks > 0];
    }

    private function topClickedProducts(int $days): array
    {
        $rows = Click::query()->join('products', 'products.id', '=', 'clicks.product_id')->where('clicks.created_at', '>=', $this->since($days))
            ->selectRaw('products.id, products.name, products.brand, products.image, COUNT(*) as clicks')->groupBy('products.id', 'products.name', 'products.brand', 'products.image')->orderByDesc('clicks')->take(5)->get();
        return ['items' => $rows->map(fn ($r) => ['id' => $r->id, 'name' => $r->name, 'brand' => $r->brand, 'image' => $r->image, 'clicks' => (int) $r->clicks])->all(), 'hasData' => $rows->isNotEmpty()];
    }

    private function topViewedProducts(int $days): array
    {
        $rows = ProductView::query()->join('products', 'products.id', '=', 'product_views.product_id')->where('product_views.created_at', '>=', $this->since($days))
            ->selectRaw('products.id, products.name, products.brand, products.image, COUNT(*) as views')->groupBy('products.id', 'products.name', 'products.brand', 'products.image')->orderByDesc('views')->take(5)->get();
        return ['items' => $rows->map(fn ($r) => ['id' => $r->id, 'name' => $r->name, 'brand' => $r->brand, 'image' => $r->image, 'views' => (int) $r->views])->all(), 'hasData' => $rows->isNotEmpty()];
    }

    private function topBrands(int $days): array
    {
        $rows = Click::query()->join('products', 'products.id', '=', 'clicks.product_id')->where('clicks.created_at', '>=', $this->since($days))->whereNotNull('products.brand')->where('products.brand', '!=', '')
            ->selectRaw('products.brand as brand, COUNT(*) as clicks')->groupBy('products.brand')->orderByDesc('clicks')->take(5)->get();
        return ['items' => $rows->map(fn ($r) => ['brand' => $r->brand, 'clicks' => (int) $r->clicks])->all(), 'hasData' => $rows->isNotEmpty()];
    }

    private function clicksByDevice(int $days): array
    {
        $rows = Click::where('created_at', '>=', $this->since($days))->selectRaw("COALESCE(device, 'Desktop') as device, COUNT(*) as clicks")->groupBy('device')->orderByDesc('clicks')->get();
        $total = (int) $rows->sum('clicks');
        return ['items' => $rows->map(fn ($r) => ['device' => $r->device, 'clicks' => (int) $r->clicks, 'pct' => $total ? round($r->clicks / $total * 100, 1) : 0.0])->all(), 'hasData' => $total > 0];
    }

    private function topSourcePages(int $days): array
    {
        $rows = Click::where('created_at', '>=', $this->since($days))->whereNotNull('source_page')->selectRaw('source_page as page, COUNT(*) as clicks')->groupBy('source_page')->orderByDesc('clicks')->take(5)->get();
        $total = Click::where('created_at', '>=', $this->since($days))->count();
        return ['items' => $rows->map(fn ($r) => ['page' => $r->page, 'clicks' => (int) $r->clicks, 'pct' => $total ? round($r->clicks / $total * 100, 1) : 0.0])->all(), 'hasData' => $rows->isNotEmpty()];
    }

    private function topArticles(int $days): array
    {
        $rows = ArticleView::query()->join('articles', 'articles.id', '=', 'article_views.article_id')->where('article_views.created_at', '>=', $this->since($days))->selectRaw('articles.title, articles.slug, articles.img, COUNT(*) as views')->groupBy('articles.id', 'articles.title', 'articles.slug', 'articles.img')->orderByDesc('views')->take(5)->get();
        return ['items' => $rows->map(fn ($r) => ['title' => $r->title, 'slug' => $r->slug, 'img' => $r->img, 'views' => (int) $r->views])->all(), 'hasData' => $rows->isNotEmpty()];
    }

    private function topVideos(int $days): array
    {
        $rows = VideoView::query()->join('videos', 'videos.id', '=', 'video_views.video_id')->where('video_views.created_at', '>=', $this->since($days))->selectRaw('videos.title, videos.thumb, COUNT(*) as views')->groupBy('videos.id', 'videos.title', 'videos.thumb')->orderByDesc('views')->take(5)->get();
        return ['items' => $rows->map(fn ($r) => ['title' => $r->title, 'thumb' => $r->thumb, 'views' => (int) $r->views])->all(), 'hasData' => $rows->isNotEmpty()];
    }
}
