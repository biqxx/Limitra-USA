import { useState, useEffect } from 'react';
import { usePage, Link } from '@inertiajs/react';
import Layout from '../Components/Layout';
import Seo from '../Components/Seo';
import I from '../Components/Icons';
import { SavedDrawer } from '../Components/ProductCard';
import { formatPrice } from '../lib/price';
import useSaved from '../hooks/useSaved';

function StlProd({ p }) {
  if (!p) return <div className="stl-prod"></div>;
  return (
    <Link className="stl-prod" href={`/product/${p.slug || p.id}`}>
      <div className="stl-prod-img">
        {p.image && <img src={p.image} alt={p.name} loading="lazy" />}
      </div>
      <div className="stl-prod-info">
        <span className="stl-brand-name">{p.brand}</span>
        <span className="stl-prod-name">{p.name}</span>
        <span className="stl-prod-price">{formatPrice(p.price)}</span>
      </div>
      <div className="stl-view-link"><span>Buy Now →</span></div>
    </Link>
  );
}

function ConfigGridMosaic({ items, productsMap }) {
  return (
    <div className="stl-mosaic">
      {items.map((item, i) => {
        const p = item.id ? productsMap[item.id] : null;
        const Tag = p ? Link : "div";
        const image = item.image || p?.image;
        const colSpan = item.col_span || item.colSpan || 1;
        const rowSpan = item.row_span || item.rowSpan || 1;
        return (
          <Tag key={i} className="stl-prod" {...(p ? { href: `/product/${p.slug || p.id}` } : {})}
            style={{ gridColumn: `span ${colSpan}`, gridRow: `span ${rowSpan}`, aspectRatio: `${colSpan} / ${rowSpan}` }}>
            <div className="stl-prod-img">
              {image && <img src={image} alt={p?.name || ""} loading="lazy" />}
            </div>
            {p && (
              <>
                <div className="stl-prod-info">
                  <span className="stl-brand-name">{p.brand}</span>
                  <span className="stl-prod-name">{p.name}</span>
                  <span className="stl-prod-price">{formatPrice(p.price)}</span>
                </div>
                <div className="stl-view-link"><span>Buy Now →</span></div>
              </>
            )}
          </Tag>
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
      {prods.map((p, i) => <StlProd key={p?.id ?? i} p={p} />)}
    </div>
  );
}

function getLookSlides(look, productsMap) {
  const items = look.grid_items?.length > 0
    ? look.grid_items
    : (look.product_ids || []).map((id) => ({ id }));

  return [
    { image: look.hero_img, label: look.event || 'Styled look' },
    ...items.map((item) => {
      const product = item.id ? productsMap[item.id] : null;
      return {
        image: item.image || product?.image,
        label: product?.name || 'Look detail',
        href: product ? `/product/${product.slug || product.id}` : null,
      };
    }),
  ].filter((slide) => slide.image);
}

function MobileLookCarousel({ look, productsMap }) {
  const slides = getLookSlides(look, productsMap);
  const [active, setActive] = useState(0);
  const current = slides[active] || slides[0];

  if (!current) return null;
  const move = (direction) => setActive((index) => (index + direction + slides.length) % slides.length);
  const MainTag = current.href ? Link : 'div';

  return (
    <div className="stl-mobile-carousel" aria-label="Look image carousel">
      <div className="stl-carousel-stage">
        <MainTag className="stl-carousel-main" {...(current.href ? { href: current.href } : {})}>
          <img src={current.image} alt={current.label} />
          {current.href && <span className="stl-carousel-shop">Shop this piece <span aria-hidden="true">→</span></span>}
        </MainTag>
        {slides.length > 1 && <>
          <button className="stl-carousel-arrow is-prev" type="button" onClick={() => move(-1)} aria-label="Previous image">‹</button>
          <button className="stl-carousel-arrow is-next" type="button" onClick={() => move(1)} aria-label="Next image">›</button>
        </>}
        <span className="stl-carousel-count">{active + 1} / {slides.length}</span>
      </div>
      <div className="stl-carousel-thumbs" aria-label="Choose an image">
        {slides.map((slide, index) => (
          <button key={`${slide.image}-${index}`} type="button"
            className={`stl-carousel-thumb${index === active ? ' is-active' : ''}`}
            onClick={() => setActive(index)}
            aria-label={`Show image ${index + 1}: ${slide.label}`}
            aria-current={index === active ? 'true' : undefined}>
            <img src={slide.image} alt="" loading="lazy" />
          </button>
        ))}
      </div>
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
        <div className="stl-desktop-gallery">
          <div className="stl-photo">
            <img src={look.hero_img} alt={look.event} loading="eager" />
          </div>
          <LookMosaic look={look} productsMap={productsMap} />
        </div>
        <MobileLookCarousel look={look} productsMap={productsMap} />
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
