import { useState, useEffect } from 'react';
import { usePage, Link } from '@inertiajs/react';
import Layout from '../Components/Layout';
import Seo from '../Components/Seo';
import { ProductRow, QuickView, SavedDrawer } from '../Components/ProductCard';
import useSaved from '../hooks/useSaved';

function OtherGuideCard({ g }) {
  return (
    <Link className="guide-card" href={`/guide/${g.slug}`}>
      <div className="gc-media">
        {g.img && <img src={g.img} alt={g.title} loading="lazy" />}
      </div>
      <div className="gc-body">
        <span className="guide-tag">{g.tag}</span>
        <h3>{g.title}</h3>
        <p>{g.excerpt}</p>
        <div className="gc-foot">
          <span className="guide-read">Read guide →</span>
          <span className="read">{g.read_time}</span>
        </div>
      </div>
    </Link>
  );
}

export default function Guide() {
  const { props } = usePage();
  const { guide, sections, otherGuides } = props;

  const { saved, toggle } = useSaved();
  const [quick, setQuick] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { document.documentElement.dataset.palette = "riviera"; }, []);

  if (!guide) return null;

  const shownSections = (sections || []).filter((s) => (s.products || []).length > 0);
  const savedProducts = shownSections.flatMap((s) => s.products).filter((p) => saved.has(p.id));

  return (
    <Layout savedCount={saved.size} onOpenSaved={() => setDrawerOpen(true)}>
      <Seo
        title={guide.title}
        description={guide.excerpt}
        image={guide.img}
      />
      <div className="announce">Exclusive access to curated luxury · <strong>Editor-vetted picks, updated weekly</strong></div>

      <section className="cat-hero" style={{ padding: 0 }}>
        {guide.img && <img src={guide.img} alt={guide.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
        <div className="cat-hero-inner">
          <div className="wrap">
            <nav className="breadcrumb" style={{ padding: 0, marginBottom: 14 }}>
              <Link href="/" style={{ color: "rgba(255,255,255,.7)" }}>Home</Link>
              <span className="sep" style={{ color: "rgba(255,255,255,.4)" }}>/</span>
              <Link href="/guides" style={{ color: "rgba(255,255,255,.7)" }}>Guides</Link>
              <span className="sep" style={{ color: "rgba(255,255,255,.4)" }}>/</span>
              <span className="here" style={{ color: "#fff" }}>{guide.title}</span>
            </nav>
            {guide.tag && <span className="eyebrow">{guide.tag}</span>}
            <h1>{guide.title}</h1>
            {guide.excerpt && <p>{guide.excerpt}</p>}
          </div>
        </div>
      </section>

      {shownSections.length === 0 ? (
        <div className="wrap" style={{ padding: "60px 0" }}>
          <div className="listing-empty">No products have been added to this guide yet.</div>
        </div>
      ) : (
        shownSections.map((s, i) => (
          <ProductRow
            key={i}
            id={`section-${i}`}
            title={s.title}
            items={s.products}
            savedSet={saved}
            onToggle={toggle}
            onQuick={setQuick}
            dealCta="Buy Now"
          />
        ))
      )}

      {otherGuides?.length > 0 && (
        <section className="wrap" style={{ paddingTop: 20, paddingBottom: 60 }}>
          <div className="section-head">
            <span className="eyebrow">More Guides</span>
            <h2>Keep Exploring</h2>
          </div>
          <div className="guides-grid" style={{ paddingTop: 24 }}>
            {otherGuides.map((g) => <OtherGuideCard key={g.slug} g={g} />)}
          </div>
        </section>
      )}

      <QuickView
        product={quick}
        saved={quick ? saved.has(quick.id) : false}
        onToggle={toggle}
        onClose={() => setQuick(null)}
        dealCta="Buy Now"
      />
      <SavedDrawer
        open={drawerOpen}
        products={savedProducts}
        onClose={() => setDrawerOpen(false)}
        onToggle={toggle}
        onQuick={(p) => { setDrawerOpen(false); setQuick(p); }}
      />
    </Layout>
  );
}
