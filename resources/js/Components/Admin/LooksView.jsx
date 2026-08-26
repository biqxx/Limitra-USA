import { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import I from '../Icons';
import DataTable from './DataTable';
import { admSlug, useUploadBusy, ImgInput, BulkImportButton, useLookup, useServerTable } from './AdminShared';

// The storefront mosaic is an 8-column grid — clamp spans to that so a tile
// set here can never overflow the row it's placed on.
function SearchableProductSelect({ value, onChange, products }) {
  const selected = products.find((product) => String(product.id) === String(value));
  const [query, setQuery] = useState(selected ? `${selected.name} (${selected.brand})` : '');
  const [open, setOpen] = useState(false);
  const normalized = query.trim().toLowerCase();
  const matches = products.filter((product) =>
    !normalized || `${product.name} ${product.brand}`.toLowerCase().includes(normalized)
  ).slice(0, 30);

  const choose = (product) => {
    onChange(product ? product.id : '');
    setQuery(product ? `${product.name} (${product.brand})` : '');
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <div className="adm-search" style={{ width: '100%' }}>
        <I.search />
        <input value={query} placeholder="Type to search products…"
          onFocus={() => { setQuery(''); setOpen(true); }}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onBlur={() => {
            setTimeout(() => {
              setOpen(false);
              setQuery(selected ? `${selected.name} (${selected.brand})` : '');
            }, 120);
          }} />
      </div>
      {open && (
        <div style={{ position: 'absolute', zIndex: 20, left: 0, right: 0, top: 'calc(100% + 4px)', maxHeight: 220, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 8, background: 'var(--card)', boxShadow: '0 12px 28px rgba(20,25,40,.16)' }}>
          {value && <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(null)} style={{ width: '100%', padding: '9px 12px', border: 0, borderBottom: '1px solid var(--line)', background: 'none', textAlign: 'left', cursor: 'pointer', color: 'var(--muted)', fontSize: 12 }}>— Image only —</button>}
          {matches.length === 0 && <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--muted)' }}>No matching products.</div>}
          {matches.map((product) => (
            <button key={product.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => choose(product)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: 0, borderBottom: '1px solid var(--line)', background: 'none', textAlign: 'left', cursor: 'pointer' }}>
              {product.image
                ? <img src={product.image} alt="" style={{ width: 34, height: 34, borderRadius: 5, objectFit: 'cover', flex: 'none' }} />
                : <span style={{ width: 34, height: 34, borderRadius: 5, background: 'var(--bg)', display: 'grid', placeItems: 'center', flex: 'none' }}><I.image width="14" height="14" /></span>}
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</span>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)' }}>{product.brand}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function GridBuilder({ items, onChange, products }) {
  const lookup = useMemo(() => { const m = {}; products.forEach((p) => { m[p.id] = p; if (p.slug) m[p.slug] = p; }); return m; }, [products]);
  const set = (i, patch) => { const n = [...items]; n[i] = { ...n[i], ...patch }; onChange(n); };
  const del = (i) => onChange(items.filter((_, j) => j !== i));
  const add = () => onChange([...items, { type: 'product', id: '', image: '' }]);
  const move = (i, d) => { const n = [...items]; [n[i], n[i + d]] = [n[i + d], n[i]]; onChange(n); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>Carousel images</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((item, i) => {
            const p = item.id ? lookup[item.id] : null;
            return (
              <div key={i} style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, padding: 12, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 52, height: 52, borderRadius: 7, overflow: 'hidden', background: 'var(--card)', border: '1px solid var(--line)', flex: 'none' }}>
                  {item.image ? <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : p && p.image ? <img src={p.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><I.image style={{ color: 'var(--muted)' }} /></div>}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <SearchableProductSelect value={item.id || ''} onChange={(id) => set(i, { id })} products={products} />
                  <input className="adm-input" style={{ fontSize: 12 }} placeholder="Custom image URL (optional)" value={item.image && !item.image.startsWith('data:') ? item.image : ''} onChange={(e) => set(i, { image: e.target.value })} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <button type="button" className="adm-icon" onClick={() => move(i, -1)} disabled={i === 0}><I.back style={{ transform: 'rotate(90deg)' }} /></button>
                  <button type="button" className="adm-icon" onClick={() => move(i, 1)} disabled={i === items.length - 1}><I.back style={{ transform: 'rotate(-90deg)' }} /></button>
                  <button type="button" className="adm-icon danger" onClick={() => del(i)}><I.trash /></button>
                </div>
              </div>
            );
          })}
          <button type="button" className="adm-add-row" onClick={add}><I.plus width="14" height="14" /> Add item</button>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>Live preview</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8, background: '#ddd5cc', borderRadius: 8, padding: 8, border: '1px solid var(--line)', maxWidth: 520 }}>
          {items.length === 0 && <div style={{ gridColumn: '1 / -1', padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--muted)', background: 'var(--surface)' }}>Add items above</div>}
          {items.map((item, i) => {
            const p = item.id ? lookup[item.id] : null;
            const src = item.image || (p && p.image) || '';
            const colors = ['#e8d5c8','#c8d5e8','#d5e8c8','#e8c8d5','#d5c8e8','#e8e0c8','#c8e8e0','#e0e8c8'];
            return (
              <div key={i} style={{ aspectRatio: '3 / 4', borderRadius: 7, background: src ? 'transparent' : colors[i % colors.length], position: 'relative', overflow: 'hidden' }}>
                {src && <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                <div style={{ position: 'absolute', bottom: 4, left: 4, fontSize: 9, fontWeight: 700, background: 'rgba(0,0,0,.55)', color: '#fff', borderRadius: 3, padding: '2px 5px' }}>
                  {p ? `${p.name.slice(0, 14)}…` : `Image ${i + 1}`}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>Images appear in this order in the storefront carousel.</div>
      </div>
    </div>
  );
}

function LookEditor({ initial, products, onCancel, onSave, existingIds }) {
  const isEdit = !!(initial && initial.id);
  const [event, setEvent] = useState(initial.event || '');
  const [tags, setTags] = useState((initial.tags || []).join(', '));
  const [heroImg, setHeroImg] = useState(initial.hero_img || '');
  const [styleNotes, setStyleNotes] = useState(initial.style_notes || '');
  const [palette, setPalette] = useState((initial.palette || ['#1a2744', '#cf8a32', '#f8f6f1', '#c4a882', '#2d5a8a']).join(', '));
  const [gridItems, setGridItems] = useState(initial.grid_items || []);
  const [err, setErr] = useState('');
  const [imgBusy, bumpImgBusy] = useUploadBusy();

  const submit = () => {
    if (!event.trim()) return setErr('Event name is required.');
    const slug = initial.slug || admSlug(event);
    if (!isEdit && existingIds.includes(slug)) return setErr(`Slug "${slug}" already used.`);
    onSave({
      slug, event: event.trim(),
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      heroImg: heroImg.trim(),
      styleNotes: styleNotes.trim(),
      palette: palette.split(',').map((p) => p.trim()).filter(Boolean),
      gridItems: gridItems.filter((it) => it.id || it.image).map(({ colSpan, rowSpan, col_span, row_span, ...item }) => item),
    }, isEdit, initial.id);
  };

  return (
    <div className="adm-form">
      <div className="adm-grid2">
        <div className="adm-field"><label>Event name <span className="req">*</span></label>
          <input className="adm-input" value={event} onChange={(e) => setEvent(e.target.value)} placeholder="e.g. Evening Elegance" /></div>
        <div className="adm-field"><label>Tags (comma-separated)</label>
          <input className="adm-input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. Colorful, Playful Luxury" /></div>
      </div>
      <ImgInput label="Hero model photo (tall, portrait)" value={heroImg} onChange={setHeroImg} onBusyChange={(b) => bumpImgBusy(b ? 1 : -1)} />
      <div className="adm-field"><label>Style notes</label>
        <textarea className="adm-textarea" value={styleNotes} onChange={(e) => setStyleNotes(e.target.value)} placeholder="Editorial notes shown at the bottom of the look…" /></div>
      <div className="adm-field"><label>Colour palette (hex codes, comma-separated)</label>
        <input className="adm-input" value={palette} onChange={(e) => setPalette(e.target.value)} placeholder="#1a2744, #cf8a32, #f8f6f1" /></div>
      <div className="adm-section-title">Product Carousel</div>
      <GridBuilder items={gridItems} onChange={setGridItems} products={products} />
      <div className="adm-form-foot">
        {err && <span className="err">{err}</span>}
        <span className="spacer"></span>
        <button type="button" className="adm-btn adm-btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="button" className="adm-btn adm-btn-primary" onClick={submit} disabled={imgBusy}><I.check /> {isEdit ? 'Save changes' : 'Publish look'}</button>
      </div>
    </div>
  );
}

export default function LooksView({ looks, productsLookup, onToast }) {
  const [editor, setEditor] = useState(null);
  const looksLookup = useLookup('/admin/looks/lookup');
  const { server } = useServerTable('looks', 'looks');

  const del = (id) => {
    if (!confirm('Delete this look?')) return;
    router.delete('/admin/looks/' + id, {
      only: ['looks'], preserveState: true, preserveScroll: true,
      onSuccess: () => onToast('Look deleted.')
    });
  };

  const save = (data, isEdit, id) => {
    if (isEdit) {
      router.put('/admin/looks/' + id, data, {
        only: ['looks'], preserveState: true, preserveScroll: true,
        onSuccess: () => { setEditor(null); onToast('Look updated.'); }
      });
    } else {
      router.post('/admin/looks', data, {
        only: ['looks'], preserveState: true, preserveScroll: true,
        onSuccess: () => { setEditor(null); onToast('Look added — live on storefront.'); }
      });
    }
  };

  const columns = [
    {
      key: 'hero_img', label: '', sortable: false, width: 60,
      render: (l) => l.hero_img ? <img className="adm-thumb" src={l.hero_img} alt="" /> : <span className="adm-thumb ph"><I.image width="16" height="16" /></span>,
    },
    {
      key: 'event', label: 'Event',
      render: (l) => (<><div className="adm-pname">{l.event}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{l.slug}</div></>),
    },
    {
      key: 'grid_items', label: 'Grid items', sortValue: (l) => (l.grid_items || []).length,
      render: (l) => <span className="adm-tag yours">{(l.grid_items || []).length} items</span>,
    },
    {
      key: 'tags', label: 'Tags', sortValue: (l) => (l.tags || []).join(' · '),
      render: (l) => <span style={{ fontSize: 12, color: 'var(--muted)' }}>{(l.tags || []).join(' · ')}</span>,
    },
    {
      key: 'actions', label: 'Actions', align: 'right', sortable: false,
      render: (l) => (
        <div className="adm-row-actions">
          <a className="adm-icon" href={'/look/' + l.slug} target="_blank" rel="noopener" aria-label="Preview"><I.eye /></a>
          <button className="adm-icon" onClick={() => setEditor(l)} aria-label="Edit"><I.edit /></button>
          <button className="adm-icon danger" onClick={() => del(l.id)} aria-label="Delete"><I.trash /></button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="adm-head">
        <div><h1>Style the Look</h1><p>Create curated outfit galleries with a custom image grid.</p></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <BulkImportButton
            label="looks"
            headers={['slug', 'event', 'tags', 'hero_img', 'style_notes', 'palette']}
            sample={{
              slug: 'evening-elegance', event: 'Evening Elegance', tags: 'Colorful, Playful Luxury',
              hero_img: 'https://example.com/hero.jpg', style_notes: 'Editorial notes shown at the bottom of the look.',
              palette: '#1a2744, #cf8a32, #f8f6f1',
            }}
            existing={looksLookup}
            parseRow={(raw) => ({
              slug: raw.slug, event: raw.event,
              tags: String(raw.tags || '').split(',').map((t) => t.trim()).filter(Boolean),
              heroImg: raw.hero_img, styleNotes: raw.style_notes,
              palette: String(raw.palette || '').split(',').map((p) => p.trim()).filter(Boolean),
            })}
            matchExisting={(raw, data, existing) => (data.slug ? existing.find((l) => l.slug === admSlug(data.slug)) : null)}
            getId={(l) => l.id}
            summarize={(data, match) => `${data.event || '(no event name)'}${match ? ' → updates “' + match.event + '”' : ''}`}
            importUrl="/admin/looks/bulk-import"
            onToast={onToast}
          />
          <button className="adm-btn adm-btn-primary" onClick={() => setEditor({})}><I.plus /> New look</button>
        </div>
      </div>
      {looks.total === 0 ? (
        <div className="adm-panel"><div className="adm-empty"><I.image width="42" height="42" /><h3>No looks yet</h3><p>Create your first curated outfit look.</p>
          <button className="adm-btn adm-btn-primary" onClick={() => setEditor({})}><I.plus /> Create a look</button></div></div>
      ) : (
        <div className="adm-panel">
          <DataTable
            columns={columns}
            rows={looks.data}
            getRowId={(l) => l.id}
            server={server(looks)}
          />
        </div>
      )}
      {editor && (
        <div className="adm-overlay" onMouseDown={() => setEditor(null)}>
          <div className="adm-modal" style={{ width: 'min(1100px,98vw)' }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="adm-modal-head">
              <h2>{editor.id ? 'Edit look' : 'New look'}</h2>
              <button className="adm-close" onClick={() => setEditor(null)}><I.close /></button>
            </div>
            <div className="adm-modal-body">
              <LookEditor initial={editor} products={productsLookup} onCancel={() => setEditor(null)} onSave={save} existingIds={looksLookup.map((l) => l.slug)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
