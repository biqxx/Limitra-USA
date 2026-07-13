<?php

namespace App\Services;

use App\Models\Article;
use App\Models\Category;
use App\Models\Click;
use App\Models\Conversion;
use App\Models\Look;
use App\Models\Occasion;
use App\Models\Product;
use App\Models\ProductDetail;
use App\Models\Subcategory;
use App\Models\Video;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BulkImportService
{
    /**
     * Run a bulk import for the given entity type and return
     * ['created' => int, 'updated' => int, 'skipped' => int, 'errors' => array].
     */
    public function import(string $type, array $items): array
    {
        return match ($type) {
            'products' => $this->importProducts($items),
            'occasions' => $this->importOccasions($items),
            'articles' => $this->importArticles($items),
            'looks' => $this->importLooks($items),
            'videos' => $this->importVideos($items),
            'conversions' => $this->importConversions($items),
            default => throw new \InvalidArgumentException("Unknown bulk import type [{$type}]."),
        };
    }

    public function importProducts(array $items): array
    {
        $created = 0; $updated = 0; $skipped = 0; $errors = [];

        DB::transaction(function () use ($items, &$created, &$updated, &$skipped, &$errors) {
            foreach ($items as $i => $item) {
                $action = $item['action'] ?? 'skip';
                if ($action === 'skip') { $skipped++; continue; }
                $data = $item['data'] ?? [];
                $summary = $data['name'] ?? ('Row ' . ($i + 1));

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
                        $summary = $product->name;
                        $updated++;
                    } else {
                        $id = (string) Str::uuid();
                        Product::create([
                            'id' => $id,
                            'slug' => $this->uniqueProductSlug($data['name'] ?? null),
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
                            'slot' => null,
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
                    $errors[] = ['row' => $i, 'summary' => $summary, 'message' => $e->getMessage()];
                }
            }
        });

        return compact('created', 'updated', 'skipped', 'errors');
    }

    public function importOccasions(array $items): array
    {
        $created = 0; $updated = 0; $skipped = 0; $errors = [];

        DB::transaction(function () use ($items, &$created, &$updated, &$skipped, &$errors) {
            foreach ($items as $i => $item) {
                $action = $item['action'] ?? 'skip';
                if ($action === 'skip') { $skipped++; continue; }
                $data = $item['data'] ?? [];
                $summary = $data['title'] ?? ('Row ' . ($i + 1));

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
                        $summary = $occasion->title;
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
                    $errors[] = ['row' => $i, 'summary' => $summary, 'message' => $e->getMessage()];
                }
            }
        });

        return compact('created', 'updated', 'skipped', 'errors');
    }

    public function importArticles(array $items): array
    {
        $created = 0; $updated = 0; $skipped = 0; $errors = [];

        DB::transaction(function () use ($items, &$created, &$updated, &$skipped, &$errors) {
            foreach ($items as $i => $item) {
                $action = $item['action'] ?? 'skip';
                if ($action === 'skip') { $skipped++; continue; }
                $data = $item['data'] ?? [];
                $summary = $data['title'] ?? ('Row ' . ($i + 1));

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
                        $summary = $article->title;
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
                    $errors[] = ['row' => $i, 'summary' => $summary, 'message' => $e->getMessage()];
                }
            }
        });

        return compact('created', 'updated', 'skipped', 'errors');
    }

    public function importLooks(array $items): array
    {
        $created = 0; $updated = 0; $skipped = 0; $errors = [];

        DB::transaction(function () use ($items, &$created, &$updated, &$skipped, &$errors) {
            foreach ($items as $i => $item) {
                $action = $item['action'] ?? 'skip';
                if ($action === 'skip') { $skipped++; continue; }
                $data = $item['data'] ?? [];
                $summary = $data['event'] ?? ('Row ' . ($i + 1));

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
                        $summary = $look->event;
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
                    $errors[] = ['row' => $i, 'summary' => $summary, 'message' => $e->getMessage()];
                }
            }
        });

        return compact('created', 'updated', 'skipped', 'errors');
    }

    public function importVideos(array $items): array
    {
        $created = 0; $updated = 0; $skipped = 0; $errors = [];

        DB::transaction(function () use ($items, &$created, &$updated, &$skipped, &$errors) {
            foreach ($items as $i => $item) {
                $action = $item['action'] ?? 'skip';
                if ($action === 'skip') { $skipped++; continue; }
                $data = $item['data'] ?? [];
                $summary = $data['title'] ?? ('Row ' . ($i + 1));

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
                        $summary = $video->title;
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
                    $errors[] = ['row' => $i, 'summary' => $summary, 'message' => $e->getMessage()];
                }
            }
        });

        return compact('created', 'updated', 'skipped', 'errors');
    }

    /**
     * Matches each row to the Click that produced it via `sub_id` (appended to
     * the outbound affiliate URL by RedirectController::go), then upserts a
     * Conversion for that click. Rows whose sub_id has no matching click are
     * skipped with an error rather than guessed at.
     */
    public function importConversions(array $items): array
    {
        $created = 0; $updated = 0; $skipped = 0; $errors = [];

        DB::transaction(function () use ($items, &$created, &$updated, &$skipped, &$errors) {
            foreach ($items as $i => $item) {
                $action = $item['action'] ?? 'skip';
                if ($action === 'skip') { $skipped++; continue; }
                $data = $item['data'] ?? [];
                $summary = 'SubID ' . ($data['sub_id'] ?? ('Row ' . ($i + 1)));

                try {
                    $click = Click::where('sub_id', $data['sub_id'] ?? null)->first();
                    if (! $click) {
                        $skipped++;
                        $errors[] = ['row' => $i, 'summary' => $summary, 'message' => "No matching click for SubID \"{$data['sub_id']}\"."];
                        continue;
                    }

                    $product = Product::find($click->product_id);

                    $conversion = Conversion::updateOrCreate(
                        ['click_id' => $click->id],
                        [
                            'product_id' => $click->product_id,
                            'retailer_id' => $product?->retailer_id,
                            'order_date' => $data['order_date'] ?? now()->toDateString(),
                            'units' => $data['units'] ?? 1,
                            'sale_amount' => $data['sale_amount'] ?? 0,
                            'commission_amount' => $data['commission_amount'] ?? 0,
                            'status' => $data['status'] ?? 'pending',
                        ]
                    );

                    $conversion->wasRecentlyCreated ? $created++ : $updated++;
                } catch (\Throwable $e) {
                    $errors[] = ['row' => $i, 'summary' => $summary, 'message' => $e->getMessage()];
                }
            }
        });

        return compact('created', 'updated', 'skipped', 'errors');
    }

    private function uniqueProductSlug(?string $source): string
    {
        $base = Str::slug($source ?: '') ?: Str::slug(Str::random(8));
        $slug = $base;
        $n = 2;
        while (Product::where('slug', $slug)->exists()) {
            $slug = $base . '-' . $n;
            $n++;
        }
        return $slug;
    }

    private function cleanArray(array $arr): array
    {
        return array_values(array_filter(array_map('trim', $arr), fn ($x) => $x !== ''));
    }

    private function cleanSpecs(array $specs): array
    {
        return array_values(array_filter($specs, fn ($r) => ($r[0] ?? '') || ($r[1] ?? '')));
    }
}
