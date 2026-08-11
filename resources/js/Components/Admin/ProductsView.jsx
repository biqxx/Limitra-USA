import { useState } from 'react';
import { router } from '@inertiajs/react';
import I from '../Icons';
import { BADGES } from '../../constants';
import DataTable from './DataTable';
import {
  ImgInput, admSlug, useUploadBusy, BulkImportButton, splitList, toBool,
} from './AdminShared';

function Repeater({ items, onChange, placeholder, textarea }) {
  const set = (i, v) => { const n = [...items]; n[i] = v; onChange(n); };
  const add = () => onChange([...items, '']);
  const del = (i) => onChange(items.filter((_, j) => j !== i));
  return (
    <div className="adm-rep">
      {items.map((it, i) => (
        <div className="adm-rep-row" key={i}>
          {textarea
            ? <textarea className="adm-textarea" style={{ minHeight: 70 }} value={it} placeholder={placeholder} onChange={(e) => set(i, e.target.value)} />
            : <input className="adm-input" value={it} placeholder={placeholder} onChange={(e) => set(i, e.target.value)} />}
          <button type="button" className="del" onClick={() => del(i)} aria-label="Remove"><I.close /></button>
        </div>
      ))}
      <button type="button" className="adm-add-row" onClick={add}><I.plus width="14" height="14" /> Add</button>
    </div>
  );
}

function SpecsEditor({ items, onChange }) {
  const set = (i, k, v) => { const n = items.map((row, j) => j === i ? [k, v] : row); onChange(n); };
  const add = () => onChange([...items, ['', '']]);
  const del = (i) => onChange(items.filter((_, j) => j !== i));
  return (
    <div className="adm-rep">
      {items.map((row, i) => (
        <div className="adm-rep-row" key={i}>
          <input className="adm-input" style={{ flex: '.5' }} placeholder="Label (e.g. Material)" value={row[0] || ''} onChange={(e) => set(i, e.target.value, row[1])} />
          <input className="adm-input" placeholder="Value (e.g. Italian leather)" value={row[1] || ''} onChange={(e) => set(i, row[0], e.target.value)} />
          <button type="button" className="del" onClick={() => del(i)} aria-label="Remove"><I.close /></button>
        </div>
      ))}
      <button type="button" className="adm-add-row" onClick={add}><I.plus width="14" height="14" /> Add spec</button>
    </div>
  );
}

function ProductEditor({ initial, categories, onCancel, onSave, existingIds }) {
  const start = initial || {};
  const firstCat = categories[0] || { name: '', subs: [] };
  const [f, setF] = useState({
    id: start.id || '',
    slug: start.slug || '',
    name: start.name || '',
    brand: start.brand || '',
    category: start.category || firstCat.name,
    subcategory: start.subcategory || (firstCat.subs[0] || ''),
    price: start.price || '',
    retailer: start.retailer || '',
    affiliateUrl: start.affiliateUrl || '',
    badge: start.badge || '',
    rating: start.rating != null ? String(start.rating) : '4.8',
    image: start.image || '',
    description: start.description || '',
    about: (start.detail && start.detail.about && start.detail.about.length) ? start.detail.about : [''],
    highlights: (start.detail && start.detail.highlights && start.detail.highlights.length) ? start.detail.highlights : (start.features && start.features.length ? start.features : ['']),
    specs: (start.detail && start.detail.specs && start.detail.specs.length) ? start.detail.specs : [['', '']],
    is_featured: start.is_featured || false,
    is_resort: start.is_resort || false,
    is_new: start.is_new || false,
  });
  const [err, setErr] = useState('');
  const [imgBusy, bumpImgBusy] = useUploadBusy();
  const isEdit = !!(initial && initial.id);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const catObj = categories.find((c) => c.name === f.category) || firstCat;

  const submit = () => {
    if (!f.name.trim()) return setErr('Product name is required.');
    if (!f.price.trim()) return setErr('Price is required.');
    const slug = (f.slug && f.slug.trim()) || admSlug(f.name);
    if (!isEdit && existingIds.includes(slug)) return setErr(`A product with slug "${slug}" already exists.`);
    const clean = (arr) => arr.map((x) => typeof x === 'string' ? x.trim() : x).filter((x) => Array.isArray(x) ? (x[0] || x[1]) : x);
    onSave({
      id: f.id,
      slug,
      name: f.name.trim(),
      brand: f.brand.trim() || 'Limitra Select',
      category: f.category,
      subcategory: f.subcategory,
      price: f.price.trim().startsWith('$') || /[^0-9.,]/.test(f.price) ? f.price.trim() : '$' + f.price.trim(),
      retailer: f.retailer.trim() || 'the retailer',
      affiliateUrl: f.affiliateUrl.trim(),
      badge: f.badge || null,
      rating: Math.max(0, Math.min(5, parseFloat(f.rating) || 4.8)),
      image: f.image || '',
      description: f.description.trim() || `${f.name.trim()} — a Limitra-curated pick.`,
      features: clean(f.highlights).length ? clean(f.highlights) : ['Editor-selected and quality-checked'],
      highlights: clean(f.highlights),
      about: clean(f.about),
      specs: f.specs.filter((r) => (r[0] || '').trim() || (r[1] || '').trim()),
      is_featured: f.is_featured,
      is_resort: f.is_resort,
      is_new: f.is_new,
    }, isEdit);
  };

  return (
    <div className="adm-form">
      <div className="adm-grid2">
        <div className="adm-field">
          <label>Product name <span className="req">*</span></label>
          <input className="adm-input" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Quilted Leather Crossbody" />
        </div>
        <div className="adm-field">
          <label>Brand</label>
          <input className="adm-input" value={f.brand} onChange={(e) => set('brand', e.target.value)} placeholder="e.g. Maison Vale" />
        </div>
      </div>

      <div className="adm-grid3">
        <div className="adm-field">
          <label>Category <span className="req">*</span></label>
          <select value={f.category} onChange={(e) => { const c = categories.find((x) => x.name === e.target.value); set('category', e.target.value); set('subcategory', c ? (c.subs[0] || '') : ''); }}>
            {categories.map((c) => <option key={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div className="adm-field">
          <label>Subcategory</label>
          <select value={f.subcategory} onChange={(e) => set('subcategory', e.target.value)}>
            {(catObj.subs || []).map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="adm-field">
          <label>Badge</label>
          <select value={f.badge} onChange={(e) => set('badge', e.target.value)}>
            {BADGES.map((b) => <option key={b} value={b}>{b || '— None —'}</option>)}
          </select>
        </div>
      </div>

      <div className="adm-grid2">
        <div className="adm-field">
          <label>Price <span className="req">*</span></label>
          <input className="adm-input" value={f.price} onChange={(e) => set('price', e.target.value)} placeholder="$280" />
        </div>
        <div className="adm-field">
          <label>Rating (0–5)</label>
          <input className="adm-input" type="number" min="0" max="5" step="0.1" value={f.rating} onChange={(e) => set('rating', e.target.value)} />
        </div>
      </div>

      <div className="adm-grid2">
        <div className="adm-field">
          <label>Retailer name</label>
          <input className="adm-input" value={f.retailer} onChange={(e) => set('retailer', e.target.value)} placeholder="e.g. Net-a-Porter" />
        </div>
        <div className="adm-field">
          <label>Affiliate link</label>
          <input className="adm-input" value={f.affiliateUrl} onChange={(e) => set('affiliateUrl', e.target.value)} placeholder="https://retailer.com/product?aff=limitra" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, color: 'var(--ink)', cursor: 'pointer' }}>
          <input type="checkbox" checked={f.is_featured} onChange={(e) => set('is_featured', e.target.checked)} />
          Feature on homepage
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, color: 'var(--ink)', cursor: 'pointer' }}>
          <input type="checkbox" checked={f.is_resort} onChange={(e) => set('is_resort', e.target.checked)} />
          Resort picks row
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, color: 'var(--ink)', cursor: 'pointer' }}>
          <input type="checkbox" checked={f.is_new} onChange={(e) => set('is_new', e.target.checked)} />
          New arrival
        </label>
      </div>

      <div className="adm-section-title">Images</div>
      <div className="adm-field">
        <label>Main image</label>
        <ImgInput value={f.image} onChange={(v) => set('image', v)} onBusyChange={(b) => bumpImgBusy(b ? 1 : -1)} />
      </div>

      <div className="adm-section-title">Descriptions</div>
      <div className="adm-field">
        <label>Short description</label>
        <textarea className="adm-textarea" value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="One or two sentences shown on the product detail lead and Quick View." />
      </div>
      <div className="adm-field">
        <label>About this product <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>— editorial paragraphs</span></label>
        <Repeater items={f.about} onChange={(v) => set('about', v)} placeholder="Write a paragraph about the product…" textarea />
      </div>
      <div className="adm-field">
        <label>Highlights / key features</label>
        <Repeater items={f.highlights} onChange={(v) => set('highlights', v)} placeholder="e.g. Full-grain Italian leather" />
      </div>
      <div className="adm-field">
        <label>Specifications</label>
        <SpecsEditor items={f.specs} onChange={(v) => set('specs', v)} />
      </div>

      {!isEdit && (
        <div className="adm-field">
          <label>URL slug</label>
          <input className="adm-input" value={f.slug} onChange={(e) => set('slug', admSlug(e.target.value))} placeholder={admSlug(f.name) || 'auto-generated-from-name'} />
          <span className="help" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, display: 'block' }}>Used in the product link. Leave blank to auto-generate.</span>
        </div>
      )}

      <div className="adm-form-foot">
        {err && <span className="err">{err}</span>}
        <span className="spacer"></span>
        <button type="button" className="adm-btn adm-btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="button" className="adm-btn adm-btn-primary" onClick={submit} disabled={imgBusy}><I.check /> {isEdit ? 'Save changes' : 'Add product'}</button>
      </div>
    </div>
  );
}

const priceValue = (p) => parseFloat(String(p.price ?? '').replace(/[^0-9.]/g, '')) || 0;

// 'products' is a lazy (optional) prop — a save/delete visit must explicitly
// name it (and the eager dashboard stats it affects) or Inertia drops it from
// the response entirely instead of refreshing it.
const PRODUCTS_ONLY = ['products', 'productsCount', 'featuredCount', 'resortCount', 'linkedCount', 'recentProducts'];

export default function ProductsView({ products, categories, productsLookup, onToast }) {
  const [editor, setEditor] = useState(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [sort, setSort] = useState(null);
  const [loading, setLoading] = useState(false);

  const reloadWith = (overrides = {}) => {
    const nextSort = overrides.sort !== undefined ? overrides.sort : sort;
    const nextCat = overrides.cat !== undefined ? overrides.cat : cat;
    router.reload({
      data: {
        products_page: overrides.page ?? products.current_page,
        products_per_page: overrides.perPage ?? products.per_page,
        products_sort: nextSort?.key || '',
        products_dir: nextSort?.dir || '',
        products_q: overrides.q !== undefined ? overrides.q : q,
        products_category: nextCat === 'All' ? '' : nextCat,
      },
      only: ['products'],
      preserveState: true,
      preserveScroll: true,
      onStart: () => setLoading(true),
      onFinish: () => setLoading(false),
    });
  };

  const runSearch = () => reloadWith({ q, page: 1 });

  const onCatChange = (value) => {
    setCat(value);
    reloadWith({ cat: value, page: 1 });
  };

  const onSortChange = (nextSort) => {
    setSort(nextSort);
    reloadWith({ sort: nextSort, page: 1 });
  };

  const saveProduct = (data, isEdit) => {
    if (isEdit) {
      router.put('/admin/products/' + data.id, data, {
        only: PRODUCTS_ONLY, preserveState: true, preserveScroll: true,
        onSuccess: () => { setEditor(null); onToast('Product updated.'); }
      });
    } else {
      router.post('/admin/products', data, {
        only: PRODUCTS_ONLY, preserveState: true, preserveScroll: true,
        onSuccess: () => { setEditor(null); onToast('Product added — live on storefront.'); }
      });
    }
  };

  const deleteProduct = (p) => {
    if (!confirm(`Delete "${p.name}"? This removes it from the storefront.`)) return;
    router.delete('/admin/products/' + p.id, {
      only: PRODUCTS_ONLY, preserveState: true, preserveScroll: true,
      onSuccess: () => onToast('Product deleted.')
    });
  };
  const cats = ['All', ...categories.map((c) => c.name)];

  const columns = [
    {
      key: 'image', label: '', sortable: false, width: 60,
      render: (p) => p.image ? <img className="adm-thumb" src={p.image} alt="" /> : <span className="adm-thumb ph"><I.image width="16" height="16" /></span>,
    },
    {
      key: 'name', label: 'Product',
      render: (p) => (
        <>
          <div className="adm-pbrand">{p.brand}</div>
          <div className="adm-pname">{p.name}</div>
          {p.is_featured && <span className="adm-tag yours" style={{ marginRight: 4 }}>Featured</span>}
          {p.is_resort && <span className="adm-tag cat">Resort</span>}
        </>
      ),
    },
    {
      key: 'category', label: 'Category',
      render: (p) => (
        <>
          <span className="adm-tag cat">{p.category}</span>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{p.subcategory}</div>
        </>
      ),
    },
    {
      key: 'price', label: 'Price', sortValue: priceValue,
      render: (p) => <span style={{ fontFamily: 'var(--font-display,serif)', color: 'var(--brand)', fontSize: 16 }}>{p.price}</span>,
    },
    {
      key: 'affiliateUrl', label: 'Affiliate link', sortValue: (p) => (p.affiliateUrl ? 1 : 0),
      render: (p) => p.affiliateUrl ? <span className="adm-link-ok"><I.check width="13" height="13" /> Linked</span> : <span className="adm-link-no">— none —</span>,
    },
    {
      key: 'actions', label: 'Actions', align: 'right', sortable: false,
      render: (p) => (
        <div className="adm-row-actions">
          <a className="adm-icon" href={'/product/' + (p.slug || p.id)} target="_blank" rel="noopener" aria-label="View on storefront"><I.eye /></a>
          <button className="adm-icon" onClick={() => setEditor(p)} aria-label="Edit"><I.edit /></button>
          <button className="adm-icon danger" onClick={() => deleteProduct(p)} aria-label="Delete"><I.trash /></button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Products</h1>
          <p>{products.total} product{products.total === 1 ? '' : 's'} in your affiliate catalog.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <BulkImportButton
            label="products"
            headers={['name', 'brand', 'category', 'subcategory', 'price', 'retailer', 'affiliate_url', 'image', 'badge', 'rating', 'description', 'is_featured', 'is_resort', 'is_new', 'highlights', 'about', 'specs']}
            sample={{
              name: 'Quilted Leather Crossbody', brand: 'Maison Vale',
              category: categories[0]?.name || 'Bags', subcategory: categories[0]?.subs?.[0] || '', price: '280',
              retailer: 'Net-a-Porter', affiliate_url: 'https://retailer.com/product?aff=limitra',
              image: 'https://example.com/image.jpg', badge: 'New', rating: '4.8',
              description: 'A refined leather crossbody for everyday polish.',
              is_featured: 'TRUE', is_resort: 'FALSE', is_new: 'TRUE',
              highlights: 'Full-grain leather|Adjustable strap', about: 'Handcrafted in Italy.|Lined interior with zip pocket.',
              specs: 'Material:Leather;Origin:Italy',
            }}
            existing={productsLookup}
            parseRow={(raw) => ({
              name: raw.name, brand: raw.brand, category: raw.category, subcategory: raw.subcategory,
              price: raw.price, retailer: raw.retailer, affiliateUrl: raw.affiliate_url, image: raw.image,
              badge: raw.badge, rating: raw.rating, description: raw.description,
              is_featured: toBool(raw.is_featured), is_resort: toBool(raw.is_resort), is_new: toBool(raw.is_new),
              highlights: splitList(raw.highlights), about: splitList(raw.about),
              specs: String(raw.specs || '').split(';').map((s) => s.trim()).filter(Boolean).map((pair) => pair.split(':').map((x) => x.trim())),
            })}
            matchExisting={(raw, data, existing) => (data.name ? existing.find((p) => (p.name || '').trim().toLowerCase() === data.name.trim().toLowerCase()) : null)}
            getId={(p) => p.id}
            summarize={(data, match) => `${data.name || '(no name)'}${match ? ' → updates “' + match.name + '”' : ''}`}
            importUrl="/admin/products/bulk-import"
            onToast={onToast}
          />
          <a className="adm-btn adm-btn-ghost" href="/admin/products/export">
            <I.download /> Download all
          </a>
          <button className="adm-btn adm-btn-primary" onClick={() => setEditor({})}><I.plus /> Add product</button>
        </div>
      </div>

      {products.total === 0 && !q && cat === 'All' ? (
        <div className="adm-panel">
          <div className="adm-empty">
            <I.box width="48" height="48" />
            <h3>Your catalog is empty</h3>
            <p>Add a product with its affiliate link, images and description.</p>
            <button className="adm-btn adm-btn-primary" onClick={() => setEditor({})}><I.plus /> Add your first product</button>
          </div>
        </div>
      ) : (
        <div className="adm-panel">
          <DataTable
            columns={columns}
            rows={products.data}
            getRowId={(p) => p.id}
            server={{
              page: products.current_page,
              perPage: products.per_page,
              total: products.total,
              lastPage: products.last_page,
              sort,
              loading,
              onPageChange: (page) => reloadWith({ page }),
              onPerPageChange: (perPage) => reloadWith({ perPage, page: 1 }),
              onSortChange,
            }}
            toolbar={
              <>
                <div className="adm-search">
                  <I.search />
                  <input
                    placeholder="Search your products…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }}
                  />
                </div>
                <button type="button" className="adm-btn adm-btn-ghost sm" onClick={runSearch}><I.search width="13" height="13" /> Search</button>
                <select className="adm-select" value={cat} onChange={(e) => onCatChange(e.target.value)}>
                  {cats.map((c) => <option key={c}>{c}</option>)}
                </select>
              </>
            }
            emptyState={<div className="adm-empty" style={{ padding: '32px 0' }}><p style={{ margin: 0 }}>No products match your filters.</p></div>}
          />
        </div>
      )}

      {editor && (
        <div className="adm-overlay" onMouseDown={() => setEditor(null)}>
          <div className="adm-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="adm-modal-head">
              <h2>{editor.id ? 'Edit product' : 'Add product'}</h2>
              <button className="adm-close" onClick={() => setEditor(null)} aria-label="Close"><I.close /></button>
            </div>
            <div className="adm-modal-body">
              <ProductEditor
                initial={editor}
                categories={categories}
                existingIds={productsLookup.map((p) => p.slug).filter(Boolean)}
                onCancel={() => setEditor(null)}
                onSave={saveProduct}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
