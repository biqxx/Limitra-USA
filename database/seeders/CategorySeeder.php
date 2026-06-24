<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Subcategory;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            [
                'name' => 'Women',
                'slug' => 'women',
                'count' => '1,240 picks',
                'desc' => 'Fashion & accessories',
                'tagline' => 'Curated pieces for style, comfort, and everyday confidence.',
                'img' => 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=700&q=70',
                'feature_img' => 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=500&q=70',
                'feature_img2' => 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=500&q=70',
                'banner_img' => 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=72',
                'slot' => 'cat-women',
                'feature_slot' => 'mega-women',
                'banner_slot' => 'banner-women',
                'sort_order' => 1,
                'subs' => ['Dresses', 'Tops & Knitwear', 'Handbags', 'Shoes', 'Jewelry', 'Accessories'],
            ],
            [
                'name' => 'Men',
                'slug' => 'men',
                'count' => '860 picks',
                'desc' => 'Quality essentials',
                'tagline' => 'Quality essentials, smart accessories, and polished everyday finds.',
                'img' => 'https://images.unsplash.com/photo-1488161628813-04466f872be2?auto=format&fit=crop&w=700&q=70',
                'feature_img' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=70',
                'feature_img2' => 'https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&w=500&q=70',
                'banner_img' => 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?auto=format&fit=crop&w=1600&q=72',
                'slot' => 'cat-men',
                'feature_slot' => 'mega-men',
                'banner_slot' => 'banner-men',
                'sort_order' => 2,
                'subs' => ['Shirts', 'Outerwear', 'Watches', 'Shoes', 'Bags', 'Grooming'],
            ],
            [
                'name' => 'Beauty',
                'slug' => 'beauty',
                'count' => '1,510 picks',
                'desc' => 'Skincare to fragrance',
                'tagline' => 'Skincare, fragrance, tools, and everyday beauty picks made simple.',
                'img' => 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=700&q=70',
                'feature_img' => 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=500&q=70',
                'feature_img2' => 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=500&q=70',
                'banner_img' => 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1600&q=72',
                'slot' => 'cat-beauty',
                'feature_slot' => 'mega-beauty',
                'banner_slot' => 'banner-beauty',
                'sort_order' => 3,
                'subs' => ['Skincare', 'Makeup', 'Hair Care', 'Fragrances', 'Beauty Tools', 'Wellness'],
            ],
            [
                'name' => 'Home & Living',
                'slug' => 'home-living',
                'count' => '720 picks',
                'desc' => 'Decor & lifestyle',
                'tagline' => 'Curated home, kitchen, and lifestyle pieces for a more considered space.',
                'img' => 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=700&q=70',
                'feature_img' => 'https://images.unsplash.com/photo-1567016432779-094069958ea5?auto=format&fit=crop&w=500&q=70',
                'feature_img2' => 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=500&q=70',
                'banner_img' => 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=1600&q=72',
                'slot' => 'cat-home',
                'feature_slot' => 'mega-home',
                'banner_slot' => 'banner-home',
                'sort_order' => 4,
                'subs' => ['Home Decor', 'Kitchen', 'Bedding', 'Lighting', 'Tech Gadgets', 'Self-Care'],
            ],
            [
                'name' => 'Lifestyle',
                'slug' => 'lifestyle',
                'count' => '530 picks',
                'desc' => 'Everyday & travel finds',
                'tagline' => 'Simple, practical, and stylish products that make daily life easier.',
                'img' => 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=700&q=70',
                'feature_img' => 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=500&q=70',
                'feature_img2' => 'https://images.unsplash.com/photo-1501555088652-021faa106b9b?auto=format&fit=crop&w=500&q=70',
                'banner_img' => 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1600&q=72',
                'slot' => 'cat-lifestyle',
                'feature_slot' => 'mega-lifestyle',
                'banner_slot' => 'banner-lifestyle',
                'sort_order' => 5,
                'subs' => ['Travel & On-the-Go', 'Everyday Essentials', 'Fitness & Wellness', 'Tech Accessories', 'Gifts & Finds', 'Work & Desk'],
            ],
            [
                'name' => 'Travel',
                'slug' => 'travel',
                'count' => '340 picks',
                'desc' => 'Travel essentials',
                'tagline' => 'Everything you need for smarter, more stylish travel.',
                'img' => 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=700&q=70',
                'feature_img' => 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=500&q=70',
                'feature_img2' => 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=500&q=70',
                'banner_img' => 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1600&q=72',
                'slot' => 'cat-travel',
                'feature_slot' => 'mega-travel',
                'banner_slot' => 'banner-travel',
                'sort_order' => 6,
                'subs' => ['Luggage', 'Travel Accessories', 'Travel Gear'],
            ],
        ];

        foreach ($categories as $i => $catData) {
            $subs = $catData['subs'];
            unset($catData['subs']);
            $category = Category::create($catData);
            foreach ($subs as $j => $subName) {
                Subcategory::create([
                    'category_id' => $category->id,
                    'name' => $subName,
                    'sort_order' => $j,
                ]);
            }
        }
    }
}
