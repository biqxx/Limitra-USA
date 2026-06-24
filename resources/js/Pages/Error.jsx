import { useState } from 'react';
import { Link } from '@inertiajs/react';
import Layout from '../Components/Layout';
import Seo from '../Components/Seo';
import { SavedDrawer } from '../Components/ProductCard';

const PAGES = {
  404: {
    eyebrow: 'Page Not Found',
    headline: 'We couldn’t find that page.',
    body: 'The link may be broken, the page may have moved, or it may no longer exist.',
    cta: { text: 'Back to Home', href: '/' },
    links: [
      { label: 'New Arrivals', href: '/collection/new' },
      { label: 'Buying Guides', href: '/guides' },
      { label: 'Style the Look', href: '/looks' },
    ],
  },
  500: {
    eyebrow: 'Something Went Wrong',
    headline: 'An unexpected error occurred.',
    body: 'We’ve been notified and are working on a fix. Please try again in a moment.',
    cta: { text: 'Refresh Page', href: null },
  },
  503: {
    eyebrow: 'Under Maintenance',
    headline: 'We’ll be right back.',
    body: 'Limitra USA is briefly unavailable for scheduled maintenance. Thank you for your patience.',
    cta: { text: 'Try Again', href: null },
  },
};

export default function Error({ status = 500 }) {
  const pg = PAGES[status] || PAGES[500];
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <Layout savedCount={0} onOpenSaved={() => setDrawerOpen(true)}>
      <Seo title={pg.eyebrow} description={pg.body} />

      <div className="wrap">
        <div style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 0',
        }}>
          <div style={{ textAlign: 'center', maxWidth: 520 }}>

            {/* Watermark status code */}
            <div style={{
              fontSize: 'clamp(96px, 18vw, 160px)',
              fontFamily: 'var(--font-display, "Bodoni Moda"), serif',
              fontWeight: 700,
              color: 'var(--brand)',
              lineHeight: 1,
              letterSpacing: '-0.03em',
              opacity: 0.08,
              userSelect: 'none',
              marginBottom: -16,
            }}>
              {status}
            </div>

            <span className="eyebrow" style={{ color: 'var(--accent)', display: 'block', marginBottom: 16 }}>
              {pg.eyebrow}
            </span>

            <h1 style={{
              fontFamily: 'var(--font-display, "Bodoni Moda"), serif',
              fontSize: 'clamp(22px, 4vw, 34px)',
              color: 'var(--brand)',
              margin: '0 0 14px',
              lineHeight: 1.25,
              fontWeight: 700,
            }}>
              {pg.headline}
            </h1>

            <p style={{
              color: 'var(--muted)',
              fontSize: 16,
              lineHeight: 1.75,
              margin: '0 auto 36px',
              maxWidth: 420,
            }}>
              {pg.body}
            </p>

            {pg.cta.href ? (
              <Link href={pg.cta.href} className="btn btn-primary">
                {pg.cta.text}
              </Link>
            ) : (
              <button className="btn btn-primary" onClick={() => window.location.reload()}>
                {pg.cta.text}
              </button>
            )}

            {pg.links && (
              <div style={{
                marginTop: 36,
                paddingTop: 28,
                borderTop: '1px solid var(--line)',
                display: 'flex',
                gap: 24,
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}>
                <span style={{ color: 'var(--muted)', fontSize: 13, letterSpacing: '.04em', textTransform: 'uppercase', fontWeight: 600 }}>
                  Explore instead
                </span>
                {pg.links.map(l => (
                  <Link key={l.href} href={l.href} style={{ color: 'var(--brand)', fontSize: 14, fontWeight: 500 }}>
                    {l.label} →
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <SavedDrawer open={drawerOpen} products={[]} onClose={() => setDrawerOpen(false)}
        onToggle={() => {}} onQuick={() => {}} />
    </Layout>
  );
}
