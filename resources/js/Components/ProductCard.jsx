import { useState, useEffect } from 'react';
import { Link } from '@inertiajs/react';
import I from './Icons';

// Deal CTA label, shown regardless of retailer.
export function shopCta() {
  return 'Buy Now';
}

export function Rating({ value, small }) {
  return (
    <span className="rating">
      <I.star width={small ? 13 : 14} height={small ? 13 : 14} />
      {value}
    </span>
  );
}

export function Bookmark({ saved, onClick }) {
  return (
    <button className={"bookmark" + (saved ? " saved" : "")} onClick={(e) => { e.stopPropagation(); onClick(); }}
      aria-label={saved ? "Remove bookmark" : "Save product"} title={saved ? "Saved" : "Save"}>
      <I.heart fill={saved ? "currentColor" : "none"} />
    </button>
  );
}

export function ProductCard({ p, saved, onToggle, onQuick, dealCta, lead }) {
  return (
    <article className={"prod-card" + (lead ? " lead" : "")}>
      <div className="prod-image">
        {p.image && <img className="p-img" src={p.image} alt={p.name} loading="lazy" />}
        {lead && (
          <div className="lead-crown">
            <I.star width="13" height="13" /> Editor's Choice
          </div>
        )}
      </div>
      <div style={{ height: "1px", background: "var(--line)", margin: 0 }}></div>
      <div className="prod-body">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div>
            <span className="prod-brand">{p.brand}</span>
            <h3 className="prod-name">{p.name}</h3>
          </div>
          <span className="prod-price" style={{ whiteSpace: "nowrap", marginTop: 0 }}>{p.price}</span>
        </div>
      </div>
      <div className="prod-actions">
        <Link className="deal-btn" href={`/product/${p.slug || p.id}`}>{dealCta && dealCta !== "Buy Now" ? dealCta : shopCta()}</Link>
        <Bookmark saved={saved} onClick={() => onToggle(p.id)} />
      </div>
    </article>
  );
}

export function ProductRow({ id, eyebrow, title, sub, items, savedSet, onToggle, onQuick, dealCta }) {
  return (
    <section className="wrap" id={id}>
      <div className="section-head">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      <div className="prod-grid">
        {items.map((p, i) => (
          <ProductCard key={p.id} p={p} saved={savedSet.has(p.id)} onToggle={onToggle} onQuick={onQuick} dealCta={dealCta} lead={i === 0} />
        ))}
      </div>
    </section>
  );
}

export function CategoryGrid({ categories }) {
  return (
    <section className="wrap" id="categories">
      <div className="section-head">
        <span className="eyebrow">Find your aisle</span>
        <h2>Shop by Category</h2>
      </div>
      <div className="cat-grid">
        {(categories || []).map((c) => (
          <Link className="cat-card" href={`/category/${c.slug}`} key={c.slug}>
            <div className="cat-thumb">
              {c.img && <img src={c.img} alt={c.name} loading="lazy" />}
              <span className="cat-count">{c.count || ''}</span>
            </div>
            <h3>{c.name}</h3>
            <p className="desc">{c.desc}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function ShareRow({ product }) {
  const [toast, setToast] = useState(null);
  const url = typeof window !== 'undefined' ? `${window.location.origin}/product/${product.slug || product.id}` : `/product/${product.slug || product.id}`;
  const text = `${product.name} by ${product.brand} — found on Limitra`;
  const enc = encodeURIComponent;

  const copyUrl = async (msg = 'Link copied to clipboard') => {
    try { await navigator.clipboard.writeText(url); } catch (e) {}
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  const targets = [
    { key: "facebook",  label: "Facebook",  href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    { key: "instagram", label: "Instagram", copy: "Copied — paste in Instagram" },
    { key: "tiktok",    label: "TikTok",    copy: "Copied — paste in TikTok" },
    { key: "x",         label: "X",         href: `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(text)}` },
    { key: "pinterest", label: "Pinterest", href: `https://pinterest.com/pin/create/button/?url=${enc(url)}&description=${enc(text)}` },
  ];

  return (
    <div className="share-row">
      <span className="share-label">Share</span>
      <button className="share-btn" onClick={() => copyUrl()} aria-label="Copy link" title="Copy link"><I.link /></button>
      {targets.map((t) => {
        const Icon = I[t.key];
        return t.copy ? (
          <button className="share-btn" key={t.key} onClick={() => copyUrl(t.copy)} aria-label={`Share on ${t.label}`} title={t.label}>
            <Icon />
          </button>
        ) : (
          <a className="share-btn" key={t.key} href={t.href} target="_blank" rel="noopener noreferrer" aria-label={`Share on ${t.label}`} title={t.label}>
            <Icon />
          </a>
        );
      })}
      {toast && <span className="copy-toast">{toast}</span>}
    </div>
  );
}

export function QuickView({ product, saved, onToggle, onClose, dealCta }) {
  useEffect(() => {
    if (!product) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [product]);
  if (!product) return null;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close"><I.close /></button>
        <div className="modal-media">
          {product.image && <img className="p-img" src={product.image} alt={product.name} />}
          <div className="modal-thumbs">
            {(product.gallery || []).slice(0, 3).map((g, i) => <img className="p-img" key={i} src={g} alt="" />)}
          </div>
        </div>
        <div className="modal-body">
          <span className="prod-brand">{product.brand}</span>
          <h2>{product.name}</h2>
          <div className="price-row">
            <span className="prod-price">{product.price}</span>
          </div>
          <p className="modal-desc">{product.description}</p>
          <ul className="feature-list">
            {(product.features || []).map((f) => <li key={f}><I.check /> {f}</li>)}
          </ul>
          <div className="modal-actions">
            <a className="btn btn-primary btn-block" href={product.affiliate_url ? `/go/${product.id}` : "#"} target="_blank" rel="noopener noreferrer sponsored">
              {dealCta && dealCta !== "Buy Now" ? `${dealCta} at ${product.retailer}` : shopCta()} <I.external />
            </a>
            <Link className={"btn btn-outline btn-block"} href={`/product/${product.slug || product.id}`}>
              See full details
            </Link>
            <button className={"btn btn-outline btn-block"} onClick={() => onToggle(product.id)}>
              <I.heart fill={saved ? "currentColor" : "none"} width="17" height="17" />
              {saved ? "Saved to your picks" : "Save to your picks"}
            </button>
            <ShareRow product={product} />
            <div className="affiliate-mini"><I.lock /> Affiliate link · Limitra may earn a commission.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SavedDrawer({ open, products, onClose, onToggle, onQuick }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  if (!open) return null;
  return (
    <>
      <div className="drawer-scrim" onClick={onClose}></div>
      <aside className="drawer" role="dialog" aria-label="Saved products">
        <div className="drawer-head">
          <h3>Your Picks{products.length > 0 ? ` (${products.length})` : ""}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><I.close /></button>
        </div>
        {products.length === 0 ? (
          <div className="drawer-empty">
            <I.heart width="46" height="46" />
            <p>No saved items yet.<br />Tap the heart on any product to build your collection.</p>
          </div>
        ) : (
          <div className="drawer-list">
            {products.map((p) => (
              <div className="saved-row" key={p.id}>
                {p.image && <img className="p-img" src={p.image} alt={p.name} />}
                <div className="info" onClick={() => onQuick(p)} style={{ cursor: "pointer" }}>
                  <span className="prod-brand">{p.brand}</span>
                  <h4>{p.name}</h4>
                  <span className="prod-price">{p.price}</span>
                </div>
                <button className="remove" onClick={() => onToggle(p.id)} aria-label="Remove"><I.trash /></button>
              </div>
            ))}
          </div>
        )}
        {products.length > 0 && (
          <div className="drawer-foot">
            <a className="btn btn-primary btn-block" href="#">View all deals</a>
          </div>
        )}
      </aside>
    </>
  );
}

export function OccasionsSection({ occasions, catalogCount }) {
  const wc = (occasions || []).find((o) => o.is_hero);
  const rest = (occasions || []).filter((o) => !o.is_hero);

  return (
    <section className="occasions-section">
      <div className="wrap">
        <div className="occasions-head">
          <span className="eyebrow">Special Occasions</span>
          <h2>Curated for every moment</h2>
        </div>

        {wc && (
          <div className="occ-wc-wrap">
            <div className="occ-wc-runner"></div>
            <div className="occ-worldcup">
              <img className="bg" src={wc.img} alt="World Cup 2026" loading="lazy" />
              <div className="occ-worldcup-inner">
                <div className="occ-wc-badge">⚽</div>
                <div className="occ-wc-copy">
                  <div className="ev">{wc.eyebrow}</div>
                  <h3>{wc.title}</h3>
                  <p>{wc.tagline}</p>
                  <Link className="occ-wc-cta" href={wc.link}>
                    Shop the Edit <I.external />
                  </Link>
                  <div className="occ-wc-count">{catalogCount || 0} curated products</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="occ-grid">
          {rest.map((o) => (
            <Link className="occ-card" href={o.link} key={o.key}>
              <img src={o.img} alt={o.title} loading="lazy" />
              <div className="occ-card-inner">
                <span className="occ-card-badge">{o.badge}</span>
                <h3>{o.title}</h3>
                <p>{o.tagline}</p>
                <span className="occ-card-cta">Shop the Edit →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ProductCard;
