<?php

namespace Database\Seeders;

use App\Models\Video;
use Illuminate\Database\Seeder;

class VideoSeeder extends Seeder
{
    public function run(): void
    {
        $videos = [
            [
                'vid_id' => 'v1',
                'title' => 'The Bag You\'ll Carry Forever',
                'tag' => 'Fashion',
                'thumb' => 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=600&q=75',
                'youtube' => 'dQw4w9WgXcQ',
                'duration' => '4:12',
                'sort_order' => 1,
                'products' => [
                    ['id' => 'p1', 'image' => 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                    ['id' => 'p2', 'image' => 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                    ['id' => 'p3', 'image' => 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                    ['id' => 'p4', 'image' => 'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                    ['id' => 'p5', 'image' => 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                ],
            ],
            [
                'vid_id' => 'v2',
                'title' => 'Morning Skincare That Actually Works',
                'tag' => 'Beauty',
                'thumb' => 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=75',
                'youtube' => 'dQw4w9WgXcQ',
                'duration' => '6:38',
                'sort_order' => 2,
                'products' => [
                    ['id' => 'p1', 'image' => 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                    ['id' => 'p2', 'image' => 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                    ['id' => 'p3', 'image' => 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                    ['id' => 'p4', 'image' => 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                ],
            ],
            [
                'vid_id' => 'v3',
                'title' => 'How to Style a Capsule Wardrobe',
                'tag' => 'Fashion',
                'thumb' => 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=75',
                'youtube' => 'dQw4w9WgXcQ',
                'duration' => '8:05',
                'sort_order' => 3,
                'products' => [
                    ['id' => 'p1', 'image' => 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                    ['id' => 'p2', 'image' => 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                    ['id' => 'p3', 'image' => 'https://images.unsplash.com/photo-1503342394128-c104d54dba01?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                    ['id' => 'p4', 'image' => 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                    ['id' => 'p5', 'image' => 'https://images.unsplash.com/photo-1542060748-10c28b62716f?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                    ['id' => 'p6', 'image' => 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                ],
            ],
            [
                'vid_id' => 'v4',
                'title' => 'Fragrance Layering 101',
                'tag' => 'Beauty',
                'thumb' => 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=600&q=75',
                'youtube' => 'dQw4w9WgXcQ',
                'duration' => '5:21',
                'sort_order' => 4,
                'products' => [
                    ['id' => 'p1', 'image' => 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                    ['id' => 'p2', 'image' => 'https://images.unsplash.com/photo-1541643600914-78b084683702?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                    ['id' => 'p3', 'image' => 'https://images.unsplash.com/photo-1563170351-be82bc888aa4?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                ],
            ],
            [
                'vid_id' => 'v5',
                'title' => 'Pack With Me: World Cup Edition',
                'tag' => 'Travel',
                'thumb' => 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=600&q=75',
                'youtube' => 'dQw4w9WgXcQ',
                'duration' => '7:44',
                'sort_order' => 5,
                'products' => [
                    ['id' => 'p1', 'image' => 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                    ['id' => 'p2', 'image' => 'https://images.unsplash.com/photo-1581553680321-4fffae59fccd?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                    ['id' => 'p3', 'image' => 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                    ['id' => 'p4', 'image' => 'https://images.unsplash.com/photo-1473496169904-658ba7574b0d?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                ],
            ],
            [
                'vid_id' => 'v6',
                'title' => 'Resort Dressing: What Our Editors Pack',
                'tag' => 'Lifestyle',
                'thumb' => 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&q=75',
                'youtube' => 'dQw4w9WgXcQ',
                'duration' => '9:02',
                'sort_order' => 6,
                'products' => [
                    ['id' => 'p1', 'image' => 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                    ['id' => 'p2', 'image' => 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                    ['id' => 'p3', 'image' => 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                    ['id' => 'p4', 'image' => 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                    ['id' => 'p5', 'image' => 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                ],
            ],
            [
                'vid_id' => 'v7',
                'title' => 'Jewelry Layering for Every Occasion',
                'tag' => 'Fashion',
                'thumb' => 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=75',
                'youtube' => 'dQw4w9WgXcQ',
                'duration' => '6:15',
                'sort_order' => 7,
                'products' => [
                    ['id' => 'p1', 'image' => 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                    ['id' => 'p2', 'image' => 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                    ['id' => 'p3', 'image' => 'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                    ['id' => 'p4', 'image' => 'https://images.unsplash.com/photo-1573408301185-9519f94816e0?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                ],
            ],
            [
                'vid_id' => 'v8',
                'title' => 'The Ultimate Skincare Routine',
                'tag' => 'Beauty',
                'thumb' => 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=600&q=75',
                'youtube' => 'dQw4w9WgXcQ',
                'duration' => '7:40',
                'sort_order' => 8,
                'products' => [
                    ['id' => 'p1', 'image' => 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                    ['id' => 'p2', 'image' => 'https://images.unsplash.com/photo-1570194065650-d99fb4de8b60?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                    ['id' => 'p3', 'image' => 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                    ['id' => 'p4', 'image' => 'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                    ['id' => 'p5', 'image' => 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                ],
            ],
            [
                'vid_id' => 'v9',
                'title' => 'Sustainable Fashion Shopping Tips',
                'tag' => 'Fashion',
                'thumb' => 'https://images.unsplash.com/photo-1515562141207-5dca89f118e5?auto=format&fit=crop&w=600&q=75',
                'youtube' => 'dQw4w9WgXcQ',
                'duration' => '8:22',
                'sort_order' => 9,
                'products' => [
                    ['id' => 'p1', 'image' => 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                    ['id' => 'p2', 'image' => 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                    ['id' => 'p3', 'image' => 'https://images.unsplash.com/photo-1467043153537-a4fba2cd39ef?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                    ['id' => 'p4', 'image' => 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=200&q=80', 'href' => '#'],
                ],
            ],
        ];

        foreach ($videos as $video) {
            Video::create($video);
        }
    }
}
