import { useState, useEffect, useMemo } from 'react';
import { usePage, Link } from '@inertiajs/react';
import Layout from '../Components/Layout';
import Seo from '../Components/Seo';
import { ProductCard, QuickView, SavedDrawer } from '../Components/ProductCard';
import useSaved from '../hooks/useSaved';

const TYPES_CONFIG = {
  new: {
    eyebrow: "Just In", title: "New Arrivals",
    tagline: "The latest pieces to land in the Limitra edit — fresh finds across every category, updated weekly.",
    filter: "category",
  },
  editors: {
    eyebrow: "Hand-Picked", title: "Editor's Picks",
    tagline: "The pieces our editors keep coming back to — tried, tested and genuinely loved.",
    filter: "category",
  },
  trending: {
    eyebrow: "Most Loved Now", title: "Trending This Week",
    tagline: "What everyone's saving and sharing right now, ranked by reader interest.",
    filter: "category",
  },
  gifts: {
    eyebrow: "The Gift Edit", title: "Gifts They'll Love",
    tagline: "Thoughtful, editor-approved gifts for everyone on your list — shop by budget.",
    filter: "price",
  },
  worldcup: {
    eyebrow: "Limited · 2026", title: "World Cup Edit",
    tagline: "The official fan wardrobe — curated looks for the stadiums, fan zones and watch parties of the century.",
    filter: "category",
    heroImg: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1600&q=75",
    accent: "#cf8a32",
  },
  graduation: {
    eyebrow: "Celebrate in Style", title: "Graduation Edit",
    tagline: "Dresses, jewels and beauty essentials for your big day — from the ceremony to the after-party.",
    filter: "category",
    heroImg: "https://images.unsplash.com/photo-1627556704290-2b1f5853ff78?auto=format&fit=crop&w=1600&q=72",
    accent: "#b9974c",
  },
  halloween: {
    eyebrow: "Dark & Wonderful", title: "Halloween Edit",
    tagline: "Bold beauty, moody fragrance and statement pieces for the most theatrical night of the year.",
    filter: "category",
    heroImg: "https://images.unsplash.com/photo-1509557965875-b88c97052f0e?auto=format&fit=crop&w=1600&q=72",
    accent: "#d4661a",
  },
  preloved: {
    eyebrow: "Vintage · Investment", title: "Pre-loved Treasures",
    tagline: "Iconic pieces with history — timeless finds curated for quality, rarity and lasting value.",
    filter: "category",
    heroImg: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1600&q=72",
    accent: "#bb9357",
  },
};

const PRICE_BANDS = [
  { key: "all", label: "All Gifts", test: () => true },
  { key: "u75", label: "Under $75", test: (n) => n < 75 },
  { key: "75-200", label: "$75 – $200", test: (n) => n >= 75 && n <= 200 },
  { key: "200-500", label: "$200 – $500", test: (n) => n > 200 && n <= 500 },
  { key: "lux", label: "Luxe · $500+", test: (n) => n > 500 },
];

const SORTS = [
  { key: "featured", label: "Featured" },
  { key: "price-asc", label: "Price: Low to High" },
  { key: "price-desc", label: "Price: High to Low" },
  { key: "rating", label: "Top Rated" },
];
const priceNum = (p) => Number(String(p).replace(/[^0-9.]/g, "")) || 0;

function sortC(list, key) {
  const a = [...list];
  if (key === "price-asc") a.sort((x, y) => priceNum(x.price) - priceNum(y.price));
  else if (key === "price-desc") a.sort((x, y) => priceNum(y.price) - priceNum(x.price));
  else if (key === "rating") a.sort((x, y) => (y.rating || 0) - (x.rating || 0));
  return a;
}

export default function Collection() {
  const { props } = usePage();
  const { type, products, occasion, categories } = props;

  const base = TYPES_CONFIG[type] || TYPES_CONFIG.new;
  const cfg = occasion ? {
    ...base,
    eyebrow: occasion.eyebrow || base.eyebrow,
    title: occasion.title || base.title,
    tagline: occasion.tagline || base.tagline,
    heroImg: occasion.img || base.heroImg,
    accent: occasion.accent || base.accent,
  } : base;

  const [activeFilter, setActiveFilter] = useState("all");
  const [sort, setSort] = useState("featured");
  const { saved, toggle } = useSaved();
  const [quick, setQuick] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { document.documentElement.dataset.palette = "riviera"; }, []);

  const allProducts = products || [];

  let filtered = allProducts;
  if (cfg.filter === "category" && activeFilter !== "all") filtered = allProducts.filter((p) => p.category === activeFilter);
  if (cfg.filter === "price" && activeFilter !== "all") {
    const band = PRICE_BANDS.find((b) => b.key === activeFilter);
    if (band) filtered = allProducts.filter((p) => band.test(priceNum(p.price)));
  }
  const sorted = sortC(filtered, sort);
  const savedProducts = allProducts.filter((p) => saved.has(p.id));

  const catNames = (categories || []).map((c) => c.name);
  const filterChips = cfg.filter === "price"
    ? PRICE_BANDS.map((b) => ({ key: b.key, label: b.label }))
    : [{ key: "all", label: "All" }, ...catNames.map((c) => ({ key: c, label: c }))];

  return (
    <Layout savedCount={saved.size} onOpenSaved={() => setDrawerOpen(true)}>
      <Seo
        title={cfg.title}
        description={cfg.tagline}
        image={cfg.heroImg || (products || [])[0]?.image}
      />
      <div className="announce">Exclusive access to curated luxury · <strong>Editor-vetted picks, updated weekly</strong></div>

      <section className="cat-hero" style={{ padding: 0 }}>
        {cfg.heroImg && <img src={cfg.heroImg} alt={cfg.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
        <div className="cat-hero-inner" style={cfg.accent ? { "--accent": cfg.accent, "--accent-soft": cfg.accent } : {}}>
          <div className="wrap">
            <nav className="breadcrumb" style={{ padding: 0, marginBottom: 14 }}>
              <Link href="/" style={{ color: "rgba(255,255,255,.7)" }}>Home</Link>
              <span className="sep" style={{ color: "rgba(255,255,255,.4)" }}>/</span>
              <span className="here" style={{ color: "#fff" }}>{cfg.title}</span>
            </nav>
            <span className="eyebrow">{cfg.eyebrow}</span>
            <h1>{cfg.title}</h1>
            <p>{cfg.tagline}</p>
            <span className="cat-count-pill">{allProducts.length} curated products</span>
          </div>
        </div>
      </section>

      <div className="subrail">
        <div className="wrap subrail-inner">
          {filterChips.map((c) => (
            <button key={c.key} className={"chip" + (activeFilter === c.key ? " active" : "")} onClick={() => setActiveFilter(c.key)}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <section className="wrap" style={{ padding: 0 }}>
        <div className="listing-toolbar">
          <span className="result-count"><strong>{sorted.length}</strong> {sorted.length === 1 ? "product" : "products"}</span>
          <div className="sort-wrap">
            <label htmlFor="sort">Sort</label>
            <select id="sort" className="sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>
        {sorted.length === 0 ? (
          <div className="listing-empty">Nothing in this range yet — try another filter.</div>
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
