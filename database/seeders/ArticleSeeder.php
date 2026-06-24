<?php

namespace Database\Seeders;

use App\Models\Article;
use Illuminate\Database\Seeder;

class ArticleSeeder extends Seeder
{
    public function run(): void
    {
        $articles = [
            [
                'slug' => 'bags-to-own-forever',
                'tag' => 'Fashion',
                'category' => 'Women',
                'title' => 'The 12 Bags You Should Own Before You\'re 40',
                'excerpt' => 'From the perfect day bag to the occasion clutch — the structured, the soft and the undeniably iconic.',
                'date' => 'June 10, 2026',
                'author' => 'Limitra Editors',
                'read_time' => '9 min',
                'img' => 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1200&q=75',
                'featured' => true,
                'body' => [
                    ['type' => 'lead', 'text' => "A bag is the one thing in a wardrobe that works regardless of size, season or mood. It's also the one purchase most of us agonise over the longest — and the one that, when right, we stop thinking about entirely. This is our definitive shortlist."],
                    ['type' => 'text', 'text' => "The handbag has always been a statement of intent. Before you've said a word, the bag on your arm is already speaking. It telegraphs practicality or whimsy, investment or spontaneity, quiet confidence or knowing ease. Getting it right isn't about having the most or the newest — it's about having the best version of each archetype your life actually needs."],
                    ['type' => 'heading', 'text' => 'The Every-Day Shoulder Bag'],
                    ['type' => 'text', 'text' => "This is the bag you will wear so often it becomes invisible — which is exactly the point. Look for clean lines, a single compartment large enough for a 13-inch laptop, and hardware that won't tarnish. Full-grain leather is worth the investment: it patinas rather than deteriorates."],
                    ['type' => 'products', 'ids' => ['leather-shoulder-bag', 'quilted-crossbody-bag', 'woven-raffia-tote'], 'label' => 'The everyday edit'],
                    ['type' => 'heading', 'text' => 'The After-Dark Clutch'],
                    ['type' => 'text', 'text' => "Tiny, impractical and completely necessary. The clutch has one job — to make the rest of the outfit look intentional. Keep it simple: a fold-over in satin or a slim box in patent leather will outlast any trend."],
                    ['type' => 'pullquote', 'text' => 'The best bags are the ones you stop noticing — and start depending on.'],
                    ['type' => 'products', 'ids' => ['leather-mules', 'strappy-heeled-sandals', 'pointed-ballet-flats', 'gold-hoop-earrings', 'pearl-pendant-necklace', 'stacking-ring-set'], 'label' => 'Complete the look'],
                    ['type' => 'heading', 'text' => 'The Investment Tote'],
                    ['type' => 'text', 'text' => "The tote has been rehabilitated. Once the territory of canvas and grocery runs, it now arrives in structured leather with polished hardware and commands serious money — for good reason. A luxurious tote that holds everything without looking like it is trying to will serve you for decades."],
                    ['type' => 'products', 'ids' => ['silk-twill-scarf', 'iconic-sunglasses', 'leather-waist-belt', 'cashmere-crew-knit', 'silk-camisole', 'ribbed-mock-neck-top', 'pleated-midi-dress'], 'label' => 'Editor picks'],
                ],
            ],
            [
                'slug' => 'fragrance-wardrobe',
                'tag' => 'Beauty',
                'category' => 'Beauty',
                'title' => 'The Fragrance Wardrobe: A Scent for Every Chapter of Your Day',
                'excerpt' => 'Morning routines, afternoon errands, evening plans — how our editors think about building a fragrance collection that works.',
                'date' => 'June 7, 2026',
                'author' => 'Limitra Beauty Desk',
                'read_time' => '7 min',
                'img' => 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1200&q=75',
                'featured' => false,
                'body' => [
                    ['type' => 'lead', 'text' => "Fragrance is the most intimate of accessories — invisible, deeply personal, and remarkably long-lasting in the memories of the people you encounter. Building a considered scent wardrobe is one of the most quietly luxurious things you can do for yourself."],
                    ['type' => 'text', 'text' => "The idea of owning multiple fragrances is not excess — it's nuance. Just as you wouldn't wear a sequinned dress to a morning meeting, a heady oud isn't what you want drifting around a Saturday farmers' market. A small, curated selection of scents for different moods and moments is the goal."],
                    ['type' => 'heading', 'text' => 'The Morning Scent'],
                    ['type' => 'text', 'text' => "Citrus-forward, light, clean. A morning fragrance should feel like a good start: energising but never loud. Neroli, grapefruit and white florals are natural allies here. These are scents that disappear before lunch — and that's exactly right."],
                    ['type' => 'products', 'ids' => ['eau-de-parfum', 'amber-body-mist', 'layering-oil', 'facial-roller', 'hydrating-moisturizer', 'vitamin-c-serum', 'gentle-cleansing-balm'], 'label' => 'Morning ritual'],
                    ['type' => 'heading', 'text' => 'The Signature Scent'],
                    ['type' => 'text', 'text' => "This is the fragrance people associate with you. Choose it carefully and wear it unapologetically. Woody ambers, warm musks and spiced orientals are perennial classics. Longevity matters here — look for an Eau de Parfum concentration of at least 16%."],
                    ['type' => 'pullquote', 'text' => 'A signature scent is not something you wear. It is something you become.'],
                    ['type' => 'products', 'ids' => ['satin-lipstick', 'luminous-foundation', 'eyeshadow-palette', 'heated-lash-curler', 'detangling-brush', 'repair-hair-mask', 'argan-hair-oil', 'volumizing-shampoo'], 'label' => 'The beauty counter'],
                    ['type' => 'products', 'ids' => ['collagen-supplement', 'sleep-tincture', 'body-dry-brush', 'silk-eye-mask', 'bath-soak-salts', 'aromatherapy-candle', 'smart-aroma-diffuser'], 'label' => 'Wellness & ritual'],
                ],
            ],
            [
                'slug' => 'world-cup-wardrobe',
                'tag' => 'World Cup',
                'category' => 'Women',
                'title' => 'How to Dress for the World Cup (Without Trying Too Hard)',
                'excerpt' => 'Stadium days, fan-zone nights and watch-party weekends — the only guide to dressing for football season you need.',
                'date' => 'June 5, 2026',
                'author' => 'Limitra Style',
                'read_time' => '6 min',
                'img' => 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=75',
                'featured' => false,
                'body' => [
                    ['type' => 'lead', 'text' => "The World Cup only happens every four years. Your wardrobe, however, happens every day. The good news: stadium dressing and personal style are not mutually exclusive — with the right pieces, you can be unmistakably yourself while honouring the occasion."],
                    ['type' => 'heading', 'text' => 'The Stadium Look'],
                    ['type' => 'text', 'text' => "Practicality comes first at the actual stadium. You'll walk a long way, stand for extended periods and possibly endure dramatic swings in temperature. Comfortable footwear is non-negotiable. A structured bag with a zip is your friend. A versatile layer you can tie around your waist covers all conditions."],
                    ['type' => 'products', 'ids' => ['premium-leather-sneakers', 'suede-derby-shoes', 'leather-loafers', 'wool-overcoat', 'quilted-field-jacket', 'suede-bomber', 'canvas-briefcase', 'leather-weekender'], 'label' => 'Stadium-ready'],
                    ['type' => 'heading', 'text' => 'The Watch-Party Weekend'],
                    ['type' => 'text', 'text' => "Watch parties demand something more social — a look that reads put-together without appearing like you've forgotten this is a football occasion. A good watch, clean trainers and a sharply cut casual shirt does the job impeccably for him. For her, an easy dress or polished separates with flat sandals reads exactly right."],
                    ['type' => 'products', 'ids' => ['chronograph-watch', 'automatic-dress-watch', 'steel-field-watch', 'oxford-cotton-shirt', 'linen-camp-shirt', 'merino-polo', 'floral-maxi-dress', 'leather-mules', 'strappy-heeled-sandals'], 'label' => 'The watch-party wardrobe'],
                    ['type' => 'pullquote', 'text' => 'Stadium dressing and personal style are not mutually exclusive.'],
                    ['type' => 'products', 'ids' => ['carry-on-spinner', 'packing-cube-set', 'passport-holder', 'rfid-card-wallet', 'travel-toiletry-kit', 'insulated-water-bottle', 'universal-adapter', 'memory-travel-pillow', 'cable-organizer'], 'label' => 'If you\'re travelling to the games'],
                ],
            ],
            [
                'slug' => 'capsule-wardrobe-2026',
                'tag' => 'Fashion',
                'category' => 'Women',
                'title' => '20 Pieces. Every Outfit You Need This Year.',
                'excerpt' => 'The definitive 2026 capsule wardrobe — from the investment coat to the foolproof flat, built for real life.',
                'date' => 'June 2, 2026',
                'author' => 'Limitra Editors',
                'read_time' => '11 min',
                'img' => 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&w=1200&q=75',
                'featured' => false,
                'body' => [
                    ['type' => 'lead', 'text' => "A capsule wardrobe is not about having fewer things. It is about having the right things — pieces that work together, work hard and never leave you staring at a full wardrobe feeling like you have nothing to wear."],
                    ['type' => 'text', 'text' => "The goal is a wardrobe with no passengers: every single piece should earn its hanger space by combining with at least four other items. Here is how we'd build it from scratch in 2026, with quality and longevity at every step."],
                    ['type' => 'heading', 'text' => 'The Foundation Layer'],
                    ['type' => 'text', 'text' => "A capsule starts not with statement pieces, but with the quiet anchors that make everything else possible. Think of these as the grammar of your wardrobe — the rules that let everything else communicate clearly."],
                    ['type' => 'products', 'ids' => ['silk-camisole', 'cashmere-crew-knit', 'ribbed-mock-neck-top', 'floral-maxi-dress', 'silk-slip-dress', 'linen-shirt-dress', 'pleated-midi-dress', 'wool-overcoat', 'quilted-field-jacket'], 'label' => 'The foundation'],
                    ['type' => 'heading', 'text' => 'The Finishing Touches'],
                    ['type' => 'text', 'text' => "Accessories are where a capsule wardrobe becomes personal. Three pieces of jewellery, two bags and a single great pair of sunglasses will transform everything underneath them. Invest here without apology."],
                    ['type' => 'pullquote', 'text' => 'Buy less. Choose well. Make it last. Still the only rule that matters.'],
                    ['type' => 'products', 'ids' => ['leather-shoulder-bag', 'woven-raffia-tote', 'leather-mules', 'pointed-ballet-flats', 'strappy-heeled-sandals', 'gold-hoop-earrings', 'pearl-pendant-necklace', 'stacking-ring-set', 'silk-twill-scarf', 'iconic-sunglasses', 'leather-waist-belt', 'chronograph-watch'], 'label' => 'Accessories that do everything'],
                ],
            ],
            [
                'slug' => 'travel-edit-editors-pack',
                'tag' => 'Travel',
                'category' => 'Travel',
                'title' => "Everything Our Editors Actually Pack (And Nothing They Don't)",
                'excerpt' => 'After countless trips, our editors have refined their packing lists to 28 things. Here, every single one.',
                'date' => 'May 30, 2026',
                'author' => 'Limitra Travel Desk',
                'read_time' => '10 min',
                'img' => 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=75',
                'featured' => false,
                'body' => [
                    ['type' => 'lead', 'text' => "The best-packed bag is always a ruthlessly edited one. There is a particular pleasure in arriving at a destination knowing that everything in your case is exactly what you need — no dead weight, no regret buys, no 'just in case' items that stay folded for the entire trip."],
                    ['type' => 'text', 'text' => "What follows is the result of collective years of international travel, borrowed hotel irons, lost chargers and hard-won lessons about what actually makes a trip better."],
                    ['type' => 'heading', 'text' => 'The Luggage'],
                    ['type' => 'text', 'text' => "Carry-on only, where possible. The single biggest quality-of-life improvement in travel is avoiding the baggage carousel entirely. A well-organised 40L spinner, a compact packing cube system and ruthless clothing choices make this achievable for up to two weeks."],
                    ['type' => 'products', 'ids' => ['carry-on-spinner', 'hardshell-check-in', 'leather-duffel', 'packing-cube-set', 'memory-travel-pillow'], 'label' => 'The bag situation'],
                    ['type' => 'heading', 'text' => 'The Non-Negotiable Essentials'],
                    ['type' => 'text', 'text' => "The difference between a good trip and a great one is often a single forgotten item. Our editors maintain a permanent list — not of clothes, but of the objects that make travel comfortable, organised and, occasionally, civilised."],
                    ['type' => 'products', 'ids' => ['passport-holder', 'rfid-card-wallet', 'cable-organizer', 'travel-toiletry-kit', 'insulated-water-bottle', 'universal-adapter'], 'label' => 'Never forget these'],
                    ['type' => 'heading', 'text' => 'The In-Transit Beauty Edit'],
                    ['type' => 'text', 'text' => "Airport skin is a real phenomenon. Between recycled cabin air, stress and disrupted sleep schedules, your complexion takes a beating in transit. This is not the moment to skimp on skincare — it is the moment to edit it to the essentials that actually work."],
                    ['type' => 'products', 'ids' => ['vitamin-c-serum', 'hydrating-moisturizer', 'gentle-cleansing-balm', 'silk-eye-mask', 'eau-de-parfum', 'satin-lipstick', 'argan-hair-oil', 'repair-hair-mask'], 'label' => 'Travel beauty'],
                    ['type' => 'products', 'ids' => ['chronograph-watch', 'premium-leather-sneakers', 'cashmere-crew-knit', 'silk-camisole', 'linen-shirt-dress', 'leather-weekender', 'iconic-sunglasses', 'leather-waist-belt'], 'label' => 'The travel wardrobe'],
                ],
            ],
        ];

        foreach ($articles as $article) {
            Article::create($article);
        }
    }
}
