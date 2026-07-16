import { useState, useEffect } from 'react';
import { usePage, Link } from '@inertiajs/react';
import Layout from '../Components/Layout';
import Seo from '../Components/Seo';
import I from '../Components/Icons';
import { ProductRow, QuickView, SavedDrawer, ShareRow, shopCta } from '../Components/ProductCard';
import { copyToClipboard } from '../lib/clipboard';

function StyleTheLookPreview({ product, looks, productsMap }) {
  if (!looks?.length) return null;

  const containing = looks.filter((l) => {
    const refs = l.product_ids || l.products || [];
    return refs.includes(product.id) || refs.includes(product.slug);
  });
  const fallback = looks.filter((l) => !containing.includes(l));
  const shown = [...containing, ...fallback].slice(0, 2);
  if (!shown.length) return null;

  return (
    <section className="stl-preview-section">
      <div className="wrap">
        <div className="section-head">
          <span className="eyebrow">Get Inspired</span>
          <h2>Style <em>the look</em></h2>
          <p>See how this piece fits into a complete curated outfit.</p>
        </div>
        <div className="stl-preview-cards">
          {shown.map((look) => (
            <Link className="stl-preview-card" key={look.slug} href={`/look/${look.slug}`}>
              <div className="spc-photo">
                <img src={look.hero_img} alt={look.event} loading="lazy" />
              </div>
              <div className="spc-body">
                <div>
                  <span className="spc-label">Style the Look</span>
                  <p className="spc-event">{look.event}</p>
                  <div className="spc-tags">
                    {(look.tags || []).map((t, i) => (
                      <span key={t}>{i > 0 && <span className="dot">●</span>}{t}</span>
                    ))}
                  </div>
                  <div className="spc-thumbs">
                    {(look.product_ids || look.products || []).slice(0, 5).map((id) => {
                      const p = productsMap?.[id];
                      if (!p) return null;
                      return (
                        <div className="spc-thumb" key={id}>
                          {p.image && <img src={p.image} alt={p.name} />}
                        </div>
                      );
                    })}
                  </div>
                  <div className="spc-palette">
                    {(look.palette || []).map((c) => (
                      <div className="spc-swatch" key={c} style={{ background: c }}></div>
                    ))}
                  </div>
                </div>
                <span className="spc-cta">See the full look <I.external width="12" height="12" /></span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Product() {
  const { props } = usePage();
  const { product, relatedProducts, looks, detail } = props;

  const [saved, setSaved] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("limitra.saved.v1") || "[]")); }
    catch (e) { return new Set(); }
  });
  const [quick, setQuick] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { document.documentElement.dataset.palette = "riviera"; }, []);
  useEffect(() => { localStorage.setItem("limitra.saved.v1", JSON.stringify([...saved])); }, [saved]);

  const toggle = (pid) => setSaved((prev) => {
    const n = new Set(prev); n.has(pid) ? n.delete(pid) : n.add(pid); return n;
  });
  const isSaved = saved.has(product?.id);

  const allProducts = relatedProducts || [];
  const savedProducts = allProducts.filter((p) => saved.has(p.id));

  const about = detail?.about_paragraphs || [product?.description];
  const highlights = detail?.highlights || product?.features || [];
  const specs = detail?.specs || [];
  const copyLink = async () => {
    const url = `${window.location.origin}/product/${product.slug || product.id}`;
    const ok = await copyToClipboard(url);
    if (!ok) return;
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  };

  if (!product) return null;

  return (
    <Layout savedCount={saved.size} onOpenSaved={() => setDrawerOpen(true)}>
      <Seo
        title={`${product?.name} by ${product?.brand}`}
        description={product?.description}
        image={product?.image}
        type="product"
      />
      <div className="announce">Exclusive access to curated luxury · <strong>Editor-vetted picks, updated weekly</strong></div>

      <div className="wrap">
        <nav className="breadcrumb">
          <Link href="/">Home</Link><span className="sep">/</span>
          <Link href={`/category/${product.category_slug || ''}`}>{product.category}</Link><span className="sep">/</span>
          {product.subcategory && <><Link href={`/category/${product.category_slug || ''}/${encodeURIComponent((product.subcategory || '').toLowerCase().replace(/\s+/g, '-'))}`}>{product.subcategory}</Link><span className="sep">/</span></>}
          <span className="here">{product.name}</span>
        </nav>
      </div>

      <section className="wrap" style={{ paddingTop: 0 }}>
        <div className="pd-top">
          <div className="pd-gallery">
            <div className="pd-main" style={{ aspectRatio: "3/4" }}>
              {product.badge && <span className="prod-badge">{product.badge}</span>}
              {product.image && <img className="p-img" src={product.image} alt={product.name} />}
            </div>
          </div>

          <div className="pd-info">
            <span className="prod-brand">{product.brand}</span>
            <h1>{product.name}</h1>
            <div className="pd-price-row">
              <span className="pd-price">{product.price}</span>

            </div>
            <p className="pd-lead">{product.description}</p>

            <div className="pd-actions">
              <a className="btn btn-primary pd-deal" href={product.affiliate_url ? `/go/${product.id}` : "#"} target="_blank" rel="noopener noreferrer sponsored">
                {shopCta()} <I.external />
              </a>
              <div className="row2">
                <button className={"btn btn-outline"} onClick={() => toggle(product.id)}>
                  <I.heart fill={isSaved ? "currentColor" : "none"} width="17" height="17" />
                  {isSaved ? "Saved" : "Save"}
                </button>
                <button className="btn btn-outline" onClick={copyLink} style={{ position: "relative" }}>
                  <I.link width="17" height="17" /> Copy link
                  {copied && <span className="copy-toast" style={{ left: "50%", transform: "translateX(-50%)" }}>Copied!</span>}
                </button>
              </div>
              <div className="pd-retailer-note"><I.lock /> Affiliate link · Limitra may earn a commission. Price shown is indicative.</div>
            </div>

            <div className="pd-trust">
              <span className="ti"><I.shield width="18" height="18" /> Trusted retailer</span>
              <span className="ti"><I.sparkle width="18" height="18" /> Editor-vetted</span>
              <span className="ti"><I.check /> Price checked weekly</span>
            </div>

            <div className="pd-share">
              <ShareRow product={product} />
            </div>

            <div style={{ marginTop: 28, paddingTop: 24, borderTop: "1px solid var(--line)" }}>
              <span className="eyebrow" style={{ display:"inline-block", fontSize:11, letterSpacing:".24em", textTransform:"uppercase", color:"var(--accent)", fontWeight:700, marginBottom:10 }}>Editor's Notes</span>
              <h2 style={{ fontFamily:"var(--font-display,'Bodoni Moda'),serif", fontWeight:500, fontSize:20, color:"var(--brand)", margin:"0 0 14px" }}>About this product</h2>
              {about.filter(Boolean).map((para, i) => <p key={i} style={{ fontSize:14.5, lineHeight:1.7, color:"var(--ink)", margin:"0 0 12px" }}>{para}</p>)}
              {highlights.length > 0 && (
                <ul className="about-highlights" style={{ marginTop:8 }}>
                  {highlights.map((h) => <li key={h}><I.check /> {h}</li>)}
                </ul>
              )}
              {specs.length > 0 && (
                <table className="pd-specs" style={{ marginTop:20, width:"100%", borderCollapse:"collapse", fontSize:13.5 }}>
                  <tbody>
                    {specs.map(([label, value]) => (
                      <tr key={label} style={{ borderBottom:"1px solid var(--line)" }}>
                        <th style={{ textAlign:"left", padding:"7px 12px 7px 0", fontWeight:600, color:"var(--brand)", whiteSpace:"nowrap", width:"38%" }}>{label}</th>
                        <td style={{ padding:"7px 0", color:"var(--ink)" }}>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </section>

      <StyleTheLookPreview product={product} looks={looks} />

      <ProductRow id="related" eyebrow="You may also like" title="More to discover"
        items={relatedProducts || []} savedSet={saved} onToggle={toggle} onQuick={setQuick} dealCta="Buy Now" />

      <QuickView product={quick} saved={quick ? saved.has(quick.id) : false}
        onToggle={toggle} onClose={() => setQuick(null)} dealCta="View Deal" />
      <SavedDrawer open={drawerOpen} products={savedProducts} onClose={() => setDrawerOpen(false)}
        onToggle={toggle} onQuick={(p) => { setDrawerOpen(false); setQuick(p); }} />
    </Layout>
  );
}
