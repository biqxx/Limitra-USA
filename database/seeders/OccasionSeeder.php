<?php

namespace Database\Seeders;

use App\Models\Occasion;
use Illuminate\Database\Seeder;

class OccasionSeeder extends Seeder
{
    public function run(): void
    {
        $occasions = [
            [
                'key' => 'worldcup',
                'featured' => true,
                'title' => 'World Cup Edit',
                'eyebrow' => 'Limited · 2026',
                'tagline' => 'The official fan wardrobe — curated looks for the stadiums, fan zones and watch parties of the century.',
                'badge' => '⚽ World Cup 2026',
                'color' => '#16357a',
                'accent' => '#cf8a32',
                'img' => 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1400&q=75',
                'link' => '/collection/worldcup',
                'subcats' => ['Shoes', 'Outerwear', 'Watches', 'Luggage', 'Travel Gear', 'Travel Accessories'],
                'sort_order' => 1,
            ],
            [
                'key' => 'graduation',
                'featured' => false,
                'title' => 'Graduation Edit',
                'eyebrow' => 'Celebrate in Style',
                'tagline' => 'Dresses, jewels and beauty essentials for your big day.',
                'badge' => '🎓 Graduation',
                'color' => '#21406f',
                'accent' => '#b9974c',
                'img' => 'https://images.unsplash.com/photo-1627556704290-2b1f5853ff78?auto=format&fit=crop&w=900&q=72',
                'link' => '/collection/graduation',
                'subcats' => ['Dresses', 'Jewelry', 'Handbags', 'Shoes', 'Makeup', 'Fragrances'],
                'sort_order' => 2,
            ],
            [
                'key' => 'halloween',
                'featured' => false,
                'title' => 'Halloween Edit',
                'eyebrow' => 'Dark & Wonderful',
                'tagline' => 'Bold beauty, moody fragrance and statement pieces for the most theatrical night of the year.',
                'badge' => '🎃 Halloween',
                'color' => '#2c1a0e',
                'accent' => '#d4661a',
                'img' => 'https://images.unsplash.com/photo-1509557965875-b88c97052f0e?auto=format&fit=crop&w=900&q=72',
                'link' => '/collection/halloween',
                'subcats' => ['Makeup', 'Fragrances', 'Home Decor', 'Accessories', 'Self-Care'],
                'sort_order' => 3,
            ],
            [
                'key' => 'preloved',
                'featured' => false,
                'title' => 'Pre-loved Treasures',
                'eyebrow' => 'Vintage · Investment',
                'tagline' => 'Iconic pieces with history — timeless finds that only get better with age.',
                'badge' => '♻️ Pre-loved',
                'color' => '#3a2e1e',
                'accent' => '#bb9357',
                'img' => 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=900&q=72',
                'link' => '/collection/preloved',
                'subcats' => ['Handbags', 'Watches', 'Jewelry', 'Shoes', 'Accessories'],
                'sort_order' => 4,
            ],
        ];

        foreach ($occasions as $occ) {
            Occasion::create($occ);
        }
    }
}
