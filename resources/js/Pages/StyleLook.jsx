import { useState, useEffect } from 'react';
import { usePage, Link } from '@inertiajs/react';
import Layout from '../Components/Layout';
import Seo from '../Components/Seo';
import I from '../Components/Icons';
import { SavedDrawer } from '../Components/ProductCard';
import useSaved from '../hooks/useSaved';

function StlProd({ p, hero }) {
  if (!p) return <div className={"stl-prod" + (hero ? " hero" : "")}></div>;
  return (
    <Link className={"stl-prod" + (hero ? " hero" : "")} href={`/product/${p.slug || p.id}`}>
      <div className="stl-prod-img">
        {p.image && <img src={p.image} alt={p.name} loading="lazy" />}
      </div>
      <div className="stl-prod-info">
        <span className="stl-brand-name">{p.brand}</span>
        <span className="stl-prod-name">{p.name}</span>
        <span className="stl-prod-price">{p.price}</span>
      </div>
      <div className="stl-view-link"><span>Buy Now →</span></div>
    </Link>
  );
}

function ConfigGridMosaic({ items, productsMap }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1.5px", background: "#ddd5cc", borderLeft: "1.5px solid #ddd5cc" }}>
      {items.map((item, i) => {
        const p = item.id ? productsMap[item.id] : null;
        return (
          <Link key={i} className="stl-prod" href={p ? `/product/${p.slug || p.id}` : "#"}
            style={{ gridColumn: `span ${item.col_span || item.colSpan || 1}`, gridRow: `span ${item.row_span || item.rowSpan || 1}` }}>
            <div className="stl-prod-img" style={{ flex: 1 }}>
              {item.image
                ? <img src={item.image} alt="" loading="lazy" />
                : p?.image
                  ? <img src={p.image} alt={p.name} loading="lazy" />
                  : null}
            </div>
            {p && (
              <div className="stl-prod-info">
                <span className="stl-brand-name">{p.brand}</span>
                <span className="stl-prod-name">{p.name}</span>
                <span className="stl-prod-price">{p.price}</span>
              </div>
            )}
            <div className="stl-view-link"><span>Buy Now →</span></div>
          </Link>
        );
      })}
    </div>
  );
}

function LookMosaic({ look, productsMap }) {
  if (look.grid_items?.length > 0) {
    return <ConfigGridMosaic items={look.grid_items} productsMap={productsMap} />;
  }
  const prods = (look.product_ids || []).map((id) => productsMap[id] || null);
  return (
    <div className="stl-mosaic">
      <StlProd p={prods[0]} hero />
      <StlProd p={prods[1]} />
      <div className="stl-subpair"><StlProd p={prods[2]} /><StlProd p={prods[3]} /></div>
      <StlProd p={prods[4]} /><StlProd p={prods[5]} />
      {prods[6] && <StlProd p={prods[6]} />}
      {prods[7] && <StlProd p={prods[7]} />}
    </div>
  );
}

function LookDetail({ look, productsMap }) {
  return (
    <div className="stl-look-card">
      <div className="stl-look-header">
        <h1 className="stl-look-title">Style <em>the look</em></h1>
        <div className="stl-look-tags">
          {(look.tags || []).map((t, i) => (
            <span key={t}>{i > 0 && <span className="dot">●</span>}{t}</span>
          ))}
        </div>
      </div>

      <div className="stl-look-body">
        <div className="stl-photo">
          <img src={look.hero_img} alt={look.event} loading="eager" />
        </div>
        <LookMosaic look={look} productsMap={productsMap} />
      </div>

      <div className="stl-notes">
        <span className="stl-notes-label">Style Notes</span>
        <div className="stl-notes-sep"></div>
        <p className="stl-notes-text">{look.style_notes}</p>
        <div className="stl-palette">
          {(look.palette || []).map((c) => (
            <div className="stl-swatch" key={c} style={{ background: c }} title={c}></div>
          ))}
        </div>
      </div>
    </div>
  );
}

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

export default function StyleLook() {
  const { props } = usePage();
  const { look, products, otherLooks } = props;

  const { saved, toggle } = useSaved();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { document.documentElement.dataset.palette = "riviera"; }, []);

  const productsMap = {};
  (products || []).forEach((p) => { productsMap[p.id] = p; if (p.slug) productsMap[p.slug] = p; });

  if (!look) return null;

  return (
    <Layout savedCount={saved.size} onOpenSaved={() => setDrawerOpen(true)}>
      <Seo
        title={`${look?.event} — Style the Look`}
        description={look?.style_notes || `A complete styled look for ${look?.event} curated by Limitra.`}
        image={look?.hero_img}
        type="article"
      />
      <div className="announce">Exclusive access to curated luxury · <strong>Editor-vetted picks, updated weekly</strong></div>

      <div className="wrap stl-page">
        <nav className="breadcrumb">
          <Link href="/">Home</Link>
          <span className="sep">/</span>
          <Link href="/looks">Style the Look</Link>
          <span className="sep">/</span>
          <span className="here">{look.event}</span>
        </nav>

        <div style={{ paddingBlock: "clamp(24px, 4vw, 48px)" }}>
          <LookDetail look={look} productsMap={productsMap} />

          {otherLooks?.length > 0 && (
            <div style={{ marginTop: 56 }}>
              <div className="section-head" style={{ textAlign: "left", paddingBottom: 0 }}>
                <span className="eyebrow">More Looks</span>
                <h2>Style <em style={{ fontStyle: "italic" }}>the look</em></h2>
              </div>
              <div className="stl-gallery-grid" style={{ paddingTop: 24 }}>
                {otherLooks.map((l) => (
                  <GalleryCard key={l.slug} look={l} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <SavedDrawer open={drawerOpen} products={[]} onClose={() => setDrawerOpen(false)}
        onToggle={toggle} onQuick={() => {}} />
    </Layout>
  );
}
