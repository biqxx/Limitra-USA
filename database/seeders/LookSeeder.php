<?php

namespace Database\Seeders;

use App\Models\Look;
use Illuminate\Database\Seeder;

class LookSeeder extends Seeder
{
    public function run(): void
    {
        $looks = [
            [
                'slug' => 'evening-elegance',
                'event' => 'Evening Elegance',
                'tags' => ['Colorful Sophistication', 'Playful Luxury'],
                'hero_slot' => 'look-evening-hero',
                'hero_img' => 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80',
                'style_notes' => 'A statement bag anchors a sleek, understated silhouette. Pearl and gold jewelry keep the palette warm while elevating the overall finish — the key is restraint in fabric, boldness in accessories.',
                'palette' => ['#e8c4c8', '#1a2744', '#c4a882', '#e8d5b0', '#2c3e50'],
                'products' => ['silk-slip-dress', 'pearl-pendant-necklace', 'gold-hoop-earrings', 'stacking-ring-set', 'leather-shoulder-bag', 'quilted-crossbody-bag', 'strappy-heeled-sandals', 'iconic-sunglasses'],
            ],
            [
                'slug' => 'graduation-day',
                'event' => 'Graduation Day',
                'tags' => ['Polished & Proud', 'Elevated Classic'],
                'hero_slot' => 'look-grad-hero',
                'hero_img' => 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=80',
                'style_notes' => 'Graduation calls for a look that photographs beautifully and feels significant. A structured midi in neutral tones sets the foundation — gold jewelry and a classic tote carry the moment with effortless polish.',
                'palette' => ['#f5f0e8', '#c9a96e', '#2c3e50', '#e8d5b0', '#8b7355'],
                'products' => ['pleated-midi-dress', 'pearl-pendant-necklace', 'gold-hoop-earrings', 'stacking-ring-set', 'woven-raffia-tote', 'leather-shoulder-bag', 'leather-mules', 'silk-twill-scarf'],
            ],
            [
                'slug' => 'resort-escape',
                'event' => 'Resort Escape',
                'tags' => ['Sun-Kissed Style', 'Effortless Ease'],
                'hero_slot' => 'look-resort-hero',
                'hero_img' => 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&q=80',
                'style_notes' => 'Resort dressing is about looking considered without trying too hard. Light fabrics and natural materials let a single statement accessory — a printed scarf or bold sunglasses — do all the work.',
                'palette' => ['#f0e4cc', '#6b9e8a', '#e8c4a0', '#3a7d6b', '#d4956a'],
                'products' => ['floral-maxi-dress', 'woven-raffia-tote', 'strappy-heeled-sandals', 'iconic-sunglasses', 'eau-de-parfum', 'silk-twill-scarf', 'stacking-ring-set', 'leather-mules'],
            ],
            [
                'slug' => 'world-cup-mens',
                'event' => 'World Cup Watch Party',
                'tags' => ['Sharp Casual', 'Stadium Style'],
                'hero_slot' => 'look-wc-hero',
                'hero_img' => 'https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&w=900&q=80',
                'style_notes' => 'A clean linen shirt and polished sneakers read put-together without effort. The watch is the real statement — and a structured bag keeps everything organised while the game demands your attention.',
                'palette' => ['#1a2744', '#cf8a32', '#f8f6f1', '#2d5a8a', '#c4a882'],
                'products' => ['linen-camp-shirt', 'chronograph-watch', 'premium-leather-sneakers', 'canvas-briefcase', 'merino-polo', 'steel-field-watch', 'leather-loafers', 'slim-card-holder'],
            ],
        ];

        foreach ($looks as $look) {
            Look::create($look);
        }
    }
}
