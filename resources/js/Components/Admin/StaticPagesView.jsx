import { useState } from 'react';
import { router } from '@inertiajs/react';
import I from '../Icons';
import DataTable from './DataTable';
import { admSlug, useUploadBusy, ImgInput, useLookup, useServerTable } from './AdminShared';

function StaticPageEditor({ initial, onCancel, onSave, existing }) {
  const isEdit = !!(initial && initial.id);
  const [key, setKey] = useState(initial.key || '');
  const [title, setTitle] = useState(initial.title || '');
  const [eyebrow, setEyebrow] = useState(initial.eyebrow || '');
  const [headline, setHeadline] = useState(initial.headline || '');
  const [lead, setLead] = useState(initial.lead || '');
  const [heroImg, setHeroImg] = useState(initial.hero_img || '');
  const [sections, setSections] = useState(
    (initial.sections || []).map((s) => s.list
      ? { type: 'list', h: s.h || '', body: '', items: (s.list || []).join('\n') }
      : { type: 'text', h: s.h || '', body: s.body || '', items: '' })
  );
  const [note, setNote] = useState(initial.note || '');
  const [ctaText, setCtaText] = useState(initial.cta_text || '');
  const [ctaHref, setCtaHref] = useState(initial.cta_href || '');
  const [hasForm, setHasForm] = useState(initial.has_form || false);
  const [err, setErr] = useState('');
  const [imgBusy, bumpImgBusy] = useUploadBusy();

  const setSection = (i, patch) => { const n = [...sections]; n[i] = { ...n[i], ...patch }; setSections(n); };
  const addSection = (type) => setSections([...sections, { type, h: '', body: '', items: '' }]);
  const delSection = (i) => setSections(sections.filter((_, j) => j !== i));

  const submit = () => {
    if (!title.trim()) return setErr('Title required.');
    if (!headline.trim()) return setErr('Headline required.');
    const pageKey = isEdit ? initial.key : (key.trim() ? admSlug(key) : admSlug(title));
    if (!isEdit && existing.includes(pageKey)) return setErr(`Path "${pageKey}" already exists.`);
    const builtSections = sections
      .filter((s) => s.h.trim())
      .map((s) => s.type === 'list'
        ? { h: s.h.trim(), list: s.items.split('\n').map((li) => li.trim()).filter(Boolean) }
        : { h: s.h.trim(), body: s.body.trim() });
    onSave({
      key: pageKey, title: title.trim(), eyebrow: eyebrow.trim(), headline: headline.trim(),
      lead: lead.trim(), hero_img: heroImg, sections: builtSections, note: note.trim(),
      cta_text: ctaText.trim(), cta_href: ctaHref.trim(), has_form: hasForm,
    }, isEdit, initial.id);
  };

  return (
    <div className="adm-form">
      <div className="adm-grid2">
        <div className="adm-field"><label>Title <span className="req">*</span></label><input className="adm-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. About Us" /></div>
        <div className="adm-field">
          <label>Page path {!isEdit && <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional — defaults from title)</span>}</label>
          {isEdit ? (
            <input className="adm-input" value={'/page/' + key} disabled />
          ) : (
            <input className="adm-input" value={key} onChange={(e) => setKey(e.target.value)} placeholder="e.g. about" />
          )}
        </div>
      </div>
      <div className="adm-grid2">
        <div className="adm-field"><label>Eyebrow label</label><input className="adm-input" value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} placeholder="e.g. Our Story" /></div>
        <div className="adm-field"><label>Headline <span className="req">*</span></label><input className="adm-input" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Smarter Shopping Starts with Better Discovery." /></div>
      </div>
      <div className="adm-field"><label>Lead paragraph</label><textarea className="adm-textarea" style={{ minHeight: 60 }} value={lead} onChange={(e) => setLead(e.target.value)} placeholder="Short intro shown below the headline…" /></div>
      <ImgInput label="Hero image (optional)" value={heroImg} onChange={setHeroImg} onBusyChange={(b) => bumpImgBusy(b ? 1 : -1)} />

      <div className="adm-section-title">Page sections</div>
      {sections.map((s, i) => (
        <div key={i} style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9, padding: 12, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <select className="adm-select" style={{ fontSize: 12 }} value={s.type} onChange={(e) => setSection(i, { type: e.target.value })}>
              <option value="text">text</option>
              <option value="list">list</option>
            </select>
            <span style={{ flex: 1 }}></span>
            <button type="button" className="adm-icon danger" onClick={() => delSection(i)} aria-label="Delete"><I.trash /></button>
          </div>
          <input className="adm-input" style={{ marginBottom: 8 }} value={s.h} onChange={(e) => setSection(i, { h: e.target.value })} placeholder="Section heading" />
          {s.type === 'list' ? (
            <textarea className="adm-textarea" style={{ minHeight: 80 }} value={s.items} onChange={(e) => setSection(i, { items: e.target.value })} placeholder={'One list item per line…'} />
          ) : (
            <textarea className="adm-textarea" style={{ minHeight: 80 }} value={s.body} onChange={(e) => setSection(i, { body: e.target.value })} placeholder="Section paragraph…" />
          )}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4, marginBottom: 20 }}>
        <button type="button" className="adm-btn adm-btn-ghost sm" onClick={() => addSection('text')}><I.plus width="12" height="12" /> text section</button>
        <button type="button" className="adm-btn adm-btn-ghost sm" onClick={() => addSection('list')}><I.plus width="12" height="12" /> list section</button>
      </div>

      <div className="adm-field"><label>Note <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional — small callout shown below the sections)</span></label><textarea className="adm-textarea" style={{ minHeight: 50 }} value={note} onChange={(e) => setNote(e.target.value)} /></div>
      <div className="adm-grid2">
        <div className="adm-field"><label>CTA button text</label><input className="adm-input" value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="e.g. Explore Curated Finds" /></div>
        <div className="adm-field"><label>CTA button link</label><input className="adm-input" value={ctaHref} onChange={(e) => setCtaHref(e.target.value)} placeholder="/collection/new" /></div>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 14, color: 'var(--ink)', cursor: 'pointer' }}>
        <input type="checkbox" checked={hasForm} onChange={(e) => setHasForm(e.target.checked)} />
        Show the contact form at the bottom of this page
      </label>

      <div className="adm-form-foot">{err && <span className="err">{err}</span>}<span className="spacer"></span>
        <button type="button" className="adm-btn adm-btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="button" className="adm-btn adm-btn-primary" onClick={submit} disabled={imgBusy}><I.check /> {isEdit ? 'Save' : 'Publish'} page</button></div>
    </div>
  );
}

export default function StaticPagesAdminView({ staticPages, onToast }) {
  const [editor, setEditor] = useState(null);
  const staticPagesLookup = useLookup('/admin/static-pages/lookup');
  const { server } = useServerTable('static_pages', 'staticPages');

  const del = (id) => {
    if (!confirm('Delete this page? Any links pointing to it will 404.')) return;
    router.delete('/admin/static-pages/' + id, {
      only: ['staticPages'], preserveState: true, preserveScroll: true,
      onSuccess: () => onToast('Page deleted.')
    });
  };

  const save = (data, isEdit, id) => {
    if (isEdit) {
      router.put('/admin/static-pages/' + id, data, {
        only: ['staticPages'], preserveState: true, preserveScroll: true,
        onSuccess: () => { setEditor(null); onToast('Page saved.'); }
      });
    } else {
      router.post('/admin/static-pages', data, {
        only: ['staticPages'], preserveState: true, preserveScroll: true,
        onSuccess: () => { setEditor(null); onToast('Page saved.'); }
      });
    }
  };

  const columns = [
    {
      key: 'hero_img', label: '', sortable: false, width: 70,
      render: (p) => p.hero_img ? <img className="adm-thumb" src={p.hero_img} alt="" /> : <span className="adm-thumb ph"><I.image width="16" height="16" /></span>,
    },
    {
      key: 'title', label: 'Page',
      render: (p) => (<><div className="adm-pname">{p.title}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.headline}</div></>),
    },
    { key: 'key', label: 'Path', render: (p) => <span style={{ fontSize: 12, color: 'var(--muted)' }}>/page/{p.key}</span> },
    {
      key: 'actions', label: 'Actions', align: 'right', sortable: false,
      render: (p) => (
        <div className="adm-row-actions">
          <a className="adm-icon" href={'/page/' + p.key} target="_blank" rel="noopener" aria-label="Preview"><I.eye /></a>
          <button className="adm-icon" onClick={() => setEditor(p)} aria-label="Edit"><I.edit /></button>
          <button className="adm-icon danger" onClick={() => del(p.id)} aria-label="Delete"><I.trash /></button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="adm-head"><div><h1>Site Pages</h1><p>Edit the content of About, Careers, Contact, Privacy and other static pages — reachable at /page/&#123;key&#125;.</p></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="adm-btn adm-btn-primary" onClick={() => setEditor({})}><I.plus /> New page</button>
        </div></div>
      <div className="adm-panel">
        {staticPages.total === 0 ? (
          <div className="adm-empty"><I.box width="40" height="40" /><p style={{ margin: 0 }}>No pages yet.</p></div>
        ) : (
          <DataTable columns={columns} rows={staticPages.data} getRowId={(p) => p.id} server={server(staticPages)} />
        )}
      </div>
      {editor && (
        <div className="adm-overlay" onMouseDown={() => setEditor(null)}>
          <div className="adm-modal" style={{ width: 'min(900px,98vw)' }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="adm-modal-head"><h2>{editor.id ? 'Edit page' : 'New page'}</h2>
              <button className="adm-close" onClick={() => setEditor(null)}><I.close /></button></div>
            <div className="adm-modal-body">
              <StaticPageEditor initial={editor} onCancel={() => setEditor(null)} onSave={save} existing={staticPagesLookup.map((p) => p.key)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
