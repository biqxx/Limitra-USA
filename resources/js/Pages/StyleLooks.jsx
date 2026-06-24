import { useState, useEffect } from 'react';
import { usePage, Link } from '@inertiajs/react';
import Layout from '../Components/Layout';
import Seo from '../Components/Seo';
import I from '../Components/Icons';
import { SavedDrawer } from '../Components/ProductCard';

function GalleryCard({ look }) {
  return (
    <Link className="stl-gallery-card" href={`/look/${look.slug}`}>
      <div className="gc-photo">
        <img src={look.hero_img} alt={look.event} loading="lazy" />
      </div>
      <div className="gc-body">
        <p className="gc-title">Style <em>the look</em></p>
        <p className="gc-event">{look.event}</p>
        <div className="gc-tags">
          {(look.tags || []).map((t, i) => (
            <span key={t}>{i > 0 && <span className="dot">●</span>}{t}</span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          {(look.palette || []).slice(0, 5).map((c) => (
            <div key={c} style={{ width: 20, height: 20, borderRadius: "50%", background: c, boxShadow: "0 1px 4px rgba(0,0,0,.18)" }}></div>
          ))}
        </div>
        <span className="gc-cta">See the full look <I.external width="14" height="14" /></span>
      </div>
    </Link>
  );
}

export default function StyleLooks() {
  const { props } = usePage();
  const { looks } = props;

  const [saved, setSaved] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("limitra.saved.v1") || "[]")); }
    catch (e) { return new Set(); }
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { document.documentElement.dataset.palette = "riviera"; }, []);
  useEffect(() => { localStorage.setItem("limitra.saved.v1", JSON.stringify([...saved])); }, [saved]);

  const toggle = (id) => setSaved((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <Layout savedCount={saved.size} onOpenSaved={() => setDrawerOpen(true)}>
      <Seo
        title="Style the Look — Curated Outfit Edits"
        description="Complete curated outfits styled by the Limitra editors. Find the look, then shop every piece."
        image={(looks || [])[0]?.hero_img}
      />
      <div className="announce">Exclusive access to curated luxury · <strong>Editor-vetted picks, updated weekly</strong></div>

      <div className="wrap stl-page">
        <nav className="breadcrumb">
          <Link href="/">Home</Link>
          <span className="sep">/</span>
          <span className="here">Style the Look</span>
        </nav>

        <div className="section-head" style={{ paddingTop: 24 }}>
          <span className="eyebrow">Editorial</span>
          <h2>Style <em style={{ fontStyle: "italic" }}>the look</em></h2>
          <p>Complete outfit guides — every piece linked to a trusted retailer.</p>
        </div>
        <div className="stl-gallery-grid">
          {(looks || []).map((l) => <GalleryCard key={l.slug} look={l} />)}
        </div>
      </div>

      <SavedDrawer open={drawerOpen} products={[]} onClose={() => setDrawerOpen(false)}
        onToggle={toggle} onQuick={() => {}} />
    </Layout>
  );
}
