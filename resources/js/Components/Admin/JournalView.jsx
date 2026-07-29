import { useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import I from '../Icons';
import { ART_TAGS, ART_CATS } from '../../constants';
import DataTable from './DataTable';
import { admSlug, useUploadBusy, ImgInput, BulkImportButton, VideoProductPicker, toBool, useLookup, useServerTable } from './AdminShared';

// Textarea with an "Insert link" helper that wraps the selection (or prompts for
// link text) into `[label](url)` markup, rendered as a real <a> on the article page.
function LinkableTextarea({ value, onChange, placeholder, minHeight }) {
  const ref = useRef(null);

  const insertLink = () => {
    const el = ref.current;
    const start = el ? el.selectionStart : value.length;
    const end = el ? el.selectionEnd : value.length;
    const selected = value.slice(start, end);

    const url = window.prompt('Link URL (https://…)');
    if (!url) return;
    const trimmedUrl = url.trim();
    if (!/^https?:\/\//i.test(trimmedUrl)) return alert('Please enter a full http:// or https:// URL.');

    const label = selected || window.prompt('Link text to display', '') || trimmedUrl;
    const markup = `[${label}](${trimmedUrl})`;
    const next = value.slice(0, start) + markup + value.slice(end);
    onChange(next);

    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const pos = start + markup.length;
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <div>
      <textarea ref={ref} className="adm-textarea" style={{ minHeight }} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} />
      <button type="button" className="adm-btn adm-btn-ghost sm" style={{ marginTop: 6 }} onClick={insertLink}>
        <I.link width="12" height="12" /> Insert link
      </button>
    </div>
  );
}

function ArticleEditor({ initial, products, onCancel, onSave, existing }) {
  const isEdit = !!(initial && initial.id);
  const [title, setTitle] = useState(initial.title || '');
  const [tag, setTag] = useState(initial.tag || 'Fashion');
  const [category, setCategory] = useState(initial.category || 'Women');
  const [excerpt, setExcerpt] = useState(initial.excerpt || '');
  const [img, setImg] = useState(initial.img || '');
  const today = new Date();
  const defaultDate = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const [date, setDate] = useState(initial.date || defaultDate);
  const [author, setAuthor] = useState(initial.author || 'Limitra Editors');
  const [readTime, setReadTime] = useState(initial.read_time || '5 min');
  const [body, setBody] = useState(initial.body || [{ type: 'lead', text: '' }]);
  const [err, setErr] = useState('');
  const [imgBusy, bumpImgBusy] = useUploadBusy();

  const BTYPES = ['lead', 'text', 'heading', 'pullquote', 'products'];
  const setBlock = (i, patch) => { const n = [...body]; n[i] = { ...n[i], ...patch }; setBody(n); };
  const addBlock = (type) => setBody([...body, type === 'products' ? { type, ids: [], label: '' } : { type, text: '' }]);
  const delBlock = (i) => setBody(body.filter((_, j) => j !== i));

  const submit = () => {
    if (!title.trim()) return setErr('Title required.');
    const slug = initial.slug || admSlug(title);
    if (!isEdit && existing.includes(slug)) return setErr(`Slug "${slug}" already exists.`);
    onSave({ slug, tag, category, title: title.trim(), excerpt: excerpt.trim(), img, date, author, readTime, body, featured: initial.featured || false }, isEdit, initial.id);
  };

  return (
    <div className="adm-form">
      <div className="adm-grid2">
        <div className="adm-field"><label>Title <span className="req">*</span></label><input className="adm-input" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="adm-field"><label>Tag</label>
          <select className="adm-input" value={tag} onChange={(e) => setTag(e.target.value)}>{ART_TAGS.map((t) => <option key={t}>{t}</option>)}</select></div>
        <div className="adm-field"><label>Category</label>
          <select className="adm-input" value={category} onChange={(e) => setCategory(e.target.value)}>{ART_CATS.map((c) => <option key={c}>{c}</option>)}</select></div>
      </div>
      <div className="adm-field"><label>Excerpt</label><textarea className="adm-textarea" style={{ minHeight: 60 }} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Short summary shown on homepage and guide cards." /></div>
      <ImgInput label="Hero image (wide landscape)" value={img} onChange={setImg} onBusyChange={(b) => bumpImgBusy(b ? 1 : -1)} />
      <div className="adm-grid3">
        <div className="adm-field"><label>Date</label><input className="adm-input" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div className="adm-field"><label>Author</label><input className="adm-input" value={author} onChange={(e) => setAuthor(e.target.value)} /></div>
        <div className="adm-field"><label>Read time</label><input className="adm-input" value={readTime} onChange={(e) => setReadTime(e.target.value)} placeholder="e.g. 7 min" /></div>
      </div>
      <div className="adm-section-title">Article body</div>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: -4, marginBottom: 8 }}>
        Add a "products" block and search to attach items — no need to know IDs. Select text in any other block and click "Insert link" to hyperlink it.
      </p>
      {body.map((block, i) => (
        <div key={i} style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 9, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <select className="adm-select" style={{ fontSize: 12 }} value={block.type} onChange={(e) => setBlock(i, { type: e.target.value, text: block.text || '', ids: block.ids || [], label: block.label || '' })}>
              {BTYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <span style={{ flex: 1 }}></span>
            <button type="button" className="adm-icon danger" onClick={() => delBlock(i)} aria-label="Delete"><I.trash /></button>
          </div>
          {block.type === 'products' ? (
            <>
              <input className="adm-input" placeholder="Section label (e.g. Shop the story)" value={block.label || ''} onChange={(e) => setBlock(i, { label: e.target.value })} style={{ marginBottom: 8 }} />
              <VideoProductPicker selectedIds={block.ids || []} onChange={(ids) => setBlock(i, { ids })} products={products || []} />
            </>
          ) : (
            <LinkableTextarea
              value={block.text || ''}
              onChange={(text) => setBlock(i, { text })}
              minHeight={block.type === 'lead' ? 80 : 56}
              placeholder={block.type === 'heading' ? 'Section heading' : block.type === 'pullquote' ? 'Quote text' : 'Write content… select text and click "Insert link" to link it'}
            />
          )}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
        {BTYPES.map((t) => <button key={t} type="button" className="adm-btn adm-btn-ghost sm" onClick={() => addBlock(t)}><I.plus width="12" height="12" /> {t}</button>)}
      </div>
      <div className="adm-form-foot">{err && <span className="err">{err}</span>}<span className="spacer"></span>
        <button type="button" className="adm-btn adm-btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="button" className="adm-btn adm-btn-primary" onClick={submit} disabled={imgBusy}><I.check /> {isEdit ? 'Save article' : 'Publish article'}</button></div>
    </div>
  );
}

export default function JournalView({ articles, productsLookup, onToast }) {
  const [editor, setEditor] = useState(null);
  const articlesLookup = useLookup('/admin/articles/lookup');
  const { server } = useServerTable('articles', 'articles');

  const del = (id) => {
    if (!confirm('Delete this article?')) return;
    router.delete('/admin/articles/' + id, {
      preserveState: true, preserveScroll: true,
      onSuccess: () => onToast('Article deleted.')
    });
  };

  const save = (data, isEdit, id) => {
    if (isEdit) {
      router.put('/admin/articles/' + id, data, {
        preserveState: true, preserveScroll: true,
        onSuccess: () => { setEditor(null); onToast('Article saved.'); }
      });
    } else {
      router.post('/admin/articles', data, {
        preserveState: true, preserveScroll: true,
        onSuccess: () => { setEditor(null); onToast('Article saved.'); }
      });
    }
  };

  const columns = [
    {
      key: 'img', label: '', sortable: false, width: 70,
      render: (a) => a.img ? <img className="adm-thumb" src={a.img} alt="" /> : <span className="adm-thumb ph"><I.image width="16" height="16" /></span>,
    },
    {
      key: 'title', label: 'Article',
      render: (a) => (<><div className="adm-pname">{a.title}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{a.excerpt ? a.excerpt.slice(0, 60) + '…' : ''}</div></>),
    },
    { key: 'tag', label: 'Tag', render: (a) => <span className="adm-tag cat">{a.tag}</span> },
    { key: 'date', label: 'Date', render: (a) => <span style={{ fontSize: 12, color: 'var(--muted)' }}>{a.date}</span> },
    {
      key: 'actions', label: 'Actions', align: 'right', sortable: false,
      render: (a) => (
        <div className="adm-row-actions">
          <a className="adm-icon" href={'/article/' + a.slug} target="_blank" rel="noopener" aria-label="Preview"><I.eye /></a>
          <button className="adm-icon" onClick={() => setEditor(a)} aria-label="Edit"><I.edit /></button>
          <button className="adm-icon danger" onClick={() => del(a.id)} aria-label="Delete"><I.trash /></button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="adm-head"><div><h1>Limitra Journal</h1><p>{articles.total} article{articles.total === 1 ? '' : 's'} published.</p></div></div>
      <div className="adm-panel">
        <DataTable
          columns={columns}
          rows={articles.data}
          getRowId={(a) => a.id}
          server={server(articles)}
          toolbar={
            <>
              <span className="dtbl-toolbar-spacer"></span>
              <BulkImportButton
                label="articles"
                headers={['slug', 'title', 'tag', 'category', 'excerpt', 'img', 'date', 'author', 'read_time', 'featured']}
                sample={{
                  slug: 'the-bag-youll-carry-forever', title: "The Bag You'll Carry Forever", tag: 'Fashion', category: 'Women',
                  excerpt: 'Short summary shown on homepage and guide cards.', img: 'https://example.com/hero.jpg',
                  date: 'July 3, 2026', author: 'Limitra Editors', read_time: '5 min', featured: 'FALSE',
                }}
                existing={articlesLookup}
                parseRow={(raw) => ({
                  slug: raw.slug, title: raw.title, tag: raw.tag, category: raw.category, excerpt: raw.excerpt,
                  img: raw.img, date: raw.date, author: raw.author, readTime: raw.read_time, featured: toBool(raw.featured),
                })}
                matchExisting={(raw, data, existing) => (data.slug ? existing.find((a) => a.slug === admSlug(data.slug)) : null)}
                getId={(a) => a.id}
                summarize={(data, match) => `${data.title || '(no title)'}${match ? ' → updates “' + match.title + '”' : ''}`}
                importUrl="/admin/articles/bulk-import"
                onToast={onToast}
              />
              <button className="adm-btn adm-btn-primary" onClick={() => setEditor({})}><I.plus /> New article</button>
            </>
          }
        />
      </div>
      {editor && (
        <div className="adm-overlay" onMouseDown={() => setEditor(null)}>
          <div className="adm-modal" style={{ width: 'min(900px,98vw)' }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="adm-modal-head"><h2>{editor.id ? 'Edit article' : 'New article'}</h2>
              <button className="adm-close" onClick={() => setEditor(null)}><I.close /></button></div>
            <div className="adm-modal-body">
              <ArticleEditor initial={editor} products={productsLookup} onCancel={() => setEditor(null)} onSave={save} existing={articlesLookup.map((a) => a.slug)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
