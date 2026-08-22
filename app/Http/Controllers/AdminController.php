<?php

namespace App\Http\Controllers;

use App\Jobs\ProcessBulkImport;
use App\Models\Article;
use App\Models\BulkImportBatch;
use App\Models\Category;
use App\Models\Guide;
use App\Models\Look;
use App\Models\Occasion;
use App\Models\Product;
use App\Models\ProductDetail;
use App\Models\SiteSetting;
use App\Models\StaticPage;
use App\Models\Subcategory;
use App\Models\Video;
use App\Services\AnalyticsService;
use App\Services\ProductWriter;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class AdminController extends Controller
{
    public function __construct(private ProductWriter $productWriter)
    {
    }

    public function index(Request $request)
    {
        // Eager: small, needed for the Dashboard tab and nav badges to render
        // instantly on first paint, without waiting on the full deferred lists.
        $recentProducts = Product::with('category')->orderByDesc('created_at')->limit(5)->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'image' => $p->image,
                'brand' => $p->brand,
                'name' => $p->name,
                'category' => $p->category?->name,
                'price' => $p->price,
            ]);

        return Inertia::render('Admin/Index', [
            'productsCount' => Product::count(),
            'featuredCount' => Product::where('is_featured', true)->count(),
            'resortCount' => Product::where('is_resort', true)->count(),
            'linkedCount' => Product::whereNotNull('affiliate_url')->count(),
            'recentProducts' => $recentProducts,
            'pendingImportsCount' => BulkImportBatch::where('status', 'processing')->count(),

            // Small and shared by several tabs (Products' filter, Occasions' picker,
            // Categories itself) — cheap enough to send on first paint so those tabs
            // don't need an extra round trip just for this.
            'categories' => $this->categoriesForAdmin(),

            // Lazy: NOT fetched on first paint, and not auto-fetched afterwards either
            // (unlike Inertia::defer). Each of these only resolves when the frontend
            // explicitly requests it via a partial reload naming that prop — which
            // Index.jsx does once, the first time the admin navigates to that tab.
            // This keeps the initial admin load to just the Dashboard's eager stats
            // above instead of shipping every section's data up front.
            //
            // 'products' is a server-paginated page (only the rows for the
            // currently viewed table page — see productsForAdmin()), not the full
            // catalog. Anything that needs the *entire* catalog (the cross-editor
            // product picker, slug-uniqueness checks, bulk-import matching) fetches
            // the separate, lightweight GET /admin/products/lookup endpoint instead
            // — see productsLookup() — so those features keep seeing every product
            // without the main page needing to ship every product's full row.
            'products' => Inertia::optional(fn () => $this->productsForAdmin($request)),
            'occasions' => Inertia::optional(fn () => $this->occasionsForAdmin($request)),
            'articles' => Inertia::optional(fn () => $this->articlesForAdmin($request)),
            'guides' => Inertia::optional(fn () => $this->guidesForAdmin($request)),
            'staticPages' => Inertia::optional(fn () => $this->staticPagesForAdmin($request)),
            'looks' => Inertia::optional(fn () => $this->looksForAdmin($request)),
            'videos' => Inertia::optional(fn () => $this->videosForAdmin($request)),
            'bulkImports' => Inertia::optional(fn () => $this->bulkImportsForAdmin($request)),
            'settings' => Inertia::optional(fn () => SiteSetting::allAsMap()),
            'analytics' => Inertia::optional(
                fn () => app(AnalyticsService::class)->summary((int) $request->integer('range', 30))
            ),
        ]);
    }

    /** Clamps a per-page request value to the 20-200 range the admin table's page-size dropdown offers. */
    private function perPageFrom(Request $request, string $key, int $default = 20): int
    {
        return max(20, min(200, (int) $request->input($key, $default)));
    }

    /** Normalizes a request sort-direction value to a safe 'asc'/'desc' — never interpolate the raw input into SQL. */
    private function sortDirFrom(Request $request, string $key, string $default = 'desc'): string
    {
        return $request->input($key) === 'asc' ? 'asc' : ($request->input($key) === 'desc' ? 'desc' : $default);
    }

    private function productsForAdmin(Request $request)
    {
        $perPage = $this->perPageFrom($request, 'products_per_page');
        $sortKey = $request->input('products_sort');
        $sortDir = $this->sortDirFrom($request, 'products_dir', 'asc');
        $q       = trim((string) $request->input('products_q', ''));
        $cat     = trim((string) $request->input('products_category', ''));

        $query = Product::with(['category', 'subcategory', 'detail']);

        if ($q !== '') {
            $query->where(function ($qq) use ($q) {
                $qq->where('name', 'like', "%{$q}%")
                    ->orWhere('brand', 'like', "%{$q}%")
                    ->orWhereHas('subcategory', fn ($s) => $s->where('name', 'like', "%{$q}%"));
            });
        }

        if ($cat !== '' && $cat !== 'All') {
            $query->whereHas('category', fn ($c) => $c->where('name', $cat));
        }

        match ($sortKey) {
            'name' => $query->orderBy('name', $sortDir),
            // price is stored as a formatted string ("$280") — cast to a number to sort correctly.
            'price' => $query->orderByRaw("CAST(REPLACE(REPLACE(price, '$', ''), ',', '') AS DECIMAL(12,2)) {$sortDir}"),
            'category' => $query->leftJoin('categories', 'categories.id', '=', 'products.category_id')
                ->orderBy('categories.name', $sortDir)
                ->select('products.*'),
            'affiliateUrl' => $query->orderByRaw('affiliate_url IS NULL ' . ($sortDir === 'desc' ? 'DESC' : 'ASC')),
            default => $query->orderByDesc('created_at'),
        };

        $page = $query->paginate($perPage, ['*'], 'products_page');

        $page->getCollection()->transform(fn ($p) => [
            'id' => $p->id,
            'slug' => $p->slug,
            'name' => $p->name,
            'brand' => $p->brand,
            'category' => $p->category?->name,
            'category_id' => $p->category_id,
            'subcategory' => $p->subcategory?->name,
            'subcategory_id' => $p->subcategory_id,
            'price' => $p->price,
            'retailer' => $p->retailer,
            'affiliateUrl' => $p->affiliate_url,
            'image' => $p->image,
            'badge' => $p->badge,
            'rating' => $p->rating,
            'is_featured' => (bool) $p->is_featured,
            'is_resort' => (bool) $p->is_resort,
            'is_new' => (bool) $p->is_new,
            'features' => $p->features ?? [],
            'tags' => $p->tags ?? [],
            'description' => $p->description,
            'gallery' => [],
            'detail' => $p->detail ? [
                'about' => $p->detail->about ?? [],
                'highlights' => $p->detail->highlights ?? [],
                'specs' => $p->detail->specs ?? [],
                'available_options' => $p->detail->available_options ?? [],
            ] : ['about' => [], 'highlights' => [], 'specs' => [], 'available_options' => []],
        ]);

        return $page;
    }

    /**
     * Lightweight, unpaginated product list — every product, but only the fields
     * needed for the cross-editor product picker (Looks/Videos/Journal/Guides/
     * Occasions), slug-uniqueness checks, and bulk-import "does this already
     * exist?" matching. Deliberately excludes description/features/specs/gallery
     * so this stays cheap even though it covers the whole catalog.
     */
    public function productsLookup()
    {
        return response()->json(
            Product::orderBy('name')->get(['id', 'slug', 'name', 'brand', 'image', 'price'])
        );
    }

    /**
     * Full-catalog CSV export, streamed directly from the DB — the "Download all"
     * button needs every field for every product, which is deliberately more than
     * the lightweight lookup carries, so this gets its own endpoint rather than
     * ever loading the full heavy catalog into the browser.
     */
    public function exportProducts()
    {
        $headers = [
            'id', 'slug', 'name', 'brand', 'category', 'subcategory', 'price', 'retailer',
            'affiliate_url', 'image', 'badge', 'rating', 'description',
            'is_featured', 'is_resort', 'is_new', 'highlights', 'about', 'specs', 'available_options',
        ];

        return response()->streamDownload(function () use ($headers) {
            $out = fopen('php://output', 'w');
            fputcsv($out, $headers);

            Product::with(['category', 'subcategory', 'detail'])
                ->orderBy('name')
                ->chunk(200, function ($products) use ($out) {
                    foreach ($products as $p) {
                        fputcsv($out, [
                            $p->id,
                            $p->slug,
                            $p->name,
                            $p->brand,
                            $p->category?->name,
                            $p->subcategory?->name,
                            $p->price,
                            $p->retailer,
                            $p->affiliate_url,
                            $p->image,
                            $p->badge,
                            $p->rating,
                            $p->description,
                            $p->is_featured ? 'TRUE' : 'FALSE',
                            $p->is_resort ? 'TRUE' : 'FALSE',
                            $p->is_new ? 'TRUE' : 'FALSE',
                            implode('|', $p->features ?? []),
                            implode('|', $p->detail?->about ?? []),
                            collect($p->detail?->specs ?? [])->map(fn ($s) => "{$s[0]}:{$s[1]}")->implode(';'),
                            collect($p->detail?->available_options ?? [])->map(fn ($values, $key) => $key . ':' . implode('|', $values))->implode(';'),
                        ]);
                    }
                });

            fclose($out);
        }, 'products.csv', ['Content-Type' => 'text/csv']);
    }

    private function occasionsForAdmin(Request $request)
    {
        $perPage = $this->perPageFrom($request, 'occasions_per_page');
        $sortKey = $request->input('occasions_sort');
        $sortDir = $this->sortDirFrom($request, 'occasions_dir', 'asc');

        $query = Occasion::query();
        match ($sortKey) {
            'title' => $query->orderBy('title', $sortDir),
            'badge' => $query->orderBy('badge', $sortDir),
            'link' => $query->orderBy('link', $sortDir),
            default => $query->orderBy('sort_order'),
        };

        return $query->paginate($perPage, ['*'], 'occasions_page');
    }

    /** Lightweight lookup for bulk-import "does this already exist?" matching and the editor's key-uniqueness check. */
    public function occasionsLookup()
    {
        return response()->json(Occasion::orderBy('title')->get(['id', 'key', 'title']));
    }

    private function articlesForAdmin(Request $request)
    {
        $perPage = $this->perPageFrom($request, 'articles_per_page');
        $sortKey = $request->input('articles_sort');
        $sortDir = $this->sortDirFrom($request, 'articles_dir', 'asc');

        $query = Article::query();
        match ($sortKey) {
            'title' => $query->orderBy('title', $sortDir),
            'tag' => $query->orderBy('tag', $sortDir),
            'date' => $query->orderBy('date', $sortDir),
            default => $query->orderByDesc('id'),
        };

        return $query->paginate($perPage, ['*'], 'articles_page');
    }

    public function articlesLookup()
    {
        return response()->json(Article::orderBy('title')->get(['id', 'slug', 'title']));
    }

    private function guidesForAdmin(Request $request)
    {
        $perPage = $this->perPageFrom($request, 'guides_per_page');
        $sortKey = $request->input('guides_sort');
        $sortDir = $this->sortDirFrom($request, 'guides_dir', 'asc');

        $query = Guide::query();
        match ($sortKey) {
            'title' => $query->orderBy('title', $sortDir),
            'tag' => $query->orderBy('tag', $sortDir),
            'read_time' => $query->orderBy('read_time', $sortDir),
            default => $query->orderByDesc('featured')->orderBy('sort_order'),
        };

        return $query->paginate($perPage, ['*'], 'guides_page');
    }

    public function guidesLookup()
    {
        return response()->json(Guide::orderBy('title')->get(['id', 'slug', 'title']));
    }

    private function staticPagesForAdmin(Request $request)
    {
        $perPage = $this->perPageFrom($request, 'static_pages_per_page');
        $sortKey = $request->input('static_pages_sort');
        $sortDir = $this->sortDirFrom($request, 'static_pages_dir', 'asc');

        $query = StaticPage::query();
        match ($sortKey) {
            'key' => $query->orderBy('key', $sortDir),
            default => $query->orderBy('title', $sortDir),
        };

        return $query->paginate($perPage, ['*'], 'static_pages_page');
    }

    public function staticPagesLookup()
    {
        return response()->json(StaticPage::orderBy('title')->get(['id', 'key', 'title']));
    }

    private function looksForAdmin(Request $request)
    {
        $perPage = $this->perPageFrom($request, 'looks_per_page');
        $sortKey = $request->input('looks_sort');
        $sortDir = $this->sortDirFrom($request, 'looks_dir', 'asc');

        $query = Look::query();
        match ($sortKey) {
            'event' => $query->orderBy('event', $sortDir),
            'grid_items' => $query->orderByRaw("JSON_LENGTH(grid_items) {$sortDir}"),
            default => $query->orderByDesc('id'),
        };

        return $query->paginate($perPage, ['*'], 'looks_page');
    }

    public function looksLookup()
    {
        return response()->json(Look::orderBy('event')->get(['id', 'slug', 'event']));
    }

    private function videosForAdmin(Request $request)
    {
        $perPage = $this->perPageFrom($request, 'videos_per_page');
        $sortKey = $request->input('videos_sort');
        $sortDir = $this->sortDirFrom($request, 'videos_dir', 'asc');

        $query = Video::query();
        match ($sortKey) {
            'title' => $query->orderBy('title', $sortDir),
            'tag' => $query->orderBy('tag', $sortDir),
            'duration' => $query->orderBy('duration', $sortDir),
            'products' => $query->orderByRaw("JSON_LENGTH(products) {$sortDir}"),
            default => $query->orderBy('sort_order'),
        };

        return $query->paginate($perPage, ['*'], 'videos_page');
    }

    public function videosLookup()
    {
        return response()->json(Video::orderBy('title')->get(['id', 'title']));
    }

    private function bulkImportsForAdmin(Request $request)
    {
        $perPage = $this->perPageFrom($request, 'bulk_imports_per_page');
        $sortKey = $request->input('bulk_imports_sort');
        $sortDir = $this->sortDirFrom($request, 'bulk_imports_dir', 'asc');

        $query = BulkImportBatch::query();
        match ($sortKey) {
            'filename' => $query->orderBy('filename', $sortDir),
            'type' => $query->orderBy('type', $sortDir),
            'created_at' => $query->orderBy('created_at', $sortDir),
            'status' => $query->orderBy('status', $sortDir),
            default => $query->orderByDesc('id'),
        };

        return $query->paginate($perPage, ['*'], 'bulk_imports_page');
    }

    private function categoriesForAdmin()
    {
        return Category::with('subcategories')->orderBy('sort_order')->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'slug' => $c->slug,
                'img' => $c->img,
                'featureImg' => $c->feature_img,
                'featureImg2' => $c->feature_img2,
                'bannerImg' => $c->banner_img,
                'subs' => $c->subcategories->pluck('name')->values()->toArray(),
            ]);
    }

    // ── Bulk import ───────────────────────────────────────────

    private function queueBulkImport(Request $request, string $type)
    {
        $items = $request->input('items', []);
        $batch = BulkImportBatch::create([
            'type' => $type,
            'filename' => $request->input('filename'),
            'status' => 'processing',
            'total' => count($items),
        ]);

        ProcessBulkImport::dispatch($batch->id, $type, $items);

        return response()->json(['batch_id' => $batch->id, 'status' => 'processing']);
    }

    // ── Products ──────────────────────────────────────────────

    public function storeProduct(Request $request)
    {
        $request->validate(['name' => 'required|string', 'price' => 'required|string']);

        $this->productWriter->createFromArray($request->all());

        return back();
    }

    public function updateProduct(Request $request, string $id)
    {
        $product = Product::findOrFail($id);

        $category = Category::where('name', $request->category)->first();
        $subcategory = $category && $request->subcategory
            ? Subcategory::where('category_id', $category->id)->where('name', $request->subcategory)->first()
            : null;

        $product->update([
            'name' => $request->name ?? $product->name,
            'brand' => $request->brand ?: 'Limitra Select',
            'price' => $request->price ?? $product->price,
            'category_id' => $category?->id ?? $product->category_id,
            'subcategory_id' => $subcategory?->id ?? $product->subcategory_id,
            'retailer' => $request->retailer,
            'affiliate_url' => $request->affiliateUrl,
            'image' => $request->image,
            'description' => $request->description,
            'badge' => $request->badge ?: null,
            'rating' => $request->rating ? min(5, max(0, (float) $request->rating)) : $product->rating,
            'is_featured' => (bool) $request->is_featured,
            'is_resort' => (bool) $request->is_resort,
            'is_new' => (bool) $request->is_new,
            'features' => $this->productWriter->cleanArray($request->highlights ?? []),
        ]);

        $about = $this->productWriter->cleanArray($request->about ?? []);
        $highlights = $this->productWriter->cleanArray($request->highlights ?? []);
        $specs = $this->productWriter->cleanSpecs($request->specs ?? []);
        $availableOptions = $this->productWriter->cleanAvailableOptions($request->availableOptions ?? []);

        ProductDetail::updateOrCreate(
            ['product_id' => $id],
            [
                'about' => $about,
                'highlights' => $highlights,
                'specs' => $specs,
                'available_options' => $availableOptions,
            ]
        );

        return back();
    }

    public function destroyProduct(string $id)
    {
        Product::findOrFail($id)->delete();
        return back();
    }

    public function bulkImportProducts(Request $request)
    {
        return $this->queueBulkImport($request, 'products');
    }

    // ── Categories ────────────────────────────────────────────

    public function updateCategory(Request $request, int $id)
    {
        $category = Category::with('subcategories')->findOrFail($id);

        $category->update([
            'img' => $request->img,
            'feature_img' => $request->featureImg,
            'feature_img2' => $request->featureImg2,
            'banner_img' => $request->bannerImg,
        ]);

        $newSubs = array_filter($request->subs ?? [], fn ($s) => trim($s));
        $existing = $category->subcategories()->pluck('name')->toArray();

        $category->subcategories()->whereNotIn('name', $newSubs)->delete();

        foreach (array_values($newSubs) as $i => $subName) {
            if (!in_array($subName, $existing)) {
                Subcategory::create([
                    'category_id' => $id,
                    'name' => $subName,
                    'slug' => Str::slug($subName),
                    'sort_order' => $i,
                ]);
            }
        }

        return back();
    }

    // ── Occasions ─────────────────────────────────────────────

    public function storeOccasion(Request $request)
    {
        $request->validate(['title' => 'required|string']);
        $key = $request->key ?: Str::slug($request->title);
        // Only one occasion can be the hero at a time
        if ($request->boolean('is_hero')) {
            Occasion::where('is_hero', true)->update(['is_hero' => false]);
        }
        Occasion::create([
            'key'         => $key,
            'title'       => $request->title,
            'eyebrow'     => $request->eyebrow,
            'tagline'     => $request->tagline,
            'badge'       => $request->badge,
            'img'         => $request->img,
            'link'        => $request->link,
            'subcats'     => $request->subcats ?? [],
            'product_ids' => $request->product_ids ?? [],
            'featured'    => (bool) $request->featured,
            'is_hero'     => (bool) $request->is_hero,
            'color'       => '#16357a',
            'accent'      => '#cf8a32',
        ]);
        return back();
    }

    public function updateOccasion(Request $request, int $id)
    {
        if ($request->boolean('is_hero')) {
            Occasion::where('is_hero', true)->where('id', '!=', $id)->update(['is_hero' => false]);
        }
        Occasion::findOrFail($id)->update([
            'title'       => $request->title,
            'eyebrow'     => $request->eyebrow,
            'tagline'     => $request->tagline,
            'badge'       => $request->badge,
            'img'         => $request->img,
            'link'        => $request->link,
            'subcats'     => $request->subcats ?? [],
            'product_ids' => $request->product_ids ?? [],
            'featured'    => (bool) $request->featured,
            'is_hero'     => (bool) $request->is_hero,
        ]);
        return back();
    }

    public function destroyOccasion(int $id)
    {
        Occasion::findOrFail($id)->delete();
        return back();
    }

    public function bulkImportOccasions(Request $request)
    {
        return $this->queueBulkImport($request, 'occasions');
    }

    // ── Articles ──────────────────────────────────────────────

    public function storeArticle(Request $request)
    {
        $request->validate(['title' => 'required|string']);
        Article::create([
            'slug' => $request->slug ?: Str::slug($request->title),
            'tag' => $request->tag ?? 'Fashion',
            'category' => $request->category ?? 'Women',
            'title' => $request->title,
            'excerpt' => $request->excerpt ?? '',
            'img' => $request->img,
            'date' => $request->date ?? now()->format('F j, Y'),
            'author' => $request->author ?? 'Limitra Editors',
            'read_time' => $request->readTime ?? '5 min',
            'featured' => (bool) $request->featured,
            'body' => $request->body ?? [],
        ]);
        return back();
    }

    public function updateArticle(Request $request, int $id)
    {
        Article::findOrFail($id)->update([
            'tag' => $request->tag,
            'category' => $request->category,
            'title' => $request->title,
            'excerpt' => $request->excerpt,
            'img' => $request->img,
            'date' => $request->date,
            'author' => $request->author,
            'read_time' => $request->readTime,
            'featured' => (bool) $request->featured,
            'body' => $request->body ?? [],
        ]);
        return back();
    }

    public function destroyArticle(int $id)
    {
        Article::findOrFail($id)->delete();
        return back();
    }

    public function bulkImportArticles(Request $request)
    {
        return $this->queueBulkImport($request, 'articles');
    }

    // ── Guides ────────────────────────────────────────────────

    public function storeGuide(Request $request)
    {
        $request->validate(['title' => 'required|string']);
        Guide::create([
            'slug' => $request->slug ?: Str::slug($request->title),
            'tag' => $request->tag ?? 'Fashion',
            'title' => $request->title,
            'excerpt' => $request->excerpt ?? '',
            'img' => $request->img,
            'sections' => $request->sections ?? [],
            'read_time' => $request->readTime ?? '5 min',
            'featured' => (bool) $request->featured,
            'sort_order' => (int) ($request->sortOrder ?? 0),
        ]);
        return back();
    }

    public function updateGuide(Request $request, int $id)
    {
        Guide::findOrFail($id)->update([
            'tag' => $request->tag,
            'title' => $request->title,
            'excerpt' => $request->excerpt,
            'img' => $request->img,
            'sections' => $request->sections ?? [],
            'read_time' => $request->readTime,
            'featured' => (bool) $request->featured,
            'sort_order' => (int) ($request->sortOrder ?? 0),
        ]);
        return back();
    }

    public function destroyGuide(int $id)
    {
        Guide::findOrFail($id)->delete();
        return back();
    }

    public function bulkImportGuide(Request $request)
    {
        return $this->queueBulkImport($request, 'guides');
    }

    // ── Static pages ──────────────────────────────────────────

    public function storeStaticPage(Request $request)
    {
        $request->validate([
            'key' => 'required|string|alpha_dash|unique:static_pages,key',
            'title' => 'required|string',
            'headline' => 'required|string',
        ]);
        StaticPage::create([
            'key' => $request->key,
            'title' => $request->title,
            'eyebrow' => $request->eyebrow,
            'headline' => $request->headline,
            'lead' => $request->lead,
            'hero_img' => $request->hero_img,
            'sections' => $request->sections ?? [],
            'note' => $request->note,
            'cta_text' => $request->cta_text,
            'cta_href' => $request->cta_href,
            'has_form' => (bool) $request->has_form,
        ]);
        return back();
    }

    public function updateStaticPage(Request $request, int $id)
    {
        $request->validate([
            'title' => 'required|string',
            'headline' => 'required|string',
        ]);
        StaticPage::findOrFail($id)->update([
            'title' => $request->title,
            'eyebrow' => $request->eyebrow,
            'headline' => $request->headline,
            'lead' => $request->lead,
            'hero_img' => $request->hero_img,
            'sections' => $request->sections ?? [],
            'note' => $request->note,
            'cta_text' => $request->cta_text,
            'cta_href' => $request->cta_href,
            'has_form' => (bool) $request->has_form,
        ]);
        return back();
    }

    public function destroyStaticPage(int $id)
    {
        StaticPage::findOrFail($id)->delete();
        return back();
    }

    // ── Looks ─────────────────────────────────────────────────

    public function storeLook(Request $request)
    {
        $request->validate(['event' => 'required|string']);
        Look::create([
            'slug' => $request->slug ?: Str::slug($request->event),
            'event' => $request->event,
            'tags' => $request->tags ?? [],
            'hero_img' => $request->heroImg,
            'style_notes' => $request->styleNotes,
            'palette' => $request->palette ?? [],
            'grid_items' => $request->gridItems ?? [],
            'products' => collect($request->gridItems ?? [])->pluck('id')->filter()->values()->toArray(),
        ]);
        return back();
    }

    public function updateLook(Request $request, int $id)
    {
        Look::findOrFail($id)->update([
            'event' => $request->event,
            'tags' => $request->tags ?? [],
            'hero_img' => $request->heroImg,
            'style_notes' => $request->styleNotes,
            'palette' => $request->palette ?? [],
            'grid_items' => $request->gridItems ?? [],
            'products' => collect($request->gridItems ?? [])->pluck('id')->filter()->values()->toArray(),
        ]);
        return back();
    }

    public function destroyLook(int $id)
    {
        Look::findOrFail($id)->delete();
        return back();
    }

    public function bulkImportLooks(Request $request)
    {
        return $this->queueBulkImport($request, 'looks');
    }

    // ── Videos ────────────────────────────────────────────────

    public function storeVideo(Request $request)
    {
        $request->validate([
            'title' => 'required|string',
        ]);
        $maxOrder = Video::max('sort_order') ?? 0;
        Video::create([
            'vid_id'    => $request->vid_id ?: ('v-' . Str::random(8)),
            'title'     => $request->title,
            'tag'       => $request->tag ?? 'Fashion',
            'thumb'     => $request->thumb,
            'youtube'   => $request->youtube ?: null,
            'video_url' => $request->video_url ?: null,
            'duration'  => $request->duration,
            'products'  => array_values(array_filter($request->products ?? [])),
            'sort_order' => $maxOrder + 1,
        ]);
        return back();
    }

    public function updateVideo(Request $request, int $id)
    {
        Video::findOrFail($id)->update([
            'title'     => $request->title,
            'tag'       => $request->tag,
            'thumb'     => $request->thumb,
            'youtube'   => $request->youtube ?: null,
            'video_url' => $request->video_url ?: null,
            'duration'  => $request->duration,
            'products'  => array_values(array_filter($request->products ?? [])),
        ]);
        return back();
    }

    public function destroyVideo(int $id)
    {
        Video::findOrFail($id)->delete();
        return back();
    }

    public function bulkImportVideos(Request $request)
    {
        return $this->queueBulkImport($request, 'videos');
    }

    public function reorderVideos(Request $request)
    {
        $request->validate([
            'order'   => 'required|array',
            'order.*' => 'required',
        ]);

        foreach ($request->order as $index => $id) {
            Video::where('id', $id)->update(['sort_order' => $index + 1]);
        }

        return back();
    }

    public function bulkImportConversions(Request $request)
    {
        return $this->queueBulkImport($request, 'conversions');
    }

    public function uploadImage(Request $request)
    {
        $request->validate([
            'image' => 'required|file|image|max:10240',
        ]);
        $path = $request->file('image')->store('images', 'public');
        return response()->json(['url' => \Storage::disk('public')->url($path)]);
    }

    public function uploadVideo(Request $request)
    {
        $request->validate([
            'video' => 'required|file|mimetypes:video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo|max:512000',
        ]);
        $path = $request->file('video')->store('videos', 'public');
        return response()->json(['url' => \Storage::disk('public')->url($path)]);
    }



    // ── Settings ──────────────────────────────────────────────

    public function updateSettings(Request $request)
    {
        SiteSetting::setMany($request->all());
        return back();
    }

    /** Generates a new shared token for the ProductPicker extension, invalidating the old one. */
    public function regenerateExtensionToken()
    {
        $token = Str::random(40);
        SiteSetting::setMany(['extension_api_token' => $token]);

        return response()->json(['token' => $token]);
    }

    /** Triggers the media:prune-orphans Artisan command to clean up unused uploads. */
    public function pruneOrphanedMedia()
    {
        \Artisan::call('media:prune-orphans', ['--force' => true]);
        $output = \Artisan::output();

        return response()->json([
            'message' => 'Orphaned media cleanup completed.',
            'output' => trim($output),
        ]);
    }
}
