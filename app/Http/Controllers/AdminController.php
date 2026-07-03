<?php

namespace App\Http\Controllers;

use App\Models\Article;
use App\Models\Category;
use App\Models\Look;
use App\Models\Occasion;
use App\Models\Product;
use App\Models\ProductDetail;
use App\Models\SiteSetting;
use App\Models\Subcategory;
use App\Models\Video;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

class AdminController extends Controller
{
    public function index()
    {
        $products = Product::with(['category', 'subcategory', 'detail'])
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
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
                ] : ['about' => [], 'highlights' => [], 'specs' => []],
            ]);

        $categories = Category::with('subcategories')->orderBy('sort_order')->get()
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

        return Inertia::render('Admin/Index', [
            'products' => $products,
            'categories' => $categories,
            'occasions' => Occasion::orderBy('sort_order')->get(),
            'articles' => Article::orderByDesc('id')->get(),
            'looks' => Look::orderByDesc('id')->get(),
            'videos' => Video::orderBy('sort_order')->get(),
            'settings' => SiteSetting::allAsMap(),
        ]);
    }

    // ── Products ──────────────────────────────────────────────

    public function storeProduct(Request $request)
    {
        $request->validate(['name' => 'required|string', 'price' => 'required|string']);

        $id = $request->input('id') ? Str::slug($request->input('id')) : Str::slug($request->name);
        if (Product::where('id', $id)->exists()) {
            $id = $id . '-' . substr(md5($request->name . microtime()), 0, 6);
        }

        $category = Category::where('name', $request->category)->first();
        $subcategory = $category && $request->subcategory
            ? Subcategory::where('category_id', $category->id)->where('name', $request->subcategory)->first()
            : null;

        $product = Product::create([
            'id' => $id,
            'name' => $request->name,
            'brand' => $request->brand ?: 'Limitra Select',
            'price' => $request->price,
            'category_id' => $category?->id,
            'subcategory_id' => $subcategory?->id,
            'retailer' => $request->retailer,
            'affiliate_url' => $request->affiliateUrl,
            'image' => $request->image,
            'description' => $request->description ?: ($request->name . ' — a Limitra-curated pick.'),
            'badge' => $request->badge ?: null,
            'rating' => $request->rating ? min(5, max(0, (float) $request->rating)) : 4.8,
            'is_featured' => (bool) $request->is_featured,
            'is_resort' => (bool) $request->is_resort,
            'is_new' => (bool) $request->is_new,
            'features' => $this->cleanArray($request->highlights ?? []),
            'slot' => $id,
        ]);

        $about = $this->cleanArray($request->about ?? []);
        $highlights = $this->cleanArray($request->highlights ?? []);
        $specs = $this->cleanSpecs($request->specs ?? []);

        if ($about || $highlights || $specs) {
            ProductDetail::create([
                'product_id' => $id,
                'about' => $about,
                'highlights' => $highlights,
                'specs' => $specs,
            ]);
        }

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
            'features' => $this->cleanArray($request->highlights ?? []),
        ]);

        $about = $this->cleanArray($request->about ?? []);
        $highlights = $this->cleanArray($request->highlights ?? []);
        $specs = $this->cleanSpecs($request->specs ?? []);

        ProductDetail::updateOrCreate(
            ['product_id' => $id],
            [
                'about' => $about,
                'highlights' => $highlights,
                'specs' => $specs,
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
        $created = 0; $updated = 0; $skipped = 0; $errors = [];

        DB::transaction(function () use ($request, &$created, &$updated, &$skipped, &$errors) {
            foreach ($request->input('items', []) as $i => $item) {
                $action = $item['action'] ?? 'skip';
                if ($action === 'skip') { $skipped++; continue; }
                $data = $item['data'] ?? [];

                try {
                    $category = Category::where('name', $data['category'] ?? null)->first();
                    $subcategory = $category && !empty($data['subcategory'])
                        ? Subcategory::where('category_id', $category->id)->where('name', $data['subcategory'])->first()
                        : null;

                    if ($action === 'update' && !empty($item['id'])) {
                        $product = Product::findOrFail($item['id']);
                        $product->update([
                            'name' => ($data['name'] ?? null) ?: $product->name,
                            'brand' => ($data['brand'] ?? null) ?: $product->brand,
                            'price' => ($data['price'] ?? null) ?: $product->price,
                            'category_id' => $category?->id ?? $product->category_id,
                            'subcategory_id' => $subcategory?->id ?? $product->subcategory_id,
                            'retailer' => $data['retailer'] ?? $product->retailer,
                            'affiliate_url' => $data['affiliateUrl'] ?? $product->affiliate_url,
                            'image' => ($data['image'] ?? null) ?: $product->image,
                            'description' => ($data['description'] ?? null) ?: $product->description,
                            'badge' => ($data['badge'] ?? '') !== '' ? $data['badge'] : null,
                            'rating' => ($data['rating'] ?? '') !== '' ? min(5, max(0, (float) $data['rating'])) : $product->rating,
                            'is_featured' => (bool) ($data['is_featured'] ?? $product->is_featured),
                            'is_resort' => (bool) ($data['is_resort'] ?? $product->is_resort),
                            'is_new' => (bool) ($data['is_new'] ?? $product->is_new),
                            'features' => !empty($data['highlights']) ? $this->cleanArray($data['highlights']) : $product->features,
                        ]);
                        $id = $product->id;
                        $updated++;
                    } else {
                        $id = !empty($data['id']) ? Str::slug($data['id']) : Str::slug($data['name'] ?? Str::random(8));
                        if (Product::where('id', $id)->exists()) {
                            $id = $id . '-' . substr(md5(($data['name'] ?? '') . microtime() . $i), 0, 6);
                        }
                        Product::create([
                            'id' => $id,
                            'name' => $data['name'] ?? 'Untitled product',
                            'brand' => ($data['brand'] ?? null) ?: 'Limitra Select',
                            'price' => $data['price'] ?? '',
                            'category_id' => $category?->id,
                            'subcategory_id' => $subcategory?->id,
                            'retailer' => $data['retailer'] ?? null,
                            'affiliate_url' => $data['affiliateUrl'] ?? null,
                            'image' => $data['image'] ?? null,
                            'description' => ($data['description'] ?? null) ?: (($data['name'] ?? 'Product') . ' — a Limitra-curated pick.'),
                            'badge' => $data['badge'] ?? null,
                            'rating' => ($data['rating'] ?? '') !== '' ? min(5, max(0, (float) $data['rating'])) : 4.8,
                            'is_featured' => (bool) ($data['is_featured'] ?? false),
                            'is_resort' => (bool) ($data['is_resort'] ?? false),
                            'is_new' => (bool) ($data['is_new'] ?? false),
                            'features' => $this->cleanArray($data['highlights'] ?? []),
                            'slot' => $id,
                        ]);
                        $created++;
                    }

                    $about = $this->cleanArray($data['about'] ?? []);
                    $highlights = $this->cleanArray($data['highlights'] ?? []);
                    $specs = $this->cleanSpecs($data['specs'] ?? []);
                    if ($about || $highlights || $specs) {
                        ProductDetail::updateOrCreate(['product_id' => $id], compact('about', 'highlights', 'specs'));
                    }
                } catch (\Throwable $e) {
                    $errors[] = ['row' => $i, 'message' => $e->getMessage()];
                }
            }
        });

        return response()->json(compact('created', 'updated', 'skipped', 'errors'));
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
            'key'      => $key,
            'title'    => $request->title,
            'eyebrow'  => $request->eyebrow,
            'tagline'  => $request->tagline,
            'badge'    => $request->badge,
            'img'      => $request->img,
            'link'     => $request->link,
            'featured' => (bool) $request->featured,
            'is_hero'  => (bool) $request->is_hero,
            'color'    => '#16357a',
            'accent'   => '#cf8a32',
        ]);
        return back();
    }

    public function updateOccasion(Request $request, int $id)
    {
        if ($request->boolean('is_hero')) {
            Occasion::where('is_hero', true)->where('id', '!=', $id)->update(['is_hero' => false]);
        }
        Occasion::findOrFail($id)->update([
            'title'    => $request->title,
            'eyebrow'  => $request->eyebrow,
            'tagline'  => $request->tagline,
            'badge'    => $request->badge,
            'img'      => $request->img,
            'link'     => $request->link,
            'featured' => (bool) $request->featured,
            'is_hero'  => (bool) $request->is_hero,
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
        $created = 0; $updated = 0; $skipped = 0; $errors = [];

        DB::transaction(function () use ($request, &$created, &$updated, &$skipped, &$errors) {
            foreach ($request->input('items', []) as $i => $item) {
                $action = $item['action'] ?? 'skip';
                if ($action === 'skip') { $skipped++; continue; }
                $data = $item['data'] ?? [];

                try {
                    if ((bool) ($data['is_hero'] ?? false)) {
                        Occasion::where('is_hero', true)->when(!empty($item['id']), fn ($q) => $q->where('id', '!=', $item['id']))->update(['is_hero' => false]);
                    }

                    if ($action === 'update' && !empty($item['id'])) {
                        $occasion = Occasion::findOrFail($item['id']);
                        $occasion->update([
                            'title' => ($data['title'] ?? null) ?: $occasion->title,
                            'eyebrow' => $data['eyebrow'] ?? $occasion->eyebrow,
                            'tagline' => $data['tagline'] ?? $occasion->tagline,
                            'badge' => $data['badge'] ?? $occasion->badge,
                            'img' => ($data['img'] ?? null) ?: $occasion->img,
                            'link' => $data['link'] ?? $occasion->link,
                            'featured' => (bool) ($data['featured'] ?? $occasion->featured),
                            'is_hero' => (bool) ($data['is_hero'] ?? $occasion->is_hero),
                        ]);
                        $updated++;
                    } else {
                        Occasion::create([
                            'key' => ($data['key'] ?? null) ?: Str::slug($data['title'] ?? Str::random(8)),
                            'title' => $data['title'] ?? 'Untitled occasion',
                            'eyebrow' => $data['eyebrow'] ?? null,
                            'tagline' => $data['tagline'] ?? null,
                            'badge' => $data['badge'] ?? null,
                            'img' => $data['img'] ?? null,
                            'link' => $data['link'] ?? null,
                            'featured' => (bool) ($data['featured'] ?? false),
                            'is_hero' => (bool) ($data['is_hero'] ?? false),
                            'color' => '#16357a',
                            'accent' => '#cf8a32',
                        ]);
                        $created++;
                    }
                } catch (\Throwable $e) {
                    $errors[] = ['row' => $i, 'message' => $e->getMessage()];
                }
            }
        });

        return response()->json(compact('created', 'updated', 'skipped', 'errors'));
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
        $created = 0; $updated = 0; $skipped = 0; $errors = [];

        DB::transaction(function () use ($request, &$created, &$updated, &$skipped, &$errors) {
            foreach ($request->input('items', []) as $i => $item) {
                $action = $item['action'] ?? 'skip';
                if ($action === 'skip') { $skipped++; continue; }
                $data = $item['data'] ?? [];

                try {
                    if ($action === 'update' && !empty($item['id'])) {
                        // Body content is left untouched on bulk update — it's rich, block-based content that doesn't round-trip through a CSV row.
                        $article = Article::findOrFail($item['id']);
                        $article->update([
                            'tag' => ($data['tag'] ?? null) ?: $article->tag,
                            'category' => ($data['category'] ?? null) ?: $article->category,
                            'title' => ($data['title'] ?? null) ?: $article->title,
                            'excerpt' => $data['excerpt'] ?? $article->excerpt,
                            'img' => ($data['img'] ?? null) ?: $article->img,
                            'date' => ($data['date'] ?? null) ?: $article->date,
                            'author' => ($data['author'] ?? null) ?: $article->author,
                            'read_time' => ($data['readTime'] ?? null) ?: $article->read_time,
                            'featured' => (bool) ($data['featured'] ?? $article->featured),
                        ]);
                        $updated++;
                    } else {
                        Article::create([
                            'slug' => ($data['slug'] ?? null) ?: Str::slug($data['title'] ?? Str::random(8)),
                            'tag' => ($data['tag'] ?? null) ?: 'Fashion',
                            'category' => ($data['category'] ?? null) ?: 'Women',
                            'title' => $data['title'] ?? 'Untitled article',
                            'excerpt' => $data['excerpt'] ?? '',
                            'img' => $data['img'] ?? null,
                            'date' => ($data['date'] ?? null) ?: now()->format('F j, Y'),
                            'author' => ($data['author'] ?? null) ?: 'Limitra Editors',
                            'read_time' => ($data['readTime'] ?? null) ?: '5 min',
                            'featured' => (bool) ($data['featured'] ?? false),
                            'body' => !empty($data['excerpt']) ? [['type' => 'lead', 'text' => $data['excerpt']]] : [],
                        ]);
                        $created++;
                    }
                } catch (\Throwable $e) {
                    $errors[] = ['row' => $i, 'message' => $e->getMessage()];
                }
            }
        });

        return response()->json(compact('created', 'updated', 'skipped', 'errors'));
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
        $created = 0; $updated = 0; $skipped = 0; $errors = [];

        DB::transaction(function () use ($request, &$created, &$updated, &$skipped, &$errors) {
            foreach ($request->input('items', []) as $i => $item) {
                $action = $item['action'] ?? 'skip';
                if ($action === 'skip') { $skipped++; continue; }
                $data = $item['data'] ?? [];

                try {
                    if ($action === 'update' && !empty($item['id'])) {
                        // Grid items / attached products are left untouched on bulk update — they're built visually, not via CSV.
                        $look = Look::findOrFail($item['id']);
                        $look->update([
                            'event' => ($data['event'] ?? null) ?: $look->event,
                            'tags' => !empty($data['tags']) ? $data['tags'] : $look->tags,
                            'hero_img' => ($data['heroImg'] ?? null) ?: $look->hero_img,
                            'style_notes' => $data['styleNotes'] ?? $look->style_notes,
                            'palette' => !empty($data['palette']) ? $data['palette'] : $look->palette,
                        ]);
                        $updated++;
                    } else {
                        Look::create([
                            'slug' => ($data['slug'] ?? null) ?: Str::slug($data['event'] ?? Str::random(8)),
                            'event' => $data['event'] ?? 'Untitled look',
                            'tags' => $data['tags'] ?? [],
                            'hero_img' => $data['heroImg'] ?? null,
                            'style_notes' => $data['styleNotes'] ?? null,
                            'palette' => $data['palette'] ?? [],
                            'grid_items' => [],
                            'products' => [],
                        ]);
                        $created++;
                    }
                } catch (\Throwable $e) {
                    $errors[] = ['row' => $i, 'message' => $e->getMessage()];
                }
            }
        });

        return response()->json(compact('created', 'updated', 'skipped', 'errors'));
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
        $created = 0; $updated = 0; $skipped = 0; $errors = [];

        DB::transaction(function () use ($request, &$created, &$updated, &$skipped, &$errors) {
            foreach ($request->input('items', []) as $i => $item) {
                $action = $item['action'] ?? 'skip';
                if ($action === 'skip') { $skipped++; continue; }
                $data = $item['data'] ?? [];

                try {
                    if ($action === 'update' && !empty($item['id'])) {
                        $video = Video::findOrFail($item['id']);
                        $video->update([
                            'title' => ($data['title'] ?? null) ?: $video->title,
                            'tag' => ($data['tag'] ?? null) ?: $video->tag,
                            'thumb' => ($data['thumb'] ?? null) ?: $video->thumb,
                            'youtube' => ($data['youtube'] ?? null) ?: $video->youtube,
                            'video_url' => ($data['video_url'] ?? null) ?: $video->video_url,
                            'duration' => $data['duration'] ?? $video->duration,
                            'products' => !empty($data['products']) ? $data['products'] : $video->products,
                        ]);
                        $updated++;
                    } else {
                        $maxOrder = Video::max('sort_order') ?? 0;
                        Video::create([
                            'vid_id' => 'v-' . Str::random(8),
                            'title' => $data['title'] ?? 'Untitled video',
                            'tag' => ($data['tag'] ?? null) ?: 'Fashion',
                            'thumb' => $data['thumb'] ?? null,
                            'youtube' => $data['youtube'] ?? null,
                            'video_url' => $data['video_url'] ?? null,
                            'duration' => $data['duration'] ?? null,
                            'products' => $data['products'] ?? [],
                            'sort_order' => $maxOrder + 1,
                        ]);
                        $created++;
                    }
                } catch (\Throwable $e) {
                    $errors[] = ['row' => $i, 'message' => $e->getMessage()];
                }
            }
        });

        return response()->json(compact('created', 'updated', 'skipped', 'errors'));
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

    // ── Helpers ───────────────────────────────────────────────

    private function cleanArray(array $arr): array
    {
        return array_values(array_filter(array_map('trim', $arr), fn ($x) => $x !== ''));
    }

    private function cleanSpecs(array $specs): array
    {
        return array_values(array_filter($specs, fn ($r) => ($r[0] ?? '') || ($r[1] ?? '')));
    }
}
