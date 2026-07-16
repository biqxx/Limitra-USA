import { useState, useEffect } from 'react';
import { usePage, Link } from '@inertiajs/react';
import Layout from '../Components/Layout';
import Seo from '../Components/Seo';
import { ProductCard, QuickView, SavedDrawer } from '../Components/ProductCard';
import useSaved from '../hooks/useSaved';

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

export default function Subcategory() {
  const { props } = usePage();
  const { category, subcategory, subcategorySeoDesc, products } = props;

  const [sort, setSort] = useState("featured");
  const { saved, toggle } = useSaved();
  const [quick, setQuick] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { document.documentElement.dataset.palette = "riviera"; }, []);

  const allProducts = products || [];
  const sorted = sortProducts(allProducts, sort);
  const savedProducts = allProducts.filter((p) => saved.has(p.id));

  const subs = category?.subcategories || [];
  const subLink = (s) => `/category/${category?.slug}/${encodeURIComponent(s.toLowerCase().replace(/\s+/g, '-'))}`;

  return (
    <Layout savedCount={saved.size} onOpenSaved={() => setDrawerOpen(true)}>
      <Seo
        title={`${subcategory} — ${category?.name}`}
        description={subcategorySeoDesc || `Shop curated ${subcategory} in ${category?.name} from trusted retailers. Editor-vetted picks, updated weekly.`}
        image={category?.banner_img || category?.feature_img}
      />
      <div className="announce">Exclusive access to curated luxury · <strong>Editor-vetted picks, updated weekly</strong></div>

      <section className="cat-hero" style={{ padding: 0 }}>
        {category?.banner_img && <img src={category.banner_img} alt={category.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
        <div className="cat-hero-inner">
          <div className="wrap">
            <nav className="breadcrumb" style={{ padding: 0, marginBottom: 14 }}>
              <Link href="/" style={{ color: "rgba(255,255,255,.7)" }}>Home</Link>
              <span className="sep" style={{ color: "rgba(255,255,255,.4)" }}>/</span>
              <Link href={`/category/${category?.slug}`} style={{ color: "rgba(255,255,255,.7)" }}>{category?.name}</Link>
              <span className="sep" style={{ color: "rgba(255,255,255,.4)" }}>/</span>
              <span className="here" style={{ color: "#fff" }}>{subcategory}</span>
            </nav>
            <span className="eyebrow">{category?.name}</span>
            <h1>{subcategory}</h1>
            <p>Our editors' curated {subcategory?.toLowerCase()} edit — every piece vetted, then linked straight to the best place to buy it.</p>
            <span className="cat-count-pill">{allProducts.length} products</span>
          </div>
        </div>
      </section>

      <div className="subrail">
        <div className="wrap subrail-inner">
          <Link className="chip" href={`/category/${category?.slug}`}>← All {category?.name}</Link>
          {subs.map((s) => (
            <Link key={s} className={"chip" + (s === subcategory ? " active" : "")} href={subLink(s)}>
              {s}
            </Link>
          ))}
        </div>
      </div>

      <section className="wrap" style={{ padding: 0 }}>
        <div className="listing-toolbar">
          <span className="result-count"><strong>{sorted.length}</strong> {sorted.length === 1 ? "product" : "products"} in {subcategory}</span>
          <div className="sort-wrap">
            <label htmlFor="sort">Sort</label>
            <select id="sort" className="sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>
        {sorted.length === 0 ? (
          <div className="listing-empty">No products here yet — check back soon.</div>
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
