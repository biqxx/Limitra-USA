import { useState } from 'react';
import { router } from '@inertiajs/react';
import I from '../Icons';
import DataTable from './DataTable';
import { admSlug, useUploadBusy, ImgInput, BulkImportButton, VideoProductPicker, toBool, useLookup, useServerTable } from './AdminShared';

function OccEditor({ initial, onCancel, onSave, existing, categories, products }) {
  const isEdit = !!(initial && initial.id);
  const [title, setTitle] = useState(initial.title || '');
  const [eyebrow, setEyebrow] = useState(initial.eyebrow || '');
  const [tagline, setTagline] = useState(initial.tagline || '');
  const [badge, setBadge] = useState(initial.badge || '');
  const [img, setImg] = useState(initial.img || '');
  const [link, setLink] = useState(initial.link || '/collection/');
  const [productIds, setProductIds] = useState(initial.product_ids || []);
  const [subcats, setSubcats] = useState((initial.subcats || []).join(', '));
  const [featured, setFeatured] = useState(initial.featured || false);
  const [isHero, setIsHero] = useState(initial.is_hero || false);
  const [err, setErr] = useState('');
  const [imgBusy, bumpImgBusy] = useUploadBusy();
  const availableSubcats = (categories || []).flatMap((c) => c.subs || []);
  const submit = () => {
    if (!title.trim()) return setErr('Title required.');
    const key = initial.key || admSlug(title);
    if (!isEdit && existing.includes(key)) return setErr(`Key "${key}" already exists.`);
    const subcatsList = subcats.split(',').map((s) => s.trim()).filter(Boolean);
    onSave({ key, title: title.trim(), eyebrow: eyebrow.trim(), tagline: tagline.trim(), badge: badge.trim(), img, link, product_ids: productIds, subcats: subcatsList, featured, is_hero: isHero }, isEdit, initial.id);
  };
  return (
    <div className="adm-form">
      <div className="adm-grid2">
        <div className="adm-field"><label>Title <span className="req">*</span></label><input className="adm-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Valentine's Day Edit" /></div>
        <div className="adm-field"><label>Eyebrow label</label><input className="adm-input" value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} placeholder="e.g. Limited · 2026" /></div>
      </div>
      <div className="adm-field"><label>Tagline</label><textarea className="adm-textarea" style={{ minHeight: 60 }} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Short description shown on the card…" /></div>
      <div className="adm-grid2">
        <div className="adm-field"><label>Badge</label><input className="adm-input" value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="e.g. 💝 Valentine's" /></div>
        <div className="adm-field"><label>Collection link</label><input className="adm-input" value={link} onChange={(e) => setLink(e.target.value)} /></div>
      </div>
      <div className="adm-field">
        <label>Products in this occasion <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(leave empty to show the whole catalog)</span></label>
        <VideoProductPicker selectedIds={productIds} onChange={setProductIds} products={products || []} />
      </div>
      <div className="adm-field">
        <label>Curated subcategories <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional fallback — only used when no products are picked above; comma separated)</span></label>
        <input className="adm-input" value={subcats} onChange={(e) => setSubcats(e.target.value)} placeholder="e.g. Dresses, Jewelry, Fragrances" />
        {availableSubcats.length > 0 && (
          <p style={{ fontSize: 12, color: 'var(--muted)', margin: '6px 0 0' }}>Available: {availableSubcats.join(', ')}</p>
        )}
      </div>
      <ImgInput label="Occasion image" value={img} onChange={setImg} onBusyChange={(b) => bumpImgBusy(b ? 1 : -1)} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, color: 'var(--ink)', cursor: 'pointer' }}>
          <input type="checkbox" checked={isHero} onChange={(e) => setIsHero(e.target.checked)} />
          Hero occasion — shown as the large banner above the occasion grid (only one at a time)
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, color: 'var(--ink)', cursor: 'pointer' }}>
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
          Featured (shows animated gold border on card)
        </label>
      </div>
      <div className="adm-form-foot">{err && <span className="err">{err}</span>}<span className="spacer"></span>
        <button type="button" className="adm-btn adm-btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="button" className="adm-btn adm-btn-primary" onClick={submit} disabled={imgBusy}><I.check /> {isEdit ? 'Save' : 'Publish'} occasion</button></div>
    </div>
  );
}

export default function OccasionsAdminView({ occasions, categories, productsLookup, onToast }) {
  const [editor, setEditor] = useState(null);
  const occasionsLookup = useLookup('/admin/occasions/lookup');
  const { server } = useServerTable('occasions', 'occasions');

  const del = (id) => {
    if (!confirm('Delete this occasion?')) return;
    router.delete('/admin/occasions/' + id, {
      preserveState: true, preserveScroll: true,
      onSuccess: () => onToast('Occasion deleted.')
    });
  };

  const save = (data, isEdit, id) => {
    if (isEdit) {
      router.put('/admin/occasions/' + id, data, {
        preserveState: true, preserveScroll: true,
        onSuccess: () => { setEditor(null); onToast('Occasion saved.'); }
      });
    } else {
      router.post('/admin/occasions', data, {
        preserveState: true, preserveScroll: true,
        onSuccess: () => { setEditor(null); onToast('Occasion saved.'); }
      });
    }
  };

  const columns = [
    {
      key: 'img', label: '', sortable: false, width: 70,
      render: (o) => o.img ? <img className="adm-thumb" src={o.img} alt="" /> : <span className="adm-thumb ph"><I.sparkle width="16" height="16" /></span>,
    },
    {
      key: 'title', label: 'Occasion',
      render: (o) => (<><div className="adm-pname">{o.title}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{o.tagline ? o.tagline.slice(0, 55) + '…' : ''}</div></>),
    },
    { key: 'badge', label: 'Badge', render: (o) => <span style={{ fontSize: 13 }}>{o.badge}</span> },
    { key: 'link', label: 'Link', render: (o) => <span style={{ fontSize: 12, color: 'var(--muted)' }}>{o.link}</span> },
    {
      key: 'actions', label: 'Actions', align: 'right', sortable: false,
      render: (o) => (
        <div className="adm-row-actions">
          {o.link && <a className="adm-icon" href={o.link} target="_blank" rel="noopener" aria-label="Preview"><I.eye /></a>}
          <button className="adm-icon" onClick={() => setEditor(o)} aria-label="Edit"><I.edit /></button>
          <button className="adm-icon danger" onClick={() => del(o.id)} aria-label="Delete"><I.trash /></button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="adm-head"><div><h1>Special Occasions</h1><p>Manage curated occasion collections on the homepage.</p></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <BulkImportButton
            label="occasions"
            headers={['key', 'title', 'eyebrow', 'tagline', 'badge', 'img', 'link', 'featured', 'is_hero']}
            sample={{
              key: 'valentines-day-edit', title: "Valentine's Day Edit", eyebrow: 'Limited · 2026',
              tagline: 'Short description shown on the card.', badge: "💝 Valentine's",
              img: 'https://example.com/occasion.jpg', link: '/collection/valentines', featured: 'FALSE', is_hero: 'FALSE',
            }}
            existing={occasionsLookup}
            parseRow={(raw) => ({
              key: raw.key, title: raw.title, eyebrow: raw.eyebrow, tagline: raw.tagline, badge: raw.badge,
              img: raw.img, link: raw.link, featured: toBool(raw.featured), is_hero: toBool(raw.is_hero),
            })}
            matchExisting={(raw, data, existing) => (data.key ? existing.find((o) => o.key === admSlug(data.key)) : null)}
            getId={(o) => o.id}
            summarize={(data, match) => `${data.title || '(no title)'}${match ? ' → updates “' + match.title + '”' : ''}`}
            importUrl="/admin/occasions/bulk-import"
            onToast={onToast}
          />
          <button className="adm-btn adm-btn-primary" onClick={() => setEditor({})}><I.plus /> New occasion</button>
        </div></div>
      <div className="adm-panel">
        {occasions.total === 0 ? (
          <div className="adm-empty"><I.sparkle width="40" height="40" /><p style={{ margin: 0 }}>No occasions yet.</p></div>
        ) : (
          <DataTable columns={columns} rows={occasions.data} getRowId={(o) => o.id} server={server(occasions)} />
        )}
      </div>
      {editor && (
        <div className="adm-overlay" onMouseDown={() => setEditor(null)}>
          <div className="adm-modal" style={{ width: 'min(900px,98vw)' }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="adm-modal-head"><h2>{editor.id ? 'Edit occasion' : 'New occasion'}</h2>
              <button className="adm-close" onClick={() => setEditor(null)}><I.close /></button></div>
            <div className="adm-modal-body">
              <OccEditor initial={editor} onCancel={() => setEditor(null)} onSave={save} existing={occasionsLookup.map((o) => o.key)} categories={categories} products={productsLookup} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
