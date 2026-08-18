import { useState, useEffect } from 'react';
import { usePage, Link, router } from '@inertiajs/react';
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

export default function Category() {
  const { props } = usePage();
  const { category, products, initialSub = "All", initialSort = "featured" } = props;

  const [activeSub, setActiveSub] = useState(initialSub);
  const [sort, setSort] = useState(initialSort);
  const { saved, toggle } = useSaved();
  const [quick, setQuick] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => { document.documentElement.dataset.palette = "riviera"; }, []);

  const isPaginated = !Array.isArray(products) && products?.data;
  const initialItems = isPaginated ? products.data : (Array.isArray(products) ? products : []);
  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    if (isPaginated) {
      if (products.current_page === 1) {
        setItems(products.data);
      } else {
        setItems((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newItems = products.data.filter((p) => !existingIds.has(p.id));
          return [...prev, ...newItems];
        });
      }
    } else {
      setItems(Array.isArray(products) ? products : []);
    }
  }, [products]);

  const totalCount = isPaginated ? (products.total || items.length) : items.length;
  const hasMore = isPaginated && !!products.next_page_url;

  const handleSubChange = (subName) => {
    setActiveSub(subName);
    router.get(
      `/category/${category?.slug}`,
      { sub: subName, sort },
      { preserveScroll: true, preserveState: false }
    );
  };

  const handleSortChange = (newSort) => {
    setSort(newSort);
    router.get(
      `/category/${category?.slug}`,
      { sub: activeSub, sort: newSort },
      { preserveScroll: true, preserveState: false }
    );
  };

  const loadMore = () => {
    if (!products?.next_page_url || loadingMore) return;
    setLoadingMore(true);
    router.get(
      products.next_page_url,
      {},
      {
        preserveScroll: true,
        preserveState: true,
        only: ['products'],
        onFinish: () => setLoadingMore(false),
      }
    );
  };

  const savedProducts = items.filter((p) => saved.has(p.id));
  const subs = category?.subcategories || [];
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
            <span className="cat-count-pill">{totalCount} curated products</span>
          </div>
        </div>
      </section>

      <div className="subrail">
        <div className="wrap subrail-inner">
          <button className={"chip" + (activeSub === "All" ? " active" : "")} onClick={() => handleSubChange("All")}>
            All
          </button>
          {subs.map((s) => (
            <button key={s} className={"chip" + (activeSub === s ? " active" : "")} onClick={() => handleSubChange(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <section className="wrap" style={{ padding: 0 }}>
        <div className="listing-toolbar">
          <span className="result-count">
            <strong>{totalCount}</strong> {totalCount === 1 ? "product" : "products"}
            {activeSub !== "All" && <> in {activeSub}</>}
          </span>
          <div className="sort-wrap">
            <label htmlFor="sort">Sort</label>
            <select id="sort" className="sort-select" value={sort} onChange={(e) => handleSortChange(e.target.value)}>
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="listing-empty">No products here yet — check back soon.</div>
        ) : (
          <div style={{ paddingBottom: 40 }}>
            <div className="listing-grid">
              {items.map((p) => (
                <ProductCard key={p.id} p={p} saved={saved.has(p.id)} onToggle={toggle} onQuick={setQuick} dealCta="Buy Now" />
              ))}
            </div>

            {hasMore && (
              <div style={{ textAlign: 'center', marginTop: 32, marginBottom: 20 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ minWidth: 220, padding: '14px 28px', fontSize: 13, letterSpacing: '.08em' }}
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Loading next batch...' : `Load More Products (${items.length} of ${totalCount} shown)`}
                </button>
              </div>
            )}
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
