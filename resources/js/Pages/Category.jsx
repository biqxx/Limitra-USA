import { useState, useEffect, useMemo } from 'react';
import { usePage, Link } from '@inertiajs/react';
import Layout from '../Components/Layout';
import Seo from '../Components/Seo';
import { ProductCard, QuickView, SavedDrawer } from '../Components/ProductCard';
import { Newsletter } from '../Components/Layout';

const SORTS = [
  { key: "featured", label: "Featured" },
  { key: "price-asc", label: "Price: Low to High" },
  { key: "price-desc", label: "Price: High to Low" },
  { key: "rating", label: "Top Rated" },
];
const priceNum = (p) => Number(String(p).replace(/[^0-9.]/g, "")) || 0;

function sortProducts(list, key) {
  const a = [...list];
  if (key === "price-asc") a.sort((x, y) => priceNum(x.price) - priceNum(y.price));
  else if (key === "price-desc") a.sort((x, y) => priceNum(y.price) - priceNum(x.price));
  else if (key === "rating") a.sort((x, y) => (y.rating || 0) - (x.rating || 0));
  return a;
}

export default function Category() {
  const { props } = usePage();
  const { category, products } = props;

  const [activeSub, setActiveSub] = useState("All");
  const [sort, setSort] = useState("featured");
  const [saved, setSaved] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("limitra.saved.v1") || "[]")); }
    catch (e) { return new Set(); }
  });
  const [quick, setQuick] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { document.documentElement.dataset.palette = "riviera"; }, []);
  useEffect(() => { localStorage.setItem("limitra.saved.v1", JSON.stringify([...saved])); }, [saved]);

  const toggle = (id) => setSaved((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const allProducts = products || [];
  const subs = category?.subcategories || [];
  const subCount = (s) => allProducts.filter((p) => p.subcategory === s).length;

  const filtered = activeSub === "All" ? allProducts : allProducts.filter((p) => p.subcategory === activeSub);
  const sorted = sortProducts(filtered, sort);
  const savedProducts = allProducts.filter((p) => saved.has(p.id));

  const grouped = activeSub === "All" && sort === "featured";

  const subLink = (s) => `/category/${category?.slug}/${encodeURIComponent(s.toLowerCase().replace(/\s+/g, '-'))}`;

  return (
    <Layout savedCount={saved.size} onOpenSaved={() => setDrawerOpen(true)}>
      <Seo
        title={category?.name}
        description={category?.tagline || category?.desc}
        image={category?.banner_img || category?.feature_img || category?.img}
      />
      <div className="announce">Exclusive access to curated luxury · <strong>Editor-vetted picks, updated weekly</strong></div>

      <section className="cat-hero" style={{ padding: 0 }}>
        {category?.banner_img && <img src={category.banner_img} alt={category.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
        <div className="cat-hero-inner">
          <div className="wrap">
            <nav className="breadcrumb" style={{ padding: 0, marginBottom: 14 }}>
              <Link href="/" style={{ color: "rgba(255,255,255,.7)" }}>Home</Link>
              <span className="sep" style={{ color: "rgba(255,255,255,.4)" }}>/</span>
              <span className="here" style={{ color: "#fff" }}>{category?.name}</span>
            </nav>
            <span className="eyebrow">Limitra Edit</span>
            <h1>{category?.name}</h1>
            <p>{category?.tagline}</p>
            <span className="cat-count-pill">{allProducts.length} curated products</span>
          </div>
        </div>
      </section>

      <div className="subrail">
        <div className="wrap subrail-inner">
          <button className={"chip" + (activeSub === "All" ? " active" : "")} onClick={() => setActiveSub("All")}>
            All<span className="c">{allProducts.length}</span>
          </button>
          {subs.map((s) => (
            <button key={s} className={"chip" + (activeSub === s ? " active" : "")} onClick={() => setActiveSub(s)}>
              {s}<span className="c">{subCount(s)}</span>
            </button>
          ))}
        </div>
      </div>

      <section className="wrap" style={{ padding: 0 }}>
        <div className="listing-toolbar">
          <span className="result-count">
            <strong>{sorted.length}</strong> {sorted.length === 1 ? "product" : "products"}
            {activeSub !== "All" && <> in {activeSub}</>}
          </span>
          <div className="sort-wrap">
            <label htmlFor="sort">Sort</label>
            <select id="sort" className="sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="listing-empty">No products here yet — check back soon.</div>
        ) : grouped ? (
          <div style={{ paddingBottom: 40 }}>
            {subs.map((s) => {
              const items = allProducts.filter((p) => p.subcategory === s);
              if (!items.length) return null;
              return (
                <div key={s}>
                  <div className="subsection-head">
                    <h2>{s}</h2>
                    <Link href={subLink(s)}>View all {items.length} →</Link>
                  </div>
                  <div className="listing-grid">
                    {items.map((p) => (
                      <ProductCard key={p.id} p={p} saved={saved.has(p.id)} onToggle={toggle} onQuick={setQuick} dealCta="Buy Now" />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ paddingBottom: 40 }}>
            <div className="listing-grid">
              {sorted.map((p) => (
                <ProductCard key={p.id} p={p} saved={saved.has(p.id)} onToggle={toggle} onQuick={setQuick} dealCta="Buy Now" />
              ))}
            </div>
          </div>
        )}
      </section>

      <QuickView product={quick} saved={quick ? saved.has(quick.id) : false}
        onToggle={toggle} onClose={() => setQuick(null)} dealCta="Buy Now" />
      <SavedDrawer open={drawerOpen} products={savedProducts} onClose={() => setDrawerOpen(false)}
        onToggle={toggle} onQuick={(p) => { setDrawerOpen(false); setQuick(p); }} />
    </Layout>
  );
}
