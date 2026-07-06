import { Link } from '@inertiajs/react';
import I from './Icons';
import { TAG_COLORS } from '../constants';

function tagColor(tag) {
  return TAG_COLORS[tag] || 'var(--accent)';
}

export function EdCard({ article, large }) {
  const href = `/article/${article.slug}`;
  return (
    <Link className={"ed-card" + (large ? " large" : "")} href={href}>
      <div className="img-wrap">
        <img src={article.img} alt={article.title} loading="lazy" />
      </div>
      <span className="ed-tag" style={{ color: tagColor(article.tag) }}>{article.tag}</span>
      <h3>{article.title}</h3>
      {large && <p className="excerpt">{article.excerpt}</p>}
      <div className="ed-meta">
        <span>{article.author}</span>
        <span className="dot">·</span>
        <span>{article.date}</span>
        <span className="dot">·</span>
        <span>{article.read_time}</span>
      </div>
    </Link>
  );
}

export function EditorialSection({ articles }) {
  const arts = articles || [];
  const featured = arts[0];
  const second = arts[1];
  const third = arts[2];
  const fourth = arts[3];
  const fifth = arts[4];
  const rest = arts.slice(5);

  if (!featured) return null;
  return (
    <section className="editorial-section">
      <div className="wrap">
        <div className="ed-head">
          <div>
            <span className="eyebrow">Limitra Journal</span>
            <h2>From the Edit</h2>
          </div>
          <Link href="/guides">See all stories →</Link>
        </div>

        <div className="ed-grid" style={{ marginBottom: rest.length > 0 ? 40 : 0 }}>
          <div className="ed-cell ed-cell-feature">
            <EdCard article={featured} large />
          </div>
          {second && <div className="ed-cell"><EdCard article={second} /></div>}
          {third && <div className="ed-cell"><EdCard article={third} /></div>}
          {fourth && <div className="ed-cell"><EdCard article={fourth} /></div>}
          {fifth && <div className="ed-cell"><EdCard article={fifth} /></div>}
        </div>

        {rest.length > 0 && (
          <>
            <div className="section-rule"><span>More from the journal</span></div>
            <div className="ed-grid-bot">
              {rest.slice(0, 3).map((a) => <EdCard key={a.slug} article={a} />)}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export function ArtProduct({ p }) {
  if (!p) return null;
  return (
    <Link className="art-prod" href={`/product/${p.slug || p.id}`}>
      <div className="ap-img">
        {p.image && <img src={p.image} alt={p.name} loading="lazy" />}
      </div>
      <div className="ap-body">
        <div className="ap-brand">{p.brand}</div>
        <div className="ap-name">{p.name}</div>
        <div className="ap-price">{p.price}</div>
        <span className="ap-cta">Shop Now →</span>
      </div>
    </Link>
  );
}

export function ArtBlock({ block, products }) {
  if (block.type === "lead") return <p className="art-lead">{block.text}</p>;
  if (block.type === "text") return <p className="art-p">{block.text}</p>;
  if (block.type === "heading") return <h2 className="art-h2">{block.text}</h2>;
  if (block.type === "pullquote") return <blockquote className="art-pullquote">"{block.text}"</blockquote>;
  if (block.type === "products") {
    const blockProducts = (block.ids || []).map((id) => products[id]).filter(Boolean);
    if (!blockProducts.length) return null;
    return (
      <div className="art-shop">
        <div className="art-shop-label">{block.label || "Shop the story"}</div>
        <div className="art-shop-grid">
          {blockProducts.map((p) => <ArtProduct key={p.id} p={p} />)}
        </div>
      </div>
    );
  }
  return null;
}

export default EditorialSection;
