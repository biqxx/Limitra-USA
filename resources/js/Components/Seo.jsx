import { Head } from '@inertiajs/react';

const SITE = 'Limitra USA';
const DEFAULT_DESC = 'Independently curated fashion, beauty, home and lifestyle picks from third-party retailers. Limitra may earn a commission from eligible purchases.';
const DEFAULT_IMG = 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80';

export default function Seo({ title, description, image, type = 'website', noIndex = false, canonical, retailer, affiliateUrl }) {
  const fullTitle = title ? `${title} — ${SITE}` : SITE;
  const desc = ((description || DEFAULT_DESC).replace(/<[^>]+>/g, '')).slice(0, 160);
  // Uploaded images are stored as root-relative "/storage/..." URLs (see filesystems.php) so
  // they survive a domain change untouched — but og:image/twitter:image specifically need a
  // fully-qualified URL for link-preview crawlers to fetch it. Resolve against the current
  // origin at render time rather than baking in a domain, so this never goes stale either.
  const rawImg = image || DEFAULT_IMG;
  const img = typeof window !== 'undefined' && rawImg.startsWith('/') ? `${window.location.origin}${rawImg}` : rawImg;
  const currentUrl = canonical || (typeof window !== 'undefined' ? window.location.href : '');
  const productDescription = ((description || DEFAULT_DESC).replace(/<[^>]+>/g, '')).slice(0, 105);
  const retailerName = retailer ? ` Available from ${retailer}.` : '';
  const affiliateNote = affiliateUrl ? ' This page contains an affiliate link; Limitra may earn a commission at no extra cost to you.' : '';
  const productDesc = type === 'product' ? `${productDescription}${retailerName}${affiliateNote}` : desc;

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={productDesc} />
      {noIndex && <meta name="robots" content="noindex,nofollow" />}
      {!noIndex && <meta name="robots" content="max-image-preview:large, max-snippet:-1, max-video-preview:-1" />}
      {currentUrl && <link rel="canonical" href={currentUrl} />}
      <meta property="og:site_name" content={SITE} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={productDesc} />
      <meta property="og:image" content={img} />
      {currentUrl && <meta property="og:url" content={currentUrl} />}
      <meta property="og:type" content={type} />
      {retailer && <meta property="product:retailer" content={retailer} />}
      {affiliateUrl && <meta property="product:affiliate_link" content={affiliateUrl} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={productDesc} />
      <meta name="twitter:image" content={img} />
    </Head>
  );
}
