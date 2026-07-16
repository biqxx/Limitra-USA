import { useState, useEffect } from 'react';
import { usePage, Link } from '@inertiajs/react';
import Layout from '../Components/Layout';
import Seo from '../Components/Seo';
import I from '../Components/Icons';
import { VideoGrid } from '../Components/VideoSection';
import { SavedDrawer } from '../Components/ProductCard';
import useSaved from '../hooks/useSaved';

export default function Guides() {
  const { props } = usePage();
  const { guides, articles, videos } = props;

  const { saved, toggle } = useSaved();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { document.documentElement.dataset.palette = "riviera"; }, []);

  const allGuides = guides || [];
  const featured = allGuides.find((g) => g.featured) || allGuides[0];
  const rest = allGuides.filter((g) => g !== featured);

  return (
    <Layout savedCount={saved.size} onOpenSaved={() => setDrawerOpen(true)}>
      <Seo
        title="Buying Guides & Style Edits"
        description="Practical, editor-written guides to help you choose well — from capsule wardrobes to skincare routines and packing like a pro."
      />
      <div className="announce">Exclusive access to curated luxury · <strong>Editor-vetted picks, updated weekly</strong></div>

      <div className="wrap">
        <div className="guides-intro">
          <nav className="breadcrumb" style={{ padding: 0, marginBottom: 18, textAlign: "left" }}>
            <Link href="/">Home</Link><span className="sep">/</span><span className="here">Guides</span>
          </nav>
          <span className="eyebrow">The Limitra Journal</span>
          <h1>Buying Guides &amp; Edits</h1>
          <p>Practical, editor-written advice to help you choose well — from capsule wardrobes to skincare routines and packing like a pro.</p>
        </div>
      </div>

      {featured && (
        <section className="wrap" style={{ paddingTop: 8 }}>
          <article className="guide-featured">
            <div className="gf-media">
              {featured.img && <img src={featured.img} alt={featured.title} loading="lazy" />}
            </div>
            <div className="gf-body">
              <span className="guide-tag">Featured · {featured.tag}</span>
              <h2>{featured.title}</h2>
              <p>{featured.excerpt}</p>
              <a className="guide-read" href="#">Read the guide <I.external /></a>
              <div className="guide-meta">{featured.read_time}</div>
            </div>
          </article>
        </section>
      )}

      <section className="wrap" style={{ paddingTop: 36 }}>
        <div className="guides-grid">
          {rest.map((g) => (
            <article className="guide-card" key={g.slug}>
              <div className="gc-media">
                {g.img && <img src={g.img} alt={g.title} loading="lazy" />}
              </div>
              <div className="gc-body">
                <span className="guide-tag">{g.tag}</span>
                <h3>{g.title}</h3>
                <p>{g.excerpt}</p>
                <div className="gc-foot">
                  <a className="guide-read" href="#">Read guide <I.external /></a>
                  <span className="read">{g.read_time}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <VideoGrid videos={videos} />

      <SavedDrawer open={drawerOpen} products={[]} onClose={() => setDrawerOpen(false)}
        onToggle={toggle} onQuick={() => {}} />
    </Layout>
  );
}
