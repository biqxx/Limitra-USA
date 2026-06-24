<?php

namespace Database\Seeders;

use App\Models\SiteSetting;
use Illuminate\Database\Seeder;

class SiteSettingSeeder extends Seeder
{
    public function run(): void
    {
        $heroSlides = json_encode([
            ['id' => 'h1', 'image' => 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=1920&q=80', 'alt' => 'Luxury lifestyle collection'],
            ['id' => 'h2', 'image' => 'uploads/make_the_handle_of_the_202606150843.jpeg', 'alt' => 'Curated products and accessories'],
            ['id' => 'h3', 'image' => 'uploads/add_a_little_sun_ray_202606150835.jpeg', 'alt' => 'Shopping inspiration with sun rays'],
        ]);

        $settings = [
            ['key' => 'announce_text',              'value' => 'Exclusive access to curated luxury · <strong>Editor-vetted picks, updated weekly</strong>'],
            ['key' => 'hero_eyebrow',               'value' => "Editor's Collection"],
            ['key' => 'hero_title',                 'value' => 'Discover Better Products. Shop Smarter.'],
            ['key' => 'hero_subtitle',              'value' => 'Limitra USA helps you find curated fashion, beauty, home, fitness, technology, and lifestyle picks from trusted retail destinations, organized simply so better choices are easier to find.'],
            ['key' => 'hero_cta_primary',           'value' => 'Explore Curated Finds'],
            ['key' => 'hero_cta_primary_url',       'value' => '/collection/new'],
            ['key' => 'hero_cta_secondary',         'value' => 'Read Shopping Guides'],
            ['key' => 'hero_cta_secondary_url',     'value' => '/guides'],
            ['key' => 'hero_slides',                'value' => $heroSlides],
            ['key' => 'featured_eyebrow',           'value' => "Editor's Edit"],
            ['key' => 'featured_title',             'value' => 'Featured Collection'],
            ['key' => 'featured_sub',               'value' => 'Hand-picked icons our editors are reaching for right now.'],
            ['key' => 'resort_eyebrow',             'value' => 'Sun-soaked'],
            ['key' => 'resort_title',               'value' => 'Resort Picks'],
            ['key' => 'resort_sub',                 'value' => 'Everything you need for golden-hour escapes and poolside ease.'],
            ['key' => 'home_featured_count',        'value' => '8'],
            ['key' => 'home_resort_count',          'value' => '8'],
            ['key' => 'home_articles_count',        'value' => '6'],
            ['key' => 'newsletter_modal_image',     'value' => 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80'],
            ['key' => 'newsletter_popup_delay_ms',  'value' => '3000'],
            ['key' => 'newsletter_popup_cooldown_ms', 'value' => '86400000'],
        ];

        SiteSetting::upsert($settings, ['key'], ['value']);
    }
}
