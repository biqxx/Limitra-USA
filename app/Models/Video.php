<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Video extends Model
{
    protected $fillable = ['vid_id','title','tag','thumb','youtube','video_url','duration','products','sort_order'];
    protected $casts = ['products' => 'array'];

    /**
     * Fetch all videos ordered by sort_order, with product IDs resolved to full product objects.
     */
    public static function allWithProducts(): \Illuminate\Support\Collection
    {
        $videos = static::orderBy('sort_order')->get();

        $allIds = $videos->flatMap(fn ($v) => $v->products ?? [])->flatten()->filter(fn ($id) => is_scalar($id) && $id !== '')->unique()->values();
        $products = Product::whereIn('id', $allIds)->get()->keyBy('id');

        return $videos->map(function ($video) use ($products) {
            $data = $video->toArray();
            $data['products'] = collect($video->products ?? [])
                ->flatten()
                ->filter(fn ($id) => is_scalar($id) && $id !== '')
                ->map(fn ($id) => isset($products[$id]) ? [
                    'id'    => $products[$id]->id,
                    'name'  => $products[$id]->name,
                    'brand' => $products[$id]->brand,
                    'image' => $products[$id]->image,
                ] : null)
                ->filter()
                ->values()
                ->toArray();
            return $data;
        });
    }
}
