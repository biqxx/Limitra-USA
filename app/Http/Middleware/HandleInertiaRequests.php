<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): string|null
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        $shared = [...parent::share($request)];

        // The admin panel ships its own admin-shaped products/categories via
        // AdminController::index() — skip re-querying the storefront-shaped
        // versions (and storefront-only layout settings) on every admin load.
        if ($request->is('admin*')) {
            return $shared;
        }

        return [
            ...$shared,
            'auth' => [
                'user' => $request->user() ? [
                    'id'    => $request->user()->id,
                    'name'  => $request->user()->name,
                    'email' => $request->user()->email,
                    'phone' => $request->user()->phone,
                ] : null,
            ],
            'categories' => fn () => \App\Models\Category::with('subcategories')->orderBy('sort_order')->get()->map(fn ($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'slug' => $c->slug,
                'img' => $c->img,
                'desc' => $c->desc,
                'count' => $c->count,
                'tagline' => $c->tagline,
                'feature_img' => $c->feature_img,
                'feature_img2' => $c->feature_img2,
                'banner_img' => $c->banner_img,
                'subcategories' => $c->subcategories->pluck('name')->values()->toArray(),
            ]),
            'catalog' => fn () => \App\Models\Product::with(['category', 'subcategory'])->get()->map(fn ($p) => [
                'id' => $p->id,
                'slug' => $p->slug,
                'name' => $p->name,
                'brand' => $p->brand,
                'price' => $p->price,
                'image' => $p->image,
                'category' => $p->category?->name,
                'subcategory' => $p->subcategory?->name,
            ]),
            // Layout-level settings available on every page
            'layoutSettings' => fn () => \App\Models\SiteSetting::whereIn('key', [
                'newsletter_modal_image',
                'newsletter_popup_delay_ms',
                'newsletter_popup_cooldown_ms',
                'social_instagram_url',
                'social_facebook_url',
                'social_pinterest_url',
                'social_x_url',
                'social_tiktok_url',
                'social_linkedin_url',
                'social_snapchat_url',
            ])->pluck('value', 'key')->toArray(),
        ];
    }
}
