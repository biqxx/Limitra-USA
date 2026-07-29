import { useState } from 'react';
import { router } from '@inertiajs/react';
import I from '../Icons';
import { ART_TAGS } from '../../constants';
import DataTable from './DataTable';
import { admSlug, useUploadBusy, ImgInput, BulkImportButton, VideoProductPicker, toBool, useLookup, useServerTable } from './AdminShared';

function GuideEditor({ initial, products, onCancel, onSave, existing }) {
  const isEdit = !!(initial && initial.id);
  const [title, setTitle] = useState(initial.title || '');
  const [tag, setTag] = useState(initial.tag || 'Fashion');
  const [excerpt, setExcerpt] = useState(initial.excerpt || '');
  const [img, setImg] = useState(initial.img || '');
  const [readTime, setReadTime] = useState(initial.read_time || '5 min');
  const [featured, setFeatured] = useState(initial.featured || false);
  const [sections, setSections] = useState(
    (initial.sections || []).map((s) => ({ title: s.title || '', product_ids: s.product_ids || [] }))
  );
  const [err, setErr] = useState('');
  const [imgBusy, bumpImgBusy] = useUploadBusy();

  const setSection = (i, patch) => { const n = [...sections]; n[i] = { ...n[i], ...patch }; setSections(n); };
  const addSection = () => setSections([...sections, { title: '', product_ids: [] }]);
  const delSection = (i) => setSections(sections.filter((_, j) => j !== i));

  const submit = () => {
    if (!title.trim()) return setErr('Title required.');
    const slug = initial.slug || admSlug(title);
    if (!isEdit && existing.includes(slug)) return setErr(`Slug "${slug}" already exists.`);
    const builtSections = sections
      .filter((s) => s.title.trim() && s.product_ids.length > 0)
      .map((s) => ({ title: s.title.trim(), product_ids: s.product_ids }));
    onSave({ slug, tag, title: title.trim(), excerpt: excerpt.trim(), img, readTime, featured, sections: builtSections }, isEdit, initial.id);
  };
  return (
    <div className="adm-form">
      <div className="adm-grid2">
        <div className="adm-field"><label>Title <span className="req">*</span></label><input className="adm-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Building a Capsule Wardrobe" /></div>
        <div className="adm-field"><label>Tag</label>
          <select className="adm-input" value={tag} onChange={(e) => setTag(e.target.value)}>{ART_TAGS.map((t) => <option key={t}>{t}</option>)}</select></div>
      </div>
      <div className="adm-field"><label>Excerpt</label><textarea className="adm-textarea" style={{ minHeight: 60 }} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Short summary shown on the guide card…" /></div>
      <ImgInput label="Guide image" value={img} onChange={setImg} onBusyChange={(b) => bumpImgBusy(b ? 1 : -1)} />
      <div className="adm-field"><label>Read time</label><input className="adm-input" value={readTime} onChange={(e) => setReadTime(e.target.value)} placeholder="e.g. 6 min" /></div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, color: 'var(--ink)', cursor: 'pointer' }}>
        <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
        Featured (shown as the large hero guide at the top of the Guides page)
      </label>

      <div className="adm-section-title">Guide page sections</div>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: -4, marginBottom: 8 }}>
        This guide works like a category page — add one or more titled sections (e.g. "Wedding Dresses", "Bridal Beauty") and attach the products that should appear under each, in the order shown.
      </p>
      {sections.map((s, i) => (
        <div key={i} style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9, padding: 12, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <input className="adm-input" style={{ flex: 1 }} value={s.title} onChange={(e) => setSection(i, { title: e.target.value })} placeholder="Section title, e.g. Wedding Dresses" />
            <button type="button" className="adm-icon danger" onClick={() => delSection(i)} aria-label="Delete section"><I.trash /></button>
          </div>
          <VideoProductPicker selectedIds={s.product_ids} onChange={(ids) => setSection(i, { product_ids: ids })} products={products || []} />
        </div>
      ))}
      <div style={{ marginTop: 4, marginBottom: 20 }}>
        <button type="button" className="adm-btn adm-btn-ghost sm" onClick={addSection}><I.plus width="12" height="12" /> Add section</button>
      </div>

      <div className="adm-form-foot">{err && <span className="err">{err}</span>}<span className="spacer"></span>
        <button type="button" className="adm-btn adm-btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="button" className="adm-btn adm-btn-primary" onClick={submit} disabled={imgBusy}><I.check /> {isEdit ? 'Save' : 'Publish'} guide</button></div>
    </div>
  );
}

export default function GuidesAdminView({ guides, productsLookup, onToast }) {
  const [editor, setEditor] = useState(null);
  const guidesLookup = useLookup('/admin/guides/lookup');
  const { server } = useServerTable('guides', 'guides');

  const del = (id) => {
    if (!confirm('Delete this guide?')) return;
    router.delete('/admin/guides/' + id, {
      preserveState: true, preserveScroll: true,
      onSuccess: () => onToast('Guide deleted.')
    });
  };

  const save = (data, isEdit, id) => {
    if (isEdit) {
      router.put('/admin/guides/' + id, data, {
        preserveState: true, preserveScroll: true,
        onSuccess: () => { setEditor(null); onToast('Guide saved.'); }
      });
    } else {
      router.post('/admin/guides', data, {
        preserveState: true, preserveScroll: true,
        onSuccess: () => { setEditor(null); onToast('Guide saved.'); }
      });
    }
  };

  const columns = [
    {
      key: 'img', label: '', sortable: false, width: 70,
      render: (g) => g.img ? <img className="adm-thumb" src={g.img} alt="" /> : <span className="adm-thumb ph"><I.image width="16" height="16" /></span>,
    },
    {
      key: 'title', label: 'Guide',
      render: (g) => (<><div className="adm-pname">{g.title}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{g.excerpt ? g.excerpt.slice(0, 60) + '…' : ''}</div></>),
    },
    { key: 'tag', label: 'Tag', render: (g) => <span className="adm-tag cat">{g.tag}</span> },
    { key: 'read_time', label: 'Read time' },
    {
      key: 'actions', label: 'Actions', align: 'right', sortable: false,
      render: (g) => (
        <div className="adm-row-actions">
          <a className="adm-icon" href={'/guide/' + g.slug} target="_blank" rel="noopener" aria-label="Preview"><I.eye /></a>
          <button className="adm-icon" onClick={() => setEditor(g)} aria-label="Edit"><I.edit /></button>
          <button className="adm-icon danger" onClick={() => del(g.id)} aria-label="Delete"><I.trash /></button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="adm-head">
        <div><h1>Buying Guides</h1><p>{guides.total} guide{guides.total === 1 ? '' : 's'} published.</p></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <BulkImportButton
            label="guides"
            headers={['slug', 'title', 'tag', 'excerpt', 'img', 'read_time', 'featured']}
            sample={{
              slug: 'capsule-wardrobe-2026', title: 'Building a Capsule Wardrobe', tag: 'Fashion',
              excerpt: 'Short summary shown on the guide card.', img: 'https://example.com/hero.jpg',
              read_time: '6 min', featured: 'FALSE',
            }}
            existing={guidesLookup}
            parseRow={(raw) => ({
              slug: raw.slug, title: raw.title, tag: raw.tag, excerpt: raw.excerpt,
              img: raw.img, readTime: raw.read_time, featured: toBool(raw.featured),
            })}
            matchExisting={(raw, data, existing) => (data.slug ? existing.find((g) => g.slug === admSlug(data.slug)) : null)}
            getId={(g) => g.id}
            summarize={(data, match) => `${data.title || '(no title)'}${match ? ' → updates “' + match.title + '”' : ''}`}
            importUrl="/admin/guides/bulk-import"
            onToast={onToast}
          />
          <button className="adm-btn adm-btn-primary" onClick={() => setEditor({})}><I.plus /> New guide</button>
        </div>
      </div>
      <div className="adm-panel">
        {guides.total === 0 ? (
          <div className="adm-empty"><I.box width="40" height="40" /><p style={{ margin: 0 }}>No guides yet.</p></div>
        ) : (
          <DataTable
            columns={columns}
            rows={guides.data}
            getRowId={(g) => g.id}
            server={server(guides)}
          />
        )}
      </div>
      {editor && (
        <div className="adm-overlay" onMouseDown={() => setEditor(null)}>
          <div className="adm-modal" style={{ width: 'min(900px,98vw)' }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="adm-modal-head"><h2>{editor.id ? 'Edit guide' : 'New guide'}</h2>
              <button className="adm-close" onClick={() => setEditor(null)}><I.close /></button></div>
            <div className="adm-modal-body">
              <GuideEditor initial={editor} products={productsLookup} onCancel={() => setEditor(null)} onSave={save} existing={guidesLookup.map((g) => g.slug)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
