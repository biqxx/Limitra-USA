@php
    $productMeta = $page['props']['product'] ?? null;
    $articleMeta = $page['props']['article'] ?? null;
    $guideMeta = $page['props']['guide'] ?? null;
    $lookMeta = $page['props']['look'] ?? null;

    $ogSiteName = config('app.name', 'Limitra USA');
    $ogTitle = $ogSiteName;
    $ogDesc = 'Independently curated fashion, beauty, home and lifestyle picks from third-party retailers. Limitra may earn a commission from eligible purchases.';
    $ogImage = url('/og-image.jpg');
    $ogType = 'website';
    $ogUrl = url()->current();
    $productSchema = null;

    if ($productMeta) {
        $pName = $productMeta['name'] ?? '';
        $pBrand = $productMeta['brand'] ?? '';
        $ogTitle = $pBrand ? "{$pName} by {$pBrand} — {$ogSiteName}" : "{$pName} — {$ogSiteName}";
        $pDesc = $productMeta['description'] ?? '';
        $retailer = trim((string) ($productMeta['retailer'] ?? ''));
        $affiliateUrl = trim((string) ($productMeta['affiliate_url'] ?? ''));
        $rawPrice = trim((string) ($productMeta['price'] ?? ''));
        $schemaPrice = null;
        $schemaCurrency = 'USD';

        // Product prices are stored as display strings (for example "$1,299.00").
        // Google requires Offer.price to be numeric and priceCurrency to be ISO 4217.
        if (preg_match('/\d[\d,\s]*(?:\.\d+)?/', $rawPrice, $priceMatch)) {
            $numericPrice = str_replace([',', ' '], '', $priceMatch[0]);
            if (is_numeric($numericPrice) && (float) $numericPrice >= 0) {
                $schemaPrice = number_format((float) $numericPrice, 2, '.', '');
            }
        }

        $upperPrice = strtoupper($rawPrice);
        if (str_contains($upperPrice, 'GBP') || str_contains($rawPrice, '£')) {
            $schemaCurrency = 'GBP';
        } elseif (str_contains($upperPrice, 'EUR') || str_contains($rawPrice, '€')) {
            $schemaCurrency = 'EUR';
        } elseif (str_contains($upperPrice, 'NGN') || str_contains($rawPrice, '₦')) {
            $schemaCurrency = 'NGN';
        } elseif (str_contains($upperPrice, 'CAD') || str_contains($upperPrice, 'C$')) {
            $schemaCurrency = 'CAD';
        } elseif (str_contains($upperPrice, 'AUD') || str_contains($upperPrice, 'A$')) {
            $schemaCurrency = 'AUD';
        }
        $baseDesc = \Illuminate\Support\Str::limit(!empty($pDesc) ? strip_tags($pDesc) : 'A Limitra USA independently curated product listing.', 105);
        $retailerContext = $retailer ? " Available from {$retailer}." : '';
        $affiliateContext = $affiliateUrl ? ' This page contains an affiliate link; Limitra may earn a commission at no extra cost to you.' : '';
        $ogDesc = $baseDesc . $retailerContext . $affiliateContext;
        if (!empty($productMeta['image'])) {
            $rawImg = $productMeta['image'];
            $ogImage = \Illuminate\Support\Str::startsWith($rawImg, ['http://', 'https://']) ? $rawImg : url($rawImg);
        }
        $ogType = 'product';
        $productSchema = array_filter([
            '@context' => 'https://schema.org',
            '@type' => 'Product',
            'name' => $pName,
            'brand' => $pBrand ? ['@type' => 'Brand', 'name' => $pBrand] : null,
            'description' => $ogDesc,
            'image' => $ogImage,
            'url' => $ogUrl,
            'offers' => ($affiliateUrl && $schemaPrice !== null) ? array_filter([
                '@type' => 'Offer',
                'url' => $affiliateUrl,
                'price' => $schemaPrice,
                'priceCurrency' => $schemaCurrency,
                'seller' => $retailer ? ['@type' => 'Organization', 'name' => $retailer] : null,
            ]) : null,
        ]);
    } elseif ($articleMeta) {
        $ogTitle = ($articleMeta['title'] ?? '') . " — {$ogSiteName}";
        $aDesc = $articleMeta['excerpt'] ?? ($articleMeta['body'] ?? '');
        if (!empty($aDesc)) {
            $ogDesc = \Illuminate\Support\Str::limit(strip_tags($aDesc), 160);
        }
        if (!empty($articleMeta['img'])) {
            $rawImg = $articleMeta['img'];
            $ogImage = \Illuminate\Support\Str::startsWith($rawImg, ['http://', 'https://']) ? $rawImg : url($rawImg);
        }
        $ogType = 'article';
    } elseif ($guideMeta) {
        $ogTitle = ($guideMeta['title'] ?? '') . " — {$ogSiteName}";
        $gDesc = $guideMeta['excerpt'] ?? '';
        if (!empty($gDesc)) {
            $ogDesc = \Illuminate\Support\Str::limit(strip_tags($gDesc), 160);
        }
        if (!empty($guideMeta['img'])) {
            $rawImg = $guideMeta['img'];
            $ogImage = \Illuminate\Support\Str::startsWith($rawImg, ['http://', 'https://']) ? $rawImg : url($rawImg);
        }
        $ogType = 'article';
    } elseif ($lookMeta) {
        $ogTitle = ($lookMeta['event'] ?? 'Curated Look') . " — {$ogSiteName}";
        $ogDesc = 'Curated fashion and lifestyle look on Limitra USA.';
        if (!empty($lookMeta['hero_img'])) {
            $rawImg = $lookMeta['hero_img'];
            $ogImage = \Illuminate\Support\Str::startsWith($rawImg, ['http://', 'https://']) ? $rawImg : url($rawImg);
        }
        $ogType = 'article';
    }
@endphp
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <link rel="icon" type="image/x-icon" href="{{ url('/favicon.ico') }}">
    <link rel="icon" type="image/png" sizes="16x16" href="{{ url('/favicon-16x16.png') }}">
    <link rel="icon" type="image/png" sizes="32x32" href="{{ url('/favicon-32x32.png') }}">
    <link rel="apple-touch-icon" sizes="180x180" href="{{ url('/apple-touch-icon.png') }}">
    <link rel="manifest" href="{{ url('/site.webmanifest') }}">
    <meta name="theme-color" content="#0b1828">
    <meta name="google-site-verification" content="QBDaNQpvIBNWeOMuoqlLPgbiHuz3Bculk9QWHpdg_k4" />
    <title inertia>{{ $ogTitle }}</title>

    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-XT4CG5WMTS"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-XT4CG5WMTS');
    </script>

    {{-- Primary & Open Graph / Twitter Meta Tags for Social Previews --}}
    <meta name="description" content="{{ $ogDesc }}">
    <meta name="robots" content="max-image-preview:large, max-snippet:-1, max-video-preview:-1">
    <link rel="canonical" href="{{ $ogUrl }}">
    <link rel="alternate" type="application/json" title="Limitra USA public product catalogue" href="{{ url('/catalog.json') }}">
    <meta property="og:site_name" content="{{ $ogSiteName }}">
    <meta property="og:title" content="{{ $ogTitle }}">
    <meta property="og:description" content="{{ $ogDesc }}">
    <meta property="og:image" content="{{ $ogImage }}">
    <meta property="og:url" content="{{ $ogUrl }}">
    <meta property="og:type" content="{{ $ogType }}">
    @if ($productMeta && !empty($productMeta['retailer']))
    <meta property="product:retailer" content="{{ $productMeta['retailer'] }}">
    @endif
    @if ($productMeta && !empty($productMeta['affiliate_url']))
    <meta property="product:affiliate_link" content="{{ $productMeta['affiliate_url'] }}">
    @endif
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{{ $ogTitle }}">
    <meta name="twitter:description" content="{{ $ogDesc }}">
    <meta name="twitter:image" content="{{ $ogImage }}">
    @if ($productSchema)
    <script type="application/ld+json">@json($productSchema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)</script>
    @endif

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,300..900;1,6..96,300..900&family=Jost:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.jsx'])
    @inertiaHead
    <style>
      /* ── Site loader — inline so it renders before the CSS bundle ── */
      #site-loader {
        position: fixed; inset: 0; z-index: 99999;
        background: #0b1828;
        display: flex; align-items: center; justify-content: center;
        flex-direction: column;
        opacity: 1;
        transition: opacity .55s cubic-bezier(.4,0,.2,1),
                    visibility .55s cubic-bezier(.4,0,.2,1);
      }
      #site-loader.sl-done {
        opacity: 0; visibility: hidden; pointer-events: none;
      }
      .sl-wordmark {
        font-family: 'Bodoni Moda', 'Georgia', serif;
        font-size: clamp(28px, 6vw, 44px);
        font-weight: 400;
        letter-spacing: .45em;
        color: #cf8a32;
        margin-bottom: 6px;
        animation: slFadeUp .7s ease both;
      }
      .sl-sub {
        font-family: 'Jost', sans-serif;
        font-size: 10px;
        letter-spacing: .55em;
        text-transform: uppercase;
        color: rgba(255,255,255,.35);
        margin-bottom: 42px;
        animation: slFadeUp .7s .1s ease both;
      }
      .sl-track {
        width: clamp(100px, 18vw, 160px);
        height: 2px;
        background: rgba(255,255,255,.1);
        border-radius: 2px;
        overflow: hidden;
        animation: slFadeUp .7s .18s ease both;
      }
      .sl-fill {
        height: 100%;
        width: 38%;
        background: linear-gradient(90deg, transparent, #cf8a32, transparent);
        border-radius: 2px;
        animation: slShimmer 1.5s ease-in-out infinite;
      }
      @keyframes slFadeUp {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes slShimmer {
        0%   { transform: translateX(-160%); }
        100% { transform: translateX(360%); }
      }
    </style>
</head>
<body class="antialiased">

    <div id="site-loader" role="status" aria-label="Loading Limitra USA">
      <div class="sl-wordmark">LIMITRA</div>
      <div class="sl-sub">USA</div>
      <div class="sl-track"><div class="sl-fill"></div></div>
    </div>

    @inertia
</body>
</html>
