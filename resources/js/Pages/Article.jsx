import { useState, useEffect } from 'react';
import { usePage, Link } from '@inertiajs/react';
import Layout from '../Components/Layout';
import Seo from '../Components/Seo';
import { EdCard, ArtBlock } from '../Components/EditorialSection';
import { SavedDrawer } from '../Components/ProductCard';
import { TAG_COLORS } from '../constants';

export default function Article() {
  const { props } = usePage();
  const { article, products, relatedArticles } = props;

  const [saved, setSaved] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("limitra.saved.v1") || "[]")); }
    catch (e) { return new Set(); }
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { document.documentElement.dataset.palette = "riviera"; }, []);
  useEffect(() => { localStorage.setItem("limitra.saved.v1", JSON.stringify([...saved])); }, [saved]);

  const toggle = (id) => setSaved((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const productsMap = {};
  (products || []).forEach((p) => { productsMap[p.id] = p; });

  if (!article) return null;

  const tagColor = article.tag ? (TAG_COLORS[article.tag] || 'var(--accent)') : 'var(--accent)';

  return (
    <Layout savedCount={saved.size} onOpenSaved={() => setDrawerOpen(true)}>
      <Seo
        title={article?.title}
        description={article?.excerpt}
        image={article?.img}
        type="article"
      />
      <div className="announce">Exclusive access to curated luxury · <strong>Editor-vetted picks, updated weekly</strong></div>

      <div className="art-hero">
        <img className="art-hero-img" src={article.img} alt={article.title} />
        <div className="art-hero-meta">
          <div className="wrap">
            <nav className="breadcrumb" style={{ padding: 0, marginBottom: 14 }}>
              <Link href="/" style={{ color: "rgba(255,255,255,.7)" }}>Home</Link>
              <span className="sep" style={{ color: "rgba(255,255,255,.4)" }}>/</span>
              <span className="here" style={{ color: "#fff" }}>Journal</span>
            </nav>
            <span className="art-tag-pill" style={{ background: tagColor }}>{article.tag}</span>
            <h1>{article.title}</h1>
            <div className="art-byline">
              <span>{article.author}</span>
              <span className="dot">·</span>
              <span>{article.date}</span>
              <span className="dot">·</span>
              <span>{article.read_time} read</span>
            </div>
          </div>
        </div>
      </div>

      <div className="art-body">
        <div className="art-content wrap">
          {(article.body || []).map((block, i) => (
            <ArtBlock key={i} block={block} products={productsMap} />
          ))}
        </div>
      </div>

      {relatedArticles?.length > 0 && (
        <section className="wrap art-related" style={{ paddingTop: 0, paddingBottom: 60 }}>
          <h2>More from the Journal</h2>
          <div className="ed-grid-bot">
            {relatedArticles.map((a) => <EdCard key={a.slug} article={a} />)}
          </div>
        </section>
      )}

      <SavedDrawer open={drawerOpen} products={[]} onClose={() => setDrawerOpen(false)}
        onToggle={toggle} onQuick={() => {}} />
    </Layout>
  );
}
