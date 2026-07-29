import { useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import I from '../Icons';
import DataTable from './DataTable';
import { admSlug, useUploadBusy, ImgInput, BulkImportButton, useLookup, useServerTable } from './AdminShared';

const SPAN_OPTIONS = [
  { label: '1×1', col: 1, row: 1 }, { label: '2×1', col: 2, row: 1 },
  { label: '1×2', col: 1, row: 2 }, { label: '2×2', col: 2, row: 2 },
];

function GridBuilder({ items, onChange, products }) {
  const lookup = useMemo(() => { const m = {}; products.forEach((p) => { m[p.id] = p; if (p.slug) m[p.slug] = p; }); return m; }, [products]);
  const set = (i, patch) => { const n = [...items]; n[i] = { ...n[i], ...patch }; onChange(n); };
  const del = (i) => onChange(items.filter((_, j) => j !== i));
  const add = () => onChange([...items, { type: 'product', id: '', image: '', colSpan: 1, rowSpan: 1 }]);
  const move = (i, d) => { const n = [...items]; [n[i], n[i + d]] = [n[i + d], n[i]]; onChange(n); };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 20, alignItems: 'start' }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>Grid items</div>
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
                  <select className="adm-select" style={{ flex: 1, fontSize: 12.5 }} value={item.id || ''} onChange={(e) => set(i, { id: e.target.value })}>
                    <option value="">— Image only —</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.brand})</option>)}
                  </select>
                  <input className="adm-input" style={{ fontSize: 12 }} placeholder="Custom image URL (optional)" value={item.image && !item.image.startsWith('data:') ? item.image : ''} onChange={(e) => set(i, { image: e.target.value })} />
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>Span:</span>
                    {SPAN_OPTIONS.map((opt) => (
                      <button key={opt.label} type="button" onClick={() => set(i, { colSpan: opt.col, rowSpan: opt.row })}
                        style={{ fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 5, border: '1.5px solid',
                          borderColor: item.colSpan === opt.col && item.rowSpan === opt.row ? 'var(--brand)' : 'var(--line)',
                          background: item.colSpan === opt.col && item.rowSpan === opt.row ? 'var(--brand)' : 'var(--surface)',
                          color: item.colSpan === opt.col && item.rowSpan === opt.row ? '#fff' : 'var(--ink)', cursor: 'pointer' }}>{opt.label}</button>
                    ))}
                  </div>
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
      <div style={{ position: 'sticky', top: 80 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>Live preview</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, background: '#ddd5cc', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line)' }}>
          {items.length === 0 && <div style={{ gridColumn: 'span 2', padding: 24, textAlign: 'center', fontSize: 13, color: 'var(--muted)', background: 'var(--surface)' }}>Add items above</div>}
          {items.map((item, i) => {
            const p = item.id ? lookup[item.id] : null;
            const src = item.image || (p && p.image) || '';
            const colors = ['#e8d5c8','#c8d5e8','#d5e8c8','#e8c8d5','#d5c8e8','#e8e0c8','#c8e8e0','#e0e8c8'];
            return (
              <div key={i} style={{ gridColumn: `span ${item.colSpan || 1}`, gridRow: `span ${item.rowSpan || 1}`, background: src ? 'transparent' : colors[i % colors.length], minHeight: 70 * (item.rowSpan || 1), position: 'relative', overflow: 'hidden' }}>
                {src && <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                <div style={{ position: 'absolute', bottom: 4, left: 4, fontSize: 9, fontWeight: 700, background: 'rgba(0,0,0,.55)', color: '#fff', borderRadius: 3, padding: '2px 5px' }}>
                  {item.colSpan || 1}×{item.rowSpan || 1} {p ? `· ${p.name.slice(0, 14)}…` : ''}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>2-column grid. Spans fill left-to-right, top-to-bottom.</div>
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
      gridItems: gridItems.filter((it) => it.id || it.image),
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
      <div className="adm-section-title">Product Grid</div>
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
      preserveState: true, preserveScroll: true,
      onSuccess: () => onToast('Look deleted.')
    });
  };

  const save = (data, isEdit, id) => {
    if (isEdit) {
      router.put('/admin/looks/' + id, data, {
        preserveState: true, preserveScroll: true,
        onSuccess: () => { setEditor(null); onToast('Look updated.'); }
      });
    } else {
      router.post('/admin/looks', data, {
        preserveState: true, preserveScroll: true,
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
