import { Head } from '@inertiajs/react';

const SITE = 'Limitra USA';
const DEFAULT_DESC = 'Discover editor-vetted fashion, beauty, home & lifestyle picks. Curated finds from trusted retailers, updated weekly.';
const DEFAULT_IMG = 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80';

export default function Seo({ title, description, image, type = 'website', noIndex = false }) {
  const fullTitle = title ? `${title} — ${SITE}` : SITE;
  const desc = ((description || DEFAULT_DESC).replace(/<[^>]+>/g, '')).slice(0, 160);
  const img = image || DEFAULT_IMG;

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      {noIndex && <meta name="robots" content="noindex,nofollow" />}
      <meta property="og:site_name" content={SITE} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:image" content={img} />
      <meta property="og:type" content={type} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={img} />
    </Head>
  );
}
