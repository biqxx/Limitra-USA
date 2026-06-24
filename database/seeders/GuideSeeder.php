<?php

namespace Database\Seeders;

use App\Models\Guide;
use Illuminate\Database\Seeder;

class GuideSeeder extends Seeder
{
    public function run(): void
    {
        $guides = [
            [
                'slug' => 'capsule-wardrobe',
                'tag' => 'Fashion',
                'title' => 'Building a Year-Round Capsule Wardrobe',
                'excerpt' => 'The 12 pieces our editors return to season after season — and how to make them work together.',
                'read_time' => '8 min read',
                'slot' => 'guide-capsule',
                'featured' => true,
                'sort_order' => 1,
            ],
            [
                'slug' => 'skincare-layering',
                'tag' => 'Beauty',
                'title' => 'The Right Order to Layer Your Skincare',
                'excerpt' => 'Serum before moisturizer? Where does SPF go? A simple morning-to-night routine that actually works.',
                'read_time' => '6 min read',
                'slot' => 'guide-skincare',
                'featured' => false,
                'sort_order' => 2,
            ],
            [
                'slug' => 'perfect-handbag',
                'tag' => 'Accessories',
                'title' => 'How to Choose a Handbag That Lasts',
                'excerpt' => 'What to look for in leather, hardware and construction before you invest.',
                'read_time' => '5 min read',
                'slot' => 'guide-handbag',
                'featured' => false,
                'sort_order' => 3,
            ],
            [
                'slug' => 'fragrance-finder',
                'tag' => 'Fragrance',
                'title' => 'Finding Your Signature Scent',
                'excerpt' => 'A plain-language guide to fragrance families, notes and longevity — minus the jargon.',
                'read_time' => '7 min read',
                'slot' => 'guide-fragrance',
                'featured' => false,
                'sort_order' => 4,
            ],
            [
                'slug' => 'carry-on-packing',
                'tag' => 'Travel',
                'title' => 'The Art of Packing Carry-On Only',
                'excerpt' => 'Our editors\' tested system for a week away in a single bag — capsule, cubes and all.',
                'read_time' => '6 min read',
                'slot' => 'guide-packing',
                'featured' => false,
                'sort_order' => 5,
            ],
            [
                'slug' => 'elevated-home',
                'tag' => 'Home',
                'title' => 'Small Upgrades for an Elevated Home',
                'excerpt' => 'The affordable details — lighting, linens, scent — that make a space feel considered.',
                'read_time' => '5 min read',
                'slot' => 'guide-home',
                'featured' => false,
                'sort_order' => 6,
            ],
        ];

        foreach ($guides as $guide) {
            Guide::create($guide);
        }
    }
}
