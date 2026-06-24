<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductDetail;
use App\Models\Subcategory;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    private function slugify(string $s): string
    {
        return strtolower(preg_replace('/[^a-z0-9]+/i', '-', $s));
    }

    private function getCategoryId(string $name): ?int
    {
        static $cache = [];
        if (!isset($cache[$name])) {
            $cache[$name] = Category::where('name', $name)->value('id');
        }
        return $cache[$name];
    }

    private function getSubcategoryId(int $categoryId, string $name): ?int
    {
        static $cache = [];
        $key = "{$categoryId}:{$name}";
        if (!isset($cache[$key])) {
            $cache[$key] = Subcategory::where('category_id', $categoryId)->where('name', $name)->value('id');
        }
        return $cache[$key];
    }

    public function run(): void
    {
        // ---- IMPORTED PRODUCTS (40) ----
        $importedProducts = [
            ['id'=>'p001','name'=>'Structured Italian Leather Tote','brand'=>'AUBERTINE','price'=>'$485','category'=>'Women','subcategory'=>'Handbags','retailer'=>'Nordstrom','affiliateUrl'=>'https://example.com/p001','image'=>'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=200&q=80','slot'=>'v1-bag-1','description'=>'A timeless structured tote in full-grain Italian leather. Dual rolled handles, a removable zip pouch, and a polished gold-tone turn-lock closure make it effortlessly versatile from desk to dinner.','editorNote'=>'This is the tote that replaces every other bag in your rotation. The leather softens with every use and the structure never buckles — a genuine investment that only gets better.','tags'=>['luxury','handbags','leather','tote','investment-piece'],'relatedProducts'=>['p002','p003'],'isFeatured'=>true,'isNew'=>false],
            ['id'=>'p002','name'=>'Mini Quilted Chain Shoulder Bag','brand'=>'BELLARA','price'=>'$320','category'=>'Women','subcategory'=>'Handbags','retailer'=>'NET-A-PORTER','affiliateUrl'=>'https://example.com/p002','image'=>'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=200&q=80','slot'=>'v1-bag-2','description'=>'A compact quilted shoulder bag with a signature diamond stitch and adjustable gold chain strap.','editorNote'=>'The kind of evening bag that also works on a Sunday. The quilted leather holds its shape perfectly.','tags'=>['handbags','evening'],'relatedProducts'=>[],'isFeatured'=>false,'isNew'=>true],
            ['id'=>'p003','name'=>'Woven Leather Top Handle Bag','brand'=>'MONTAGUE','price'=>'$595','category'=>'Women','subcategory'=>'Handbags','retailer'=>'Saks Fifth Avenue','affiliateUrl'=>'https://example.com/p003','image'=>'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=200&q=80','slot'=>'v1-bag-3','description'=>'Hand-woven vegetable-tanned leather with a rigid top handle and optional detachable crossbody strap.','editorNote'=>'The weave detail is what makes this bag special. It looks like art on your arm.','tags'=>['luxury','handbags'],'relatedProducts'=>[],'isFeatured'=>true,'isNew'=>false],
            ['id'=>'p004','name'=>'Pebbled Leather Belt Bag','brand'=>'AUBERTINE','price'=>'$215','category'=>'Women','subcategory'=>'Accessories','retailer'=>"Bloomingdale's",'affiliateUrl'=>'https://example.com/p004','image'=>'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=200&q=80','slot'=>'v1-bag-4','description'=>'A sleek pebbled leather belt bag with an adjustable waist strap.','editorNote'=>'Belt bags have earned their permanent place in the wardrobe. This one avoids every trend trap.','tags'=>['handbags','everyday'],'relatedProducts'=>[],'isFeatured'=>false,'isNew'=>false],
            ['id'=>'p005','name'=>'Suede Drawstring Bucket Bag','brand'=>'MONTAGUE','price'=>'$265','category'=>'Women','subcategory'=>'Handbags','retailer'=>'Revolve','affiliateUrl'=>'https://example.com/p005','image'=>'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=200&q=80','slot'=>'v1-bag-5','description'=>'Soft Italian suede bucket bag with a leather drawstring top and long shoulder strap.','editorNote'=>'The suede texture makes it look expensive in a completely different way.','tags'=>['handbags','suede'],'relatedProducts'=>[],'isFeatured'=>false,'isNew'=>true],
            ['id'=>'p006','name'=>'Brightening Vitamin C Serum 20%','brand'=>'LUMIÈRE','price'=>'$68','category'=>'Beauty','subcategory'=>'Skincare','retailer'=>'Sephora','affiliateUrl'=>'https://example.com/p006','image'=>'https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=200&q=80','slot'=>'v2-skin-1','description'=>'A stable 20% L-ascorbic acid serum with ferulic acid and vitamin E.','editorNote'=>'This serum works — full stop. Layer it under SPF every morning without exception.','tags'=>['skincare','serum'],'relatedProducts'=>[],'isFeatured'=>true,'isNew'=>false],
            ['id'=>'p007','name'=>'Peptide Barrier Repair Moisturizer','brand'=>'MAISON GLOW','price'=>'$82','category'=>'Beauty','subcategory'=>'Skincare','retailer'=>'Sephora','affiliateUrl'=>'https://example.com/p007','image'=>'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=200&q=80','slot'=>'v2-skin-2','description'=>'A rich yet non-greasy moisturizer formulated with six peptide complexes, ceramides, and hyaluronic acid.','editorNote'=>'We call this the \'second skin\' moisturizer. One product doing the work of two.','tags'=>['skincare','moisturizer'],'relatedProducts'=>[],'isFeatured'=>false,'isNew'=>false],
            ['id'=>'p008','name'=>'Gentle Milky Foaming Cleanser','brand'=>'CÉLINE BEAUTÉ','price'=>'$38','category'=>'Beauty','subcategory'=>'Skincare','retailer'=>'Ulta Beauty','affiliateUrl'=>'https://example.com/p008','image'=>'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=200&q=80','slot'=>'v2-skin-3','description'=>'A pH-balanced foaming cleanser with oat extract and niacinamide.','editorNote'=>'The cleanser step gets skipped far too often. This one makes the ritual actually enjoyable.','tags'=>['skincare','cleanser'],'relatedProducts'=>[],'isFeatured'=>false,'isNew'=>true],
            ['id'=>'p009','name'=>'Invisible SPF 50+ Sunscreen Fluid','brand'=>'LUMIÈRE','price'=>'$55','category'=>'Beauty','subcategory'=>'Skincare','retailer'=>'Dermstore','affiliateUrl'=>'https://example.com/p009','image'=>'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=200&q=80','slot'=>'v2-skin-4','description'=>'A lightweight SPF 50+ fluid with a truly invisible finish on all skin tones.','editorNote'=>'We love this one because it doesn\'t pill under foundation and doesn\'t leave a white cast.','tags'=>['skincare','sunscreen'],'relatedProducts'=>[],'isFeatured'=>true,'isNew'=>false],
            ['id'=>'p010','name'=>'Relaxed Linen Blazer','brand'=>'ELLSWORTH','price'=>'$285','category'=>'Women','subcategory'=>'Blazers & Jackets','retailer'=>'Revolve','affiliateUrl'=>'https://example.com/p010','image'=>'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=200&q=80','slot'=>'v3-capsule-1','description'=>'A relaxed, unstructured blazer in 100% Belgian linen.','editorNote'=>'The capsule wardrobe starting point. This blazer is the one piece that elevates absolutely everything.','tags'=>['fashion','blazer'],'relatedProducts'=>[],'isFeatured'=>true,'isNew'=>false],
            ['id'=>'p011','name'=>'Classic Poplin Button-Down Shirt','brand'=>'VOSS ATELIER','price'=>'$145','category'=>'Women','subcategory'=>'Tops','retailer'=>'NET-A-PORTER','affiliateUrl'=>'https://example.com/p011','image'=>'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=200&q=80','slot'=>'v3-capsule-2','description'=>'A precision-cut white poplin button-down in Egyptian cotton.','editorNote'=>'There\'s a reason every editor owns one of these. The fit is the trick — slightly oversized changes everything.','tags'=>['fashion','tops'],'relatedProducts'=>[],'isFeatured'=>false,'isNew'=>false],
            ['id'=>'p012','name'=>'High-Waist Tailored Wide-Leg Trousers','brand'=>'ELLSWORTH','price'=>'$195','category'=>'Women','subcategory'=>'Trousers & Pants','retailer'=>'Nordstrom','affiliateUrl'=>'https://example.com/p012','image'=>'https://images.unsplash.com/photo-1503342394128-c104d54dba01?auto=format&fit=crop&w=200&q=80','slot'=>'v3-capsule-3','description'=>'Wide-leg tailored trousers in a wool-blend fabric with high-rise waist.','editorNote'=>'These trousers do the heavy lifting in a capsule wardrobe. They make every top look intentional.','tags'=>['fashion','trousers'],'relatedProducts'=>[],'isFeatured'=>false,'isNew'=>true],
            ['id'=>'p013','name'=>'Fine-Knit Cashmere Crew Sweater','brand'=>'VOSS ATELIER','price'=>'$265','category'=>'Women','subcategory'=>'Knitwear','retailer'=>'Saks Fifth Avenue','affiliateUrl'=>'https://example.com/p013','image'=>'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=200&q=80','slot'=>'v3-capsule-4','description'=>'A slim-fit crew-neck sweater in 100% Grade A Mongolian cashmere.','editorNote'=>'The cashmere sweater is the piece people keep for decades. This one earns it.','tags'=>['fashion','knitwear'],'relatedProducts'=>[],'isFeatured'=>true,'isNew'=>false],
            ['id'=>'p014','name'=>'Bias-Cut Silk Slip Midi Skirt','brand'=>'MARÉ','price'=>'$175','category'=>'Women','subcategory'=>'Skirts','retailer'=>'Revolve','affiliateUrl'=>'https://example.com/p014','image'=>'https://images.unsplash.com/photo-1542060748-10c28b62716f?auto=format&fit=crop&w=200&q=80','slot'=>'v3-capsule-5','description'=>'A bias-cut midi skirt in 100% silk charmeuse with a delicate lace hem.','editorNote'=>'This skirt will be in your wardrobe for ten years. The bias cut means it moves with you.','tags'=>['fashion','skirts'],'relatedProducts'=>[],'isFeatured'=>false,'isNew'=>false],
            ['id'=>'p015','name'=>'Straight-Leg Dark Wash Jeans','brand'=>'ELLSWORTH','price'=>'$165','category'=>'Women','subcategory'=>'Denim','retailer'=>'Nordstrom','affiliateUrl'=>'https://example.com/p015','image'=>'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=200&q=80','slot'=>'v3-capsule-6','description'=>'A straight-leg jean in deep indigo stretch denim with high-rise fit.','editorNote'=>'Dark wash jeans are the capsule wardrobe workhorse. It will look just as right in five years.','tags'=>['fashion','denim'],'relatedProducts'=>[],'isFeatured'=>false,'isNew'=>false],
            ['id'=>'p016','name'=>'Oud & Dark Rose Eau de Parfum 50ml','brand'=>'NOCTURNE','price'=>'$245','category'=>'Beauty','subcategory'=>'Fragrances','retailer'=>'Sephora','affiliateUrl'=>'https://example.com/p016','image'=>'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=200&q=80','slot'=>'v4-frag-1','description'=>'A deep, smoky Eau de Parfum anchored in aged oud and Bulgarian rose.','editorNote'=>'The base layer in any layering routine. This one is complex and beautiful worn alone.','tags'=>['fragrance'],'relatedProducts'=>[],'isFeatured'=>true,'isNew'=>false],
            ['id'=>'p017','name'=>'Bergamot & Cedar Perfume Body Oil','brand'=>'BELLAMY','price'=>'$95','category'=>'Beauty','subcategory'=>'Fragrances','retailer'=>'Revolve','affiliateUrl'=>'https://example.com/p017','image'=>'https://images.unsplash.com/photo-1541643600914-78b084683702?auto=format&fit=crop&w=200&q=80','slot'=>'v4-frag-2','description'=>'A jojoba-based perfume oil with bergamot, white cedar, and warm vetiver base.','editorNote'=>'This is the secret of the layering technique — an oil underneath your perfume locks the scent.','tags'=>['fragrance'],'relatedProducts'=>[],'isFeatured'=>false,'isNew'=>true],
            ['id'=>'p018','name'=>'White Tea & Jasmine Solid Perfume','brand'=>'BELLAMY','price'=>'$65','category'=>'Beauty','subcategory'=>'Fragrances','retailer'=>'Anthropologie','affiliateUrl'=>'https://example.com/p018','image'=>'https://images.unsplash.com/photo-1563170351-be82bc888aa4?auto=format&fit=crop&w=200&q=80','slot'=>'v4-frag-3','description'=>'A travel-friendly solid perfume in a gold compact with fresh white tea and jasmine.','editorNote'=>'The lightest piece in a layering stack. Keep it in your bag and dab over your EDP in the afternoon.','tags'=>['fragrance','travel'],'relatedProducts'=>[],'isFeatured'=>false,'isNew'=>false],
            ['id'=>'p019','name'=>'Hardshell Carry-On Spinner 22"','brand'=>'HAVEN','price'=>'$345','category'=>'Travel','subcategory'=>'Luggage','retailer'=>'Nordstrom','affiliateUrl'=>'https://example.com/p019','image'=>'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=200&q=80','slot'=>'v5-travel-1','description'=>'A lightweight polycarbonate carry-on with dual-spinner wheel system and TSA-approved lock.','editorNote'=>'This carry-on survives exactly the kind of trip this video is about. The spinner wheels glide on cobblestones.','tags'=>['travel','luggage'],'relatedProducts'=>[],'isFeatured'=>true,'isNew'=>false],
            ['id'=>'p020','name'=>'6-Piece Compression Packing Cube Set','brand'=>'ATLAS GEAR','price'=>'$68','category'=>'Travel','subcategory'=>'Travel Accessories','retailer'=>'Amazon','affiliateUrl'=>'https://example.com/p020','image'=>'https://images.unsplash.com/photo-1581553680321-4fffae59fccd?auto=format&fit=crop&w=200&q=80','slot'=>'v5-travel-2','description'=>'A set of six nylon compression packing cubes with two-way zippers that compress by up to 30%.','editorNote'=>'Packing cubes are the single biggest upgrade to how you travel. The colour-coding system means you\'re never digging.','tags'=>['travel','packing'],'relatedProducts'=>[],'isFeatured'=>false,'isNew'=>false],
            ['id'=>'p021','name'=>'Knit Slip-On Travel Sneaker','brand'=>'HAVEN','price'=>'$125','category'=>'Women','subcategory'=>'Shoes','retailer'=>'Revolve','affiliateUrl'=>'https://example.com/p021','image'=>'https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=200&q=80','slot'=>'v5-travel-3','description'=>'A seamless-knit slip-on sneaker with a memory foam insole and flexible rubber outsole.','editorNote'=>'The footwear problem on any long trip is always comfort vs. polish. These sit at the exact intersection.','tags'=>['travel','shoes'],'relatedProducts'=>[],'isFeatured'=>false,'isNew'=>true],
            ['id'=>'p022','name'=>'Slim Leather Passport & Travel Wallet','brand'=>'ATLAS GEAR','price'=>'$85','category'=>'Travel','subcategory'=>'Travel Accessories','retailer'=>'Nordstrom','affiliateUrl'=>'https://example.com/p022','image'=>'https://images.unsplash.com/photo-1473496169904-658ba7574b0d?auto=format&fit=crop&w=200&q=80','slot'=>'v5-travel-4','description'=>'A slim full-grain leather travel wallet with passport window and RFID-blocking lining.','editorNote'=>'One of those pieces you reach for on every trip. The slim profile means it slides easily into a jacket pocket.','tags'=>['travel','wallet'],'relatedProducts'=>[],'isFeatured'=>false,'isNew'=>false],
            ['id'=>'p023','name'=>'Linen Wrap Midi Dress','brand'=>'MARÉ','price'=>'$215','category'=>'Women','subcategory'=>'Dresses','retailer'=>'Revolve','affiliateUrl'=>'https://example.com/p023','image'=>'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=200&q=80','slot'=>'v6-resort-1','description'=>'A midi-length wrap dress in stonewashed linen with adjustable tie waist.','editorNote'=>'The resort dress that does everything — beach to bar, morning to midnight. Pack it, live in it.','tags'=>['fashion','dresses','resort'],'relatedProducts'=>[],'isFeatured'=>true,'isNew'=>false],
            ['id'=>'p024','name'=>'Hand-Block Printed Silk Sarong','brand'=>'MARÉ','price'=>'$145','category'=>'Women','subcategory'=>'Accessories','retailer'=>'NET-A-PORTER','affiliateUrl'=>'https://example.com/p024','image'=>'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=200&q=80','slot'=>'v6-resort-2','description'=>'A hand-block-printed silk twill sarong in a rich botanical print.','editorNote'=>'A silk sarong is the most useful piece in any resort bag. The hand-print detail makes it feel special.','tags'=>['fashion','resort'],'relatedProducts'=>[],'isFeatured'=>false,'isNew'=>true],
            ['id'=>'p025','name'=>'Natural Wicker Oversized Beach Tote','brand'=>'SOLEIL STUDIO','price'=>'$135','category'=>'Women','subcategory'=>'Handbags','retailer'=>'Anthropologie','affiliateUrl'=>'https://example.com/p025','image'=>'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=200&q=80','slot'=>'v6-resort-3','description'=>'A handwoven rattan and seagrass tote with leather top handles.','editorNote'=>'The beach bag category has been ruined by cheap imitations but this one is the genuine article.','tags'=>['handbags','beach'],'relatedProducts'=>[],'isFeatured'=>false,'isNew'=>false],
            ['id'=>'p026','name'=>'Halter Neck One-Piece Swimsuit','brand'=>'MARÉ','price'=>'$165','category'=>'Women','subcategory'=>'Swimwear','retailer'=>'Revolve','affiliateUrl'=>'https://example.com/p026','image'=>'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=200&q=80','slot'=>'v6-resort-4','description'=>'A sculpting halter-neck one-piece in recycled nylon blend.','editorNote'=>'We believe the one-piece has permanently replaced the bikini. This halter version is most universally flattering.','tags'=>['swimwear','resort'],'relatedProducts'=>[],'isFeatured'=>false,'isNew'=>false],
            ['id'=>'p027','name'=>'Raffia Platform Espadrille Wedge','brand'=>'SOLEIL STUDIO','price'=>'$185','category'=>'Women','subcategory'=>'Shoes','retailer'=>'Nordstrom','affiliateUrl'=>'https://example.com/p027','image'=>'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=200&q=80','slot'=>'v6-resort-5','description'=>'A 4-inch raffia-wrapped wedge espadrille with an ankle tie and cushioned footbed.','editorNote'=>'The shoe that turns a beach outfit into a dinner outfit instantly. The height is enough to lengthen without being impractical.','tags'=>['shoes','resort'],'relatedProducts'=>[],'isFeatured'=>true,'isNew'=>false],
            ['id'=>'p028','name'=>'Gold Delicate Multi-Layer Necklace Set','brand'=>'ORRIN','price'=>'$185','category'=>'Women','subcategory'=>'Jewelry','retailer'=>'Nordstrom','affiliateUrl'=>'https://example.com/p028','image'=>'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=200&q=80','slot'=>'v7-jewelry-1','description'=>'A set of three 18k gold vermeil necklaces designed to be worn layered at graduating lengths.','editorNote'=>'This set is engineered to work together perfectly from the box.','tags'=>['jewelry'],'relatedProducts'=>[],'isFeatured'=>true,'isNew'=>false],
            ['id'=>'p029','name'=>'Pavé Diamond Huggie Earrings','brand'=>'ELARA','price'=>'$320','category'=>'Women','subcategory'=>'Jewelry','retailer'=>'Saks Fifth Avenue','affiliateUrl'=>'https://example.com/p029','image'=>'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=200&q=80','slot'=>'v7-jewelry-2','description'=>'14k yellow gold huggie hoops set with 0.18 ctw of round brilliant diamonds.','editorNote'=>'Huggie earrings are the most wearable diamond piece you can own. These sit perfectly close to the ear.','tags'=>['jewelry'],'relatedProducts'=>[],'isFeatured'=>true,'isNew'=>false],
            ['id'=>'p030','name'=>'Twisted Gold Bangle Stack Set','brand'=>'ORRIN','price'=>'$145','category'=>'Women','subcategory'=>'Jewelry','retailer'=>'Revolve','affiliateUrl'=>'https://example.com/p030','image'=>'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?auto=format&fit=crop&w=200&q=80','slot'=>'v7-jewelry-3','description'=>'A set of three 18k gold vermeil bangles in graduating twist weights.','editorNote'=>'Bangles are the most forgiving jewelry to layer because they move naturally throughout the day.','tags'=>['jewelry'],'relatedProducts'=>[],'isFeatured'=>false,'isNew'=>true],
            ['id'=>'p031','name'=>'Freshwater Pearl & Gold Chain Bracelet','brand'=>'ELARA','price'=>'$175','category'=>'Women','subcategory'=>'Jewelry','retailer'=>'NET-A-PORTER','affiliateUrl'=>'https://example.com/p031','image'=>'https://images.unsplash.com/photo-1573408301185-9519f94816e0?auto=format&fit=crop&w=200&q=80','slot'=>'v7-jewelry-4','description'=>'A 14k gold paperclip chain alternating with 5mm freshwater pearls.','editorNote'=>'Pearls and gold together is the most timeless combination in jewelry. This looks intentional next to plain metals.','tags'=>['jewelry'],'relatedProducts'=>[],'isFeatured'=>false,'isNew'=>false],
            ['id'=>'p032','name'=>'Cleansing Balm & Double-Cleanse Oil','brand'=>'CÉLINE BEAUTÉ','price'=>'$58','category'=>'Beauty','subcategory'=>'Skincare','retailer'=>'Sephora','affiliateUrl'=>'https://example.com/p032','image'=>'https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=200&q=80','slot'=>'v8-routine-1','description'=>'A balm-to-oil cleansing formula with jojoba, rosehip, and apricot kernel oils.','editorNote'=>'The first step of the ultimate routine is always the most important. Start here.','tags'=>['skincare'],'relatedProducts'=>[],'isFeatured'=>false,'isNew'=>false],
            ['id'=>'p033','name'=>'Retinol Renewal Night Serum 0.5%','brand'=>'MAISON GLOW','price'=>'$110','category'=>'Beauty','subcategory'=>'Skincare','retailer'=>'Dermstore','affiliateUrl'=>'https://example.com/p033','image'=>'https://images.unsplash.com/photo-1570194065650-d99fb4de8b60?auto=format&fit=crop&w=200&q=80','slot'=>'v8-routine-2','description'=>'A 0.5% encapsulated retinol serum in a slow-release microencapsulation system.','editorNote'=>'Retinol is still the most proven anti-aging ingredient. The encapsulated delivery means you actually get the benefit.','tags'=>['skincare'],'relatedProducts'=>[],'isFeatured'=>true,'isNew'=>false],
            ['id'=>'p034','name'=>'Collagen Hydrogel Eye Patches (30 pairs)','brand'=>'LUMIÈRE','price'=>'$45','category'=>'Beauty','subcategory'=>'Skincare','retailer'=>'Ulta Beauty','affiliateUrl'=>'https://example.com/p034','image'=>'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=200&q=80','slot'=>'v8-routine-3','description'=>'30 pairs of hydrogel eye patches infused with marine collagen, peptides, and caffeine.','editorNote'=>'These are the ten-minute fix that makes you look like you slept eight hours when you didn\'t.','tags'=>['skincare'],'relatedProducts'=>[],'isFeatured'=>false,'isNew'=>true],
            ['id'=>'p035','name'=>'10% Niacinamide Pore-Refining Toner','brand'=>'CÉLINE BEAUTÉ','price'=>'$42','category'=>'Beauty','subcategory'=>'Skincare','retailer'=>'Sephora','affiliateUrl'=>'https://example.com/p035','image'=>'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=200&q=80','slot'=>'v8-routine-4','description'=>'An alcohol-free toner with 10% niacinamide, zinc PCA, and aloe vera.','editorNote'=>'Niacinamide is the unsung hero of a skincare routine. This concentration hits the sweet spot.','tags'=>['skincare'],'relatedProducts'=>[],'isFeatured'=>false,'isNew'=>false],
            ['id'=>'p036','name'=>'Ceramide Barrier Repair Night Cream','brand'=>'MAISON GLOW','price'=>'$78','category'=>'Beauty','subcategory'=>'Skincare','retailer'=>'Dermstore','affiliateUrl'=>'https://example.com/p036','image'=>'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=200&q=80','slot'=>'v8-routine-5','description'=>'A rich night cream formulated with ceramide complex. Repairs and strengthens the barrier while you sleep.','editorNote'=>'The final step of a routine matters as much as the first. This genuinely repairs while you sleep.','tags'=>['skincare'],'relatedProducts'=>[],'isFeatured'=>true,'isNew'=>false],
            ['id'=>'p037','name'=>'Organic Cotton Utility Jumpsuit','brand'=>'TERRA LABEL','price'=>'$195','category'=>'Women','subcategory'=>'Jumpsuits & Playsuits','retailer'=>'Reformation','affiliateUrl'=>'https://example.com/p037','image'=>'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=200&q=80','slot'=>'v9-sustain-1','description'=>'A wide-leg utility jumpsuit in GOTS-certified organic cotton twill.','editorNote'=>'Sustainable fashion has a reputation for compromising on style. This jumpsuit refuses that trade-off.','tags'=>['fashion','sustainable'],'relatedProducts'=>[],'isFeatured'=>true,'isNew'=>true],
            ['id'=>'p038','name'=>'Recycled Cashmere Wrap Coat','brand'=>'TERRA LABEL','price'=>'$385','category'=>'Women','subcategory'=>'Blazers & Jackets','retailer'=>'NET-A-PORTER','affiliateUrl'=>'https://example.com/p038','image'=>'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=200&q=80','slot'=>'v9-sustain-2','description'=>'A mid-length wrap coat in a blend of 70% post-consumer recycled cashmere and 30% recycled wool.','editorNote'=>'Recycled cashmere is now genuinely indistinguishable from virgin cashmere in quality.','tags'=>['fashion','sustainable'],'relatedProducts'=>[],'isFeatured'=>true,'isNew'=>false],
            ['id'=>'p039','name'=>'Organic Cotton Essential Tee Set (3-pack)','brand'=>'COMMON THREAD','price'=>'$85','category'=>'Women','subcategory'=>'Tops','retailer'=>'Everlane','affiliateUrl'=>'https://example.com/p039','image'=>'https://images.unsplash.com/photo-1467043153537-a4fba2cd39ef?auto=format&fit=crop&w=200&q=80','slot'=>'v9-sustain-3','description'=>'A three-pack of crew-neck essential tees in 100% GOTS-certified organic cotton.','editorNote'=>'The basics category is where sustainable fashion makes the most immediate practical sense.','tags'=>['fashion','sustainable'],'relatedProducts'=>[],'isFeatured'=>false,'isNew'=>false],
            ['id'=>'p040','name'=>'Deadstock Silk Wrap Skirt','brand'=>'COMMON THREAD','price'=>'$155','category'=>'Women','subcategory'=>'Skirts','retailer'=>'Reformation','affiliateUrl'=>'https://example.com/p040','image'=>'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=200&q=80','slot'=>'v9-sustain-4','description'=>'A midi wrap skirt made from surplus deadstock silk fabric.','editorNote'=>'Deadstock is the most transparent form of sustainable fashion — instead of producing new material, it uses what already exists.','tags'=>['fashion','sustainable'],'relatedProducts'=>[],'isFeatured'=>false,'isNew'=>true],
        ];

        $usedIds = [];
        foreach ($importedProducts as $p) {
            $catId = $this->getCategoryId($p['category']);
            $subId = $catId ? $this->getSubcategoryId($catId, $p['subcategory']) : null;
            Product::create([
                'id' => $p['id'],
                'name' => $p['name'],
                'brand' => $p['brand'],
                'price' => $p['price'],
                'category_id' => $catId,
                'subcategory_id' => $subId,
                'retailer' => $p['retailer'],
                'affiliate_url' => $p['affiliateUrl'],
                'image' => $p['image'],
                'slot' => $p['slot'],
                'description' => $p['description'],
                'editor_note' => $p['editorNote'],
                'is_featured' => $p['isFeatured'],
                'is_new' => $p['isNew'],
                'badge' => null,
                'rating' => null,
                'days_ago' => 0,
                'tags' => $p['tags'],
                'related_products' => $p['relatedProducts'],
                'features' => [],
            ]);
            $usedIds[] = $p['id'];
        }

        // ---- CATALOG_DEF generated products ----
        $catalogDef = [
            'Women' => [
                'Dresses' => ['Floral Maxi Dress', 'Silk Slip Dress', 'Linen Shirt Dress', 'Pleated Midi Dress'],
                'Tops & Knitwear' => ['Cashmere Crew Knit', 'Silk Camisole', 'Ribbed Mock-Neck Top'],
                'Handbags' => ['Leather Shoulder Bag', 'Woven Raffia Tote', 'Quilted Crossbody Bag'],
                'Shoes' => ['Leather Mules', 'Strappy Heeled Sandals', 'Pointed Ballet Flats'],
                'Jewelry' => ['Gold Hoop Earrings', 'Pearl Pendant Necklace', 'Stacking Ring Set'],
                'Accessories' => ['Silk Twill Scarf', 'Iconic Sunglasses', 'Leather Waist Belt'],
            ],
            'Men' => [
                'Shirts' => ['Oxford Cotton Shirt', 'Linen Camp Shirt', 'Merino Polo'],
                'Outerwear' => ['Wool Overcoat', 'Quilted Field Jacket', 'Suede Bomber'],
                'Watches' => ['Chronograph Watch', 'Automatic Dress Watch', 'Steel Field Watch'],
                'Shoes' => ['Premium Leather Sneakers', 'Suede Derby Shoes', 'Leather Loafers'],
                'Bags' => ['Leather Weekender', 'Canvas Briefcase', 'Slim Card Holder'],
                'Grooming' => ['Cedar Beard Oil', 'Sandalwood Soap Bar', 'Travel Grooming Kit'],
            ],
            'Beauty' => [
                'Skincare' => ['Vitamin C Serum', 'Hydrating Moisturizer', 'Gentle Cleansing Balm'],
                'Makeup' => ['Satin Lipstick', 'Luminous Foundation', 'Eyeshadow Palette'],
                'Hair Care' => ['Repair Hair Mask', 'Argan Hair Oil', 'Volumizing Shampoo'],
                'Fragrances' => ['Eau de Parfum', 'Amber Body Mist', 'Layering Oil'],
                'Beauty Tools' => ['Facial Roller', 'Heated Lash Curler', 'Detangling Brush'],
                'Wellness' => ['Collagen Supplement', 'Sleep Tincture', 'Body Dry Brush'],
            ],
            'Home & Living' => [
                'Home Decor' => ['Ceramic Vase', 'Woven Throw Blanket', 'Marble Tray'],
                'Kitchen' => ['Stoneware Mug Set', 'Olive Wood Board', 'Copper Cookware Set'],
                'Tech Gadgets' => ['Wireless Earbuds', 'Smart Aroma Diffuser', 'Charging Stand'],
                'Bedding' => ['Linen Duvet Set', 'Silk Pillowcase', 'Waffle Throw'],
                'Lighting' => ['Brass Table Lamp', 'Rechargeable Candle Lamp', 'Paper Pendant Shade'],
                'Self-Care' => ['Aromatherapy Candle', 'Bath Soak Salts', 'Silk Eye Mask'],
            ],
            'Lifestyle' => [
                'Travel & On-the-Go' => ['Carry-On Spinner', 'Hardshell Check-In', 'Leather Duffel', 'Packing Cube Set', 'Memory Travel Pillow'],
                'Everyday Essentials' => ['Travel Toiletry Kit', 'Insulated Water Bottle', 'Universal Adapter', 'Passport Holder', 'RFID Card Wallet'],
                'Fitness & Wellness' => ['Resistance Band Set', 'Foam Roller', 'Yoga Mat'],
                'Tech Accessories' => ['Wireless Earbuds', 'Portable Charger', 'Charging Stand'],
                'Gifts & Finds' => ['Luxury Gift Set', 'Premium Note Set', 'Scented Candle Trio'],
                'Work & Desk' => ['Leather Notebook', 'Desk Organizer', 'Cable Organizer'],
            ],
        ];

        $brands = ['Maison Vale', 'Atelier Nord', 'Lumière', 'Corso', 'Sienna', 'Aubertine', 'Verano', 'Noor', 'Belle Rive', 'Lune'];
        $retailers = ['Net-a-Porter', 'Mr Porter', 'SSENSE', 'Farfetch', 'Revolve', 'Sephora', 'Nordstrom', 'Selfridges'];
        $badgePool = [null, null, 'New', null, null, 'Trending', null, null, "Editor's Pick", null, null, null];
        $priceByCat = [
            'Women' => ['$280', '$195', '$420', '$1,250', '$145', '$340', '$240', '$180', '$95', '$160', '$320', '$210'],
            'Men' => ['$120', '$680', '$420', '$240', '$95', '$180', '$310', '$150', '$88', '$260', '$540', '$140'],
            'Beauty' => ['$58', '$42', '$120', '$160', '$34', '$78', '$95', '$48', '$110', '$28', '$65', '$140'],
            'Home & Living' => ['$48', '$120', '$85', '$240', '$65', '$180', '$95', '$38', '$150', '$72', '$220', '$55'],
            'Lifestyle' => ['$320', '$220', '$95', '$48', '$68', '$150', '$38', '$110', '$420', '$28', '$85', '$62'],
        ];

        $totalIndex = count($usedIds);

        foreach ($catalogDef as $cat => $subcats) {
            $catId = $this->getCategoryId($cat);
            $ci = 0;
            $prices = $priceByCat[$cat] ?? ['$99'];

            foreach ($subcats as $sub => $names) {
                $subId = $catId ? $this->getSubcategoryId($catId, $sub) : null;

                foreach ($names as $name) {
                    $id = $this->slugify($name);
                    // handle duplicates
                    $origId = $id;
                    $suffix = 2;
                    while (in_array($id, $usedIds)) {
                        $id = $origId . '-' . $suffix;
                        $suffix++;
                    }
                    $usedIds[] = $id;

                    $brand = $brands[$totalIndex % count($brands)];
                    $retailer = $retailers[$totalIndex % count($retailers)];
                    $rating = round(4.4 + (($ci * 7) % 6) * 0.1, 1);
                    $reviews = 46 + (($totalIndex * 37) % 280);
                    $badge = $badgePool[$totalIndex % count($badgePool)];
                    $price = $prices[$ci % count($prices)];

                    Product::create([
                        'id' => $id,
                        'name' => $name,
                        'brand' => $brand,
                        'price' => $price,
                        'category_id' => $catId,
                        'subcategory_id' => $subId,
                        'retailer' => $retailer,
                        'affiliate_url' => null,
                        'image' => null,
                        'slot' => $id,
                        'description' => "{$name} from {$brand} — a Limitra-curated " . strtolower($sub) . " piece, chosen for its quality, finish and lasting appeal.",
                        'editor_note' => null,
                        'is_featured' => false,
                        'is_new' => false,
                        'badge' => $badge,
                        'rating' => $rating,
                        'days_ago' => ($totalIndex * 13 + 3) % 58,
                        'tags' => [],
                        'related_products' => [],
                        'features' => [
                            'Editor-selected and quality-checked',
                            'Links to a trusted retailer at the best price',
                            'Free returns available at most partners',
                        ],
                    ]);

                    $ci++;
                    $totalIndex++;
                }
            }
        }

        // ---- Apply CURATED overrides ----
        $curated = [
            'leather-shoulder-bag' => ['price' => '$1,250', 'rating' => 4.8, 'badge' => "Editor's Pick", 'retailer' => 'Net-a-Porter', 'image' => 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=700&q=72', 'description' => 'A structured calf-leather shoulder bag with polished gold hardware and a suede-lined interior — quietly luxurious, and built to anchor a wardrobe for years.', 'features' => ['Full-grain Italian calf leather', 'Gold-tone hardware, adjustable strap', 'Suede-lined interior with zip pocket']],
            'chronograph-watch' => ['price' => '$680', 'rating' => 4.7, 'badge' => null, 'retailer' => 'Mr Porter', 'image' => 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=72', 'description' => 'A precision chronograph with a sunburst navy dial and a brushed-steel bracelet — versatile enough for the boardroom and the weekend alike.', 'features' => ['Swiss quartz chronograph movement', 'Sapphire crystal, 100m water resistance', 'Stainless-steel bracelet with deployant clasp']],
            'iconic-sunglasses' => ['price' => '$340', 'rating' => 4.9, 'badge' => 'Trending', 'retailer' => 'SSENSE', 'image' => 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=700&q=72', 'description' => 'A timeless acetate frame with polarized lenses and gold temple detailing — sun protection with serious editorial credentials.', 'features' => ['Hand-polished acetate frame', 'Polarized, 100% UV-protective lenses', 'Includes leather case & cloth']],
            'premium-leather-sneakers' => ['price' => '$420', 'rating' => 4.6, 'badge' => null, 'retailer' => 'Farfetch', 'image' => 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=700&q=72', 'description' => 'Minimalist low-top sneakers in supple leather with a navy suede heel and a cushioned footbed for all-day wear.', 'features' => ['Premium leather upper, suede accents', 'Cushioned ortholite footbed', 'Hand-finished in Portugal']],
            'floral-maxi-dress' => ['price' => '$280', 'rating' => 4.8, 'badge' => 'New', 'retailer' => 'Revolve', 'image' => 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=700&q=72', 'description' => 'A breezy floral maxi cut from crinkled chiffon, with a tiered skirt that moves beautifully — made for golden-hour dinners by the water.', 'features' => ['Lightweight crinkle chiffon', 'Adjustable tie straps', 'Fully lined, side pockets']],
            'woven-raffia-tote' => ['price' => '$195', 'rating' => 4.7, 'badge' => null, 'retailer' => 'Net-a-Porter', 'image' => 'https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=700&q=72', 'description' => 'A generously sized woven raffia tote with leather handles — equal parts market bag and resort statement.', 'features' => ['Hand-woven natural raffia', 'Leather top handles', 'Roomy unlined interior']],
            'strappy-heeled-sandals' => ['price' => '$340', 'rating' => 4.6, 'badge' => null, 'retailer' => 'Revolve', 'image' => 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=700&q=72', 'description' => 'Sculptural strappy sandals on a comfortable block heel — the kind of pair that carries you from dinner to the dance floor.', 'features' => ['Soft nappa leather straps', 'Comfortable 75mm block heel', 'Cushioned leather footbed']],
            'eau-de-parfum' => ['price' => '$160', 'rating' => 4.9, 'badge' => "Editor's Pick", 'retailer' => 'Sephora', 'image' => 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=700&q=72', 'description' => 'A warm amber-and-neroli eau de parfum with a lingering vanilla base — a signature scent that feels like summer light bottled.', 'features' => ['Notes: neroli, amber, vanilla', 'Long-wear concentration (18%)', '50ml refillable flacon']],
        ];

        foreach ($curated as $productId => $overrides) {
            $product = Product::find($productId);
            if ($product) {
                $product->update($overrides);
            }
        }

        // ---- DETAILS (product_details + product_reviews) ----
        $details = [
            'leather-shoulder-bag' => [
                'about' => [
                    "Some bags chase trends; this one outlives them. The Leather Shoulder Bag from Maison Vale is cut from a single panel of full-grain Italian calfskin, chosen for the way it softens — never slumps — with everyday use.",
                    "The silhouette is deliberately quiet: a clean trapeze body, a structured base that holds its shape, and a strap that drops to a flattering under-arm length. Inside, a suede lining cradles your essentials, with a zip pocket sized for a passport and a slip pocket for a phone.",
                    "It's the piece our editors reach for when they want one object to carry a whole look — equally at home with tailoring or a summer dress.",
                ],
                'highlights' => ["Cut from a single hide for an uninterrupted grain", "Polished gold-tone hardware that won't tarnish", "Holds a 13\" tablet without losing its shape"],
                'specs' => [["Material", "Full-grain Italian calf leather"], ["Dimensions", "28 × 20 × 11 cm"], ["Hardware", "Gold-tone, adjustable strap (52–60 cm)"], ["Lining", "Suede, 1 zip + 1 slip pocket"], ["Made in", "Florence, Italy"]],
                'reviews' => [
                    ['name' => 'Amara O.', 'rating' => 5, 'date' => 'May 2026', 'title' => 'Worth every penny', 'body' => "The leather is unbelievably soft and the gold hardware feels substantial. I've used it daily for a month and it still looks brand new.", 'verified' => true],
                    ['name' => 'Priya S.', 'rating' => 5, 'date' => 'Apr 2026', 'title' => 'My new everyday bag', 'body' => "Fits my tablet, wallet and a small umbrella with room to spare. The strap length is perfect for layering over a coat.", 'verified' => true],
                    ['name' => 'Nadia K.', 'rating' => 4, 'date' => 'Mar 2026', 'title' => 'Beautiful, slightly stiff at first', 'body' => "Took a week of use to soften up but now it's perfect. The suede lining is a lovely touch.", 'verified' => false],
                ],
            ],
            'chronograph-watch' => [
                'reviews' => [
                    ['name' => 'Daniel R.', 'rating' => 5, 'date' => 'May 2026', 'title' => 'Punches well above its price', 'body' => "The sunburst navy dial is gorgeous in daylight. Keeps perfect time and the bracelet sizing was easy.", 'verified' => true],
                    ['name' => 'Marcus T.', 'rating' => 4, 'date' => 'Apr 2026', 'title' => 'Great daily wearer', 'body' => "Solid build, comfortable on the wrist. Wish the lume were a touch brighter, but no real complaints.", 'verified' => true],
                ],
            ],
            'iconic-sunglasses' => [
                'reviews' => [
                    ['name' => 'Lena M.', 'rating' => 5, 'date' => 'May 2026', 'title' => 'Instant classic', 'body' => "These go with everything and the polarized lenses are a genuine upgrade. The case is lovely too.", 'verified' => true],
                    ['name' => 'Sofia D.', 'rating' => 5, 'date' => 'Apr 2026', 'title' => 'So flattering', 'body' => "Suits a round face really well. Lightweight enough that I forget I'm wearing them.", 'verified' => true],
                    ['name' => 'Hannah B.', 'rating' => 4, 'date' => 'Feb 2026', 'title' => 'Lovely, run slightly large', 'body' => "Gorgeous frame — just a hair wide for me, but the gold detail is stunning.", 'verified' => false],
                ],
            ],
            'floral-maxi-dress' => [
                'reviews' => [
                    ['name' => 'Chloe W.', 'rating' => 5, 'date' => 'May 2026', 'title' => 'Made for vacation', 'body' => "The chiffon moves beautifully and it photographs like a dream at sunset. Pockets are a bonus!", 'verified' => true],
                    ['name' => 'Isabel F.', 'rating' => 4, 'date' => 'Apr 2026', 'title' => 'Stunning, size up', 'body' => "Runs a little snug at the bust — sized up and it's perfect. Such a flattering tiered skirt.", 'verified' => true],
                ],
            ],
            'eau-de-parfum' => [
                'reviews' => [
                    ['name' => 'Grace L.', 'rating' => 5, 'date' => 'May 2026', 'title' => 'My signature now', 'body' => "Warm, golden and lasts all day without being heavy. I get compliments every time I wear it.", 'verified' => true],
                    ['name' => 'Olivia P.', 'rating' => 5, 'date' => 'Mar 2026', 'title' => 'Bottled summer', 'body' => "The neroli opening is divine and it dries down to the coziest vanilla. Refillable flacon is a thoughtful touch.", 'verified' => true],
                ],
            ],
        ];

        foreach ($details as $productId => $detail) {
            $product = Product::find($productId);
            if (!$product) continue;

            ProductDetail::create([
                'product_id' => $productId,
                'about' => $detail['about'] ?? null,
                'highlights' => $detail['highlights'] ?? null,
                'specs' => $detail['specs'] ?? null,
            ]);

        }
    }
}
