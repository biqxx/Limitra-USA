import { useState, useEffect, useMemo, useRef } from 'react';
import { usePage, router, useForm } from '@inertiajs/react';
import I from '../../Components/Icons';
import Seo from '../../Components/Seo';
import { TAG_OPTS, ART_TAGS, ART_CATS, BADGES } from '../../constants';

// ── Image helpers ────────────────────────────────────────────────────────────

class SessionExpiredError extends Error {}

async function uploadImageFile(file) {
  const data = new FormData();
  data.append('image', file);
  const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
  const res = await fetch('/admin/images/upload', {
    method: 'POST',
    headers: { 'X-CSRF-TOKEN': token, 'Accept': 'application/json' },
    body: data,
  });
  if (res.status === 419) throw new SessionExpiredError('Session expired');
  if (!res.ok) throw new Error('Upload failed');
  return (await res.json()).url;
}

function uploadErrorMessage(err) {
  return err instanceof SessionExpiredError
    ? 'Your session has expired — please reload the page and try again.'
    : 'Upload failed — try again.';
}

function UploadErrorNote({ error }) {
  if (!error) return null;
  return (
    <span style={{ color: 'var(--error, #c00)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
      {uploadErrorMessage(error)}
      {error instanceof SessionExpiredError && (
        <button type="button" onClick={() => window.location.reload()} style={{ color: 'var(--error, #c00)', textDecoration: 'underline', background: 'none', border: 'none', padding: 0, font: 'inherit', cursor: 'pointer' }}>
          Reload now
        </button>
      )}
    </span>
  );
}

function admSlug(s) {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Tracks how many concurrent uploads are in flight so a parent editor can
// disable its Save button until every image has finished processing.
function useUploadBusy() {
  const [count, setCount] = useState(0);
  const bump = (delta) => setCount((n) => Math.max(0, n + delta));
  return [count > 0, bump];
}

// ── Shared image inputs ───────────────────────────────────────────────────────

function ImgInput({ value, onChange, label, onBusyChange }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const pick = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setBusy(true); setUploadError(null); onBusyChange?.(true);
    try { onChange(await uploadImageFile(f)); } catch (err) { setUploadError(err); }
    setBusy(false); onBusyChange?.(false);
    e.target.value = '';
  };
  return (
    <div className="adm-field">
      {label && <label>{label}</label>}
      <div className="adm-img">
        <div className="adm-img-prev" style={{ width: 80, height: 80 }}>
          {value ? <img src={value} alt="" /> : <I.image />}
        </div>
        <div className="adm-img-controls">
          <input ref={ref} type="file" accept="image/*" style={{ display: 'none' }} onChange={pick} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="adm-btn adm-btn-ghost sm" onClick={() => ref.current.click()} disabled={busy}>
              <I.upload /> {busy ? 'Processing…' : 'Upload'}
            </button>
            {value && <button type="button" className="adm-btn adm-btn-ghost sm" onClick={() => onChange('')}>Remove</button>}
          </div>
          <UploadErrorNote error={uploadError} />
          <input
            className="adm-input"
            placeholder="…or paste URL"
            value={value && value.startsWith('data:') ? '' : (value || '')}
            onChange={(e) => onChange(e.target.value)}
            style={{ fontSize: 13 }}
          />
        </div>
      </div>
    </div>
  );
}

function GalleryInput({ items, onChange, onBusyChange }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const addFiles = async (e) => {
    const files = [...(e.target.files || [])];
    if (!files.length) return;
    setBusy(true); setUploadError(null); onBusyChange?.(true);
    const urls = [];
    for (const f of files) {
      try { urls.push(await uploadImageFile(f)); } catch (err) { setUploadError(err); if (err instanceof SessionExpiredError) break; }
    }
    onChange([...items, ...urls]);
    setBusy(false); onBusyChange?.(false);
    e.target.value = '';
  };
  return (
    <div>
      <div className="adm-gallery-grid">
        {items.map((g, i) => (
          <div className="adm-gthumb" key={i}>
            <img src={g} alt="" />
            <button type="button" className="x" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove">
              <I.close width="13" height="13" />
            </button>
          </div>
        ))}
        <button type="button" className="adm-gadd" onClick={() => fileRef.current.click()} disabled={busy}>
          <I.plus /> {busy ? 'Processing…' : 'Add'}
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={addFiles} />
        </button>
      </div>
      <div style={{ marginTop: 6 }}><UploadErrorNote error={uploadError} /></div>
    </div>
  );
}

// ── Bulk CSV import ────────────────────────────────────────────────────────────

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { pushField(); rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const c = text[i], next = text[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else if (c === '"') { inQuotes = true; }
    else if (c === ',') { pushField(); }
    else if (c === '\r') { /* skip — \n follows */ }
    else if (c === '\n') { pushRow(); }
    else { field += c; }
  }
  if (field.length || row.length) pushRow();
  while (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') rows.pop();
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1)
    .filter((r) => r.some((c) => c.trim() !== ''))
    .map((r) => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = (r[i] ?? '').trim(); });
      return obj;
    });
}

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function downloadCSV(filename, headers, rows) {
  const lines = [headers.join(','), ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function splitList(s) {
  return String(s || '').split('|').map((x) => x.trim()).filter(Boolean);
}

function toBool(s) {
  return ['true', '1', 'yes', 'y'].includes(String(s || '').trim().toLowerCase());
}

async function postJSON(url, body) {
  const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token, 'Accept': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 419) throw new SessionExpiredError('Session expired');
  if (!res.ok) throw new Error('Import failed');
  return res.json();
}

function bulkResultMessage(batch) {
  const parts = [];
  if (batch.created_count) parts.push(`${batch.created_count} created`);
  if (batch.updated_count) parts.push(`${batch.updated_count} updated`);
  if (batch.skipped_count) parts.push(`${batch.skipped_count} skipped`);
  let msg = (parts.length ? parts.join(', ') : 'Nothing imported') + '.';
  const errCount = (batch.errors || []).length;
  if (errCount) msg += ` ${errCount} row${errCount === 1 ? '' : 's'} failed.`;
  return msg;
}

// A generic bulk-CSV importer: parses the file, matches each row against existing
// items, and lets the admin resolve every match as Update or Skip before anything
// is sent to the server. `existing` items with `decision: 'skip'` are left alone —
// nothing is ever deleted by an import.
function BulkImportButton({ label, headers, sample, existing, parseRow, matchExisting, getId, summarize, importUrl, onToast }) {
  const fileRef = useRef(null);
  const [rows, setRows] = useState(null);
  const [fileName, setFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const onFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      if (!parsed.length) { setError('That CSV has no data rows.'); return; }
      setFileName(file.name);
      setRows(parsed.map((raw, i) => {
        const data = parseRow(raw);
        const match = matchExisting(raw, data, existing) || null;
        return { i, raw, data, match, decision: match ? 'skip' : 'create' };
      }));
    } catch (err) {
      setError('Could not read that file — make sure it’s a valid CSV.');
    }
  };

  const setDecision = (i, decision) => setRows((rs) => rs.map((r) => (r.i === i ? { ...r, decision } : r)));

  const submit = async () => {
    setSubmitting(true); setError(null);
    const items = rows
      .filter((r) => r.decision !== 'skip')
      .map((r) => ({ action: r.decision, id: r.match ? getId(r.match) : null, data: r.data }));
    try {
      await postJSON(importUrl, { items, filename: fileName });
      setSubmitting(false);
      setRows(null);
      onToast(`Queued ${items.length} ${label} for import — check Bulk Uploads for progress.`);
      router.reload({ only: ['bulkImports'] });
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof SessionExpiredError
        ? 'Your session has expired — please reload the page and try again.'
        : 'Import failed — try again.');
    }
  };

  const counts = rows ? {
    create: rows.filter((r) => r.decision === 'create').length,
    update: rows.filter((r) => r.decision === 'update').length,
    skip: rows.filter((r) => r.decision === 'skip').length,
  } : null;

  return (
    <>
      <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={onFile} />
      <button type="button" className="adm-btn adm-btn-ghost" onClick={() => fileRef.current.click()}>
        <I.upload /> Bulk import CSV
      </button>
      <button type="button" className="adm-btn adm-btn-ghost" onClick={() => downloadCSV(`${label}-template.csv`, headers, [sample])}>
        Template
      </button>
      {error && !rows && <span style={{ color: 'var(--error, #c00)', fontSize: 12, marginLeft: 4, alignSelf: 'center' }}>{error}</span>}

      {rows && (
        <div className="adm-overlay" onMouseDown={() => !submitting && setRows(null)}>
          <div className="adm-modal" style={{ width: 'min(900px,98vw)' }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="adm-modal-head">
              <h2>Bulk import — {label}</h2>
              <button className="adm-close" onClick={() => setRows(null)} disabled={submitting}><I.close /></button>
            </div>
            <div className="adm-modal-body">
              <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 0 }}>
                {rows.length} row{rows.length === 1 ? '' : 's'} found. Rows that matched an existing item default to <strong>Skip</strong> — set them to <strong>Update existing</strong> to overwrite that item. Nothing is deleted by an import.
              </p>
              <div style={{ maxHeight: 380, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 8 }}>
                <table className="adm-table">
                  <thead><tr><th>#</th><th>Item</th><th>Status</th><th>Action</th></tr></thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.i}>
                        <td>{r.i + 1}</td>
                        <td>{summarize(r.data, r.match)}</td>
                        <td>
                          {r.match
                            ? <span className="adm-tag cat">Matches existing</span>
                            : <span className="adm-tag yours">New</span>}
                        </td>
                        <td>
                          <select className="adm-select" style={{ fontSize: 12.5 }} value={r.decision} onChange={(e) => setDecision(r.i, e.target.value)}>
                            {r.match
                              ? [<option key="skip" value="skip">Skip</option>, <option key="update" value="update">Update existing</option>]
                              : [<option key="create" value="create">Create</option>, <option key="skip" value="skip">Skip</option>]}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {error && <div style={{ color: 'var(--error, #c00)', fontSize: 13, marginTop: 10 }}>{error}</div>}
            </div>
            <div className="adm-form-foot">
              <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{counts.create} to create · {counts.update} to update · {counts.skip} skipped</span>
              <span className="spacer"></span>
              <button type="button" className="adm-btn adm-btn-ghost" onClick={() => setRows(null)} disabled={submitting}>Cancel</button>
              <button type="button" className="adm-btn adm-btn-primary" onClick={submit} disabled={submitting || (counts.create === 0 && counts.update === 0)}>
                <I.check /> {submitting ? 'Importing…' : `Import ${counts.create + counts.update} item${counts.create + counts.update === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Repeater / Specs ─────────────────────────────────────────────────────────

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

// ── Star picker ───────────────────────────────────────────────────────────────

function StarPick({ value, onChange }) {
  const [h, setH] = useState(0);
  return (
    <div className="adm-stars" onMouseLeave={() => setH(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button type="button" key={n} className={(h || value) >= n ? 'on' : ''} onMouseEnter={() => setH(n)} onClick={() => onChange(n)}>
          <I.star width="22" height="22" />
        </button>
      ))}
    </div>
  );
}

// ── Product editor ────────────────────────────────────────────────────────────


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
    gallery: start.gallery || [],
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
      gallery: f.gallery.filter(Boolean),
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
      <div className="adm-field">
        <label>Gallery (detail-page thumbnails)</label>
        <GalleryInput items={f.gallery} onChange={(v) => set('gallery', v)} onBusyChange={(b) => bumpImgBusy(b ? 1 : -1)} />
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

// ── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard({ products, settings, onAdd, onGo }) {
  const stats = [
    { ic: 'box', num: products.length, lab: 'Total products' },
    { ic: 'sparkle', num: products.filter((p) => p.is_featured).length, lab: 'Featured products' },
    { ic: 'star2', num: products.filter((p) => p.is_resort).length, lab: 'Resort picks' },
    { ic: 'grid', num: products.filter((p) => p.affiliateUrl).length, lab: 'Products linked' },
  ];
  const recent = [...products].slice(-5).reverse();
  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Dashboard</h1>
          <p>Manage your affiliate catalog — products, categories, and homepage content.</p>
        </div>
        <button className="adm-btn adm-btn-primary" onClick={onAdd}><I.plus /> Add product</button>
      </div>
      <div className="adm-stats">
        {stats.map((s) => {
          const Icon = I[s.ic];
          return (
            <div className="adm-stat" key={s.lab}>
              <div className="ic"><Icon /></div>
              <div className="num">{s.num}</div>
              <div className="lab">{s.lab}</div>
            </div>
          );
        })}
      </div>
      <div className="adm-panel">
        <h2>Recently added</h2>
        <p className="sub">The latest products in your catalog.</p>
        {recent.length === 0 ? (
          <div className="adm-empty" style={{ padding: '40px 20px' }}>
            <I.box width="42" height="42" />
            <h3>No products yet</h3>
            <p>Add your first affiliate product to see it live on the storefront.</p>
            <button className="adm-btn adm-btn-primary" onClick={onAdd}><I.plus /> Add your first product</button>
          </div>
        ) : (
          <table className="adm-table">
            <tbody>
              {recent.map((p) => (
                <tr key={p.id}>
                  <td style={{ width: 60 }}>{p.image ? <img className="adm-thumb" src={p.image} alt="" /> : <span className="adm-thumb ph"><I.image width="16" height="16" /></span>}</td>
                  <td><div className="adm-pbrand">{p.brand}</div><div className="adm-pname">{p.name}</div></td>
                  <td><span className="adm-tag cat">{p.category}</span></td>
                  <td style={{ fontFamily: 'var(--font-display,serif)', color: 'var(--brand)', fontSize: 16 }}>{p.price}</td>
                  <td className="adm-row-actions"><button className="adm-icon" onClick={() => onGo('products')} aria-label="Manage"><I.edit /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

// ── Products list ─────────────────────────────────────────────────────────────

function ProductsView({ products, categories, onAdd, onEdit, onDelete, onToast }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const cats = ['All', ...categories.map((c) => c.name)];
  const filtered = products.filter((p) => {
    if (cat !== 'All' && p.category !== cat) return false;
    const s = (q || '').toLowerCase();
    return !s || `${p.name} ${p.brand} ${p.subcategory}`.toLowerCase().includes(s);
  }).slice().reverse();

  return (
    <>
      <div className="adm-head">
        <div>
          <h1>Products</h1>
          <p>{products.length} product{products.length === 1 ? '' : 's'} in your affiliate catalog.</p>
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
            existing={products}
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
          <button className="adm-btn adm-btn-primary" onClick={onAdd}><I.plus /> Add product</button>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="adm-panel">
          <div className="adm-empty">
            <I.box width="48" height="48" />
            <h3>Your catalog is empty</h3>
            <p>Add a product with its affiliate link, images and description.</p>
            <button className="adm-btn adm-btn-primary" onClick={onAdd}><I.plus /> Add your first product</button>
          </div>
        </div>
      ) : (
        <div className="adm-panel">
          <div className="adm-toolbar">
            <div className="adm-search"><I.search /><input placeholder="Search your products…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            <select className="adm-select" value={cat} onChange={(e) => setCat(e.target.value)}>
              {cats.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <table className="adm-table">
            <thead>
              <tr><th></th><th>Product</th><th>Category</th><th>Price</th><th>Affiliate link</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td style={{ width: 60 }}>{p.image ? <img className="adm-thumb" src={p.image} alt="" /> : <span className="adm-thumb ph"><I.image width="16" height="16" /></span>}</td>
                  <td>
                    <div className="adm-pbrand">{p.brand}</div>
                    <div className="adm-pname">{p.name}</div>
                    {p.is_featured && <span className="adm-tag yours" style={{ marginRight: 4 }}>Featured</span>}
                    {p.is_resort && <span className="adm-tag cat">Resort</span>}
                  </td>
                  <td><span className="adm-tag cat">{p.category}</span><div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{p.subcategory}</div></td>
                  <td style={{ fontFamily: 'var(--font-display,serif)', color: 'var(--brand)', fontSize: 16 }}>{p.price}</td>
                  <td>{p.affiliateUrl ? <span className="adm-link-ok"><I.check width="13" height="13" /> Linked</span> : <span className="adm-link-no">— none —</span>}</td>
                  <td className="adm-row-actions">
                    <a className="adm-icon" href={'/product/' + (p.slug || p.id)} target="_blank" rel="noopener" aria-label="View on storefront"><I.eye /></a>
                    <button className="adm-icon" onClick={() => onEdit(p)} aria-label="Edit"><I.edit /></button>
                    <button className="adm-icon danger" onClick={() => onDelete(p)} aria-label="Delete"><I.trash /></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>No products match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ── Categories ────────────────────────────────────────────────────────────────

function CategoriesView({ categories, onToast }) {
  const [active, setActive] = useState(null);

  return (
    <>
      <div className="adm-head"><div><h1>Categories</h1><p>Edit images and subcategories for each storefront category.</p></div></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        {categories.map((c) => (
          <div key={c.name} className="adm-panel" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--brand)', fontFamily: 'var(--font-display)', fontSize: 18 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.subs.length} subcategories</div>
              </div>
              <button className="adm-btn adm-btn-ghost sm" onClick={() => setActive(active === c.name ? null : c.name)}>
                {active === c.name ? 'Close' : 'Edit'} <I.edit />
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {[['Homepage tile', c.img], ['Feature 1', c.featureImg], ['Feature 2', c.featureImg2], ['Banner', c.bannerImg]].map(([lab, src]) => (
                <div key={lab} style={{ textAlign: 'center' }}>
                  <div style={{ width: 52, height: 52, borderRadius: 7, overflow: 'hidden', background: 'var(--card)', border: '1px solid var(--line)' }}>
                    {src && <img src={src} alt={lab} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 3 }}>{lab}</div>
                </div>
              ))}
            </div>
            {active === c.name && (
              <CatEditor cat={c} onSave={(patch) => {
                router.put('/admin/categories/' + c.id, patch, {
                  preserveState: true, preserveScroll: true,
                  onSuccess: () => { setActive(null); onToast('Category updated.'); }
                });
              }} />
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function CatEditor({ cat, onSave }) {
  const [img, setImg] = useState(cat.img || '');
  const [fi1, setFi1] = useState(cat.featureImg || '');
  const [fi2, setFi2] = useState(cat.featureImg2 || '');
  const [ban, setBan] = useState(cat.bannerImg || '');
  const [subs, setSubs] = useState(cat.subs || []);
  const [newSub, setNewSub] = useState('');
  const [imgBusy, bumpImgBusy] = useUploadBusy();
  const addSub = () => { if (newSub.trim()) { setSubs([...subs, newSub.trim()]); setNewSub(''); } };
  const remSub = (i) => setSubs(subs.filter((_, j) => j !== i));
  const moveSub = (i, d) => { const n = [...subs]; [n[i], n[i + d]] = [n[i + d], n[i]]; setSubs(n); };
  return (
    <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <ImgInput label="Homepage tile image" value={img} onChange={setImg} onBusyChange={(b) => bumpImgBusy(b ? 1 : -1)} />
      <ImgInput label="Feature image 1 (mega-menu left)" value={fi1} onChange={setFi1} onBusyChange={(b) => bumpImgBusy(b ? 1 : -1)} />
      <ImgInput label="Feature image 2 (mega-menu right)" value={fi2} onChange={setFi2} onBusyChange={(b) => bumpImgBusy(b ? 1 : -1)} />
      <ImgInput label="Category hero / banner (wide)" value={ban} onChange={setBan} onBusyChange={(b) => bumpImgBusy(b ? 1 : -1)} />
      <div className="adm-field">
        <label>Subcategories</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {subs.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ flex: 1, fontSize: 14, color: 'var(--ink)' }}>{s}</span>
              <button type="button" className="adm-icon" onClick={() => moveSub(i, -1)} disabled={i === 0} aria-label="Up"><I.back style={{ transform: 'rotate(90deg)' }} /></button>
              <button type="button" className="adm-icon" onClick={() => moveSub(i, 1)} disabled={i === subs.length - 1} aria-label="Down"><I.back style={{ transform: 'rotate(-90deg)' }} /></button>
              <button type="button" className="adm-icon danger" onClick={() => remSub(i)} aria-label="Remove"><I.trash /></button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <input className="adm-input" value={newSub} onChange={(e) => setNewSub(e.target.value)} placeholder="New subcategory name" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSub(); } }} />
            <button type="button" className="adm-btn adm-btn-ghost sm" onClick={addSub}><I.plus /> Add</button>
          </div>
        </div>
      </div>
      <button type="button" className="adm-btn adm-btn-primary" onClick={() => onSave({ img, featureImg: fi1, featureImg2: fi2, bannerImg: ban, subs })} disabled={imgBusy}>
        <I.check /> Save category
      </button>
    </div>
  );
}

// ── Grid builder for Looks ────────────────────────────────────────────────────

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

// ── Looks ─────────────────────────────────────────────────────────────────────

function LooksView({ looks, products, onToast }) {
  const [editor, setEditor] = useState(null);

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
            existing={looks}
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
      {looks.length === 0 ? (
        <div className="adm-panel"><div className="adm-empty"><I.image width="42" height="42" /><h3>No looks yet</h3><p>Create your first curated outfit look.</p>
          <button className="adm-btn adm-btn-primary" onClick={() => setEditor({})}><I.plus /> Create a look</button></div></div>
      ) : (
        <div className="adm-panel">
          <table className="adm-table">
            <thead><tr><th></th><th>Event</th><th>Grid items</th><th>Tags</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>{looks.map((l) => (
              <tr key={l.id}>
                <td style={{ width: 60 }}>{l.hero_img ? <img className="adm-thumb" src={l.hero_img} alt="" /> : <span className="adm-thumb ph"><I.image width="16" height="16" /></span>}</td>
                <td><div className="adm-pname">{l.event}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{l.slug}</div></td>
                <td><span className="adm-tag yours">{(l.grid_items || []).length} items</span></td>
                <td style={{ fontSize: 12, color: 'var(--muted)' }}>{(l.tags || []).join(' · ')}</td>
                <td className="adm-row-actions">
                  <a className="adm-icon" href={'/look/' + l.slug} target="_blank" rel="noopener" aria-label="Preview"><I.eye /></a>
                  <button className="adm-icon" onClick={() => setEditor(l)} aria-label="Edit"><I.edit /></button>
                  <button className="adm-icon danger" onClick={() => del(l.id)} aria-label="Delete"><I.trash /></button>
                </td>
              </tr>
            ))}</tbody>
          </table>
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
              <LookEditor initial={editor} products={products} onCancel={() => setEditor(null)} onSave={save} existingIds={looks.map((l) => l.slug)} />
            </div>
          </div>
        </div>
      )}
    </>
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

// ── Videos ────────────────────────────────────────────────────────────────────

function VideoProductPicker({ selectedIds, onChange, products }) {
  const [q, setQ] = useState('');
  const selected = products.filter((p) => selectedIds.includes(p.id));
  const available = products.filter(
    (p) => !selectedIds.includes(p.id) &&
      (!q || `${p.name} ${p.brand}`.toLowerCase().includes(q.toLowerCase()))
  );
  const add = (id) => onChange([...selectedIds, id]);
  const remove = (id) => onChange(selectedIds.filter((x) => x !== id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {selected.map((p) => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'var(--card)', border: '1px solid var(--line)',
              borderRadius: 8, padding: '5px 8px 5px 6px',
            }}>
              {p.image
                ? <img src={p.image} alt="" style={{ width: 32, height: 32, borderRadius: 5, objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 32, height: 32, borderRadius: 5, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><I.image style={{ color: 'var(--muted)', width: 14, height: 14 }} /></div>
              }
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.brand}</div>
              </div>
              <button type="button" onClick={() => remove(p.id)} aria-label="Remove" style={{
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)',
                padding: 2, display: 'flex', alignItems: 'center', flexShrink: 0,
              }}><I.close width="13" height="13" /></button>
            </div>
          ))}
        </div>
      )}
      <div className="adm-search" style={{ width: '100%' }}>
        <I.search />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products to attach…"
        />
      </div>
      {q && (
        <div style={{
          maxHeight: 200, overflowY: 'auto',
          border: '1px solid var(--line)', borderRadius: 8,
          background: 'var(--card)',
        }}>
          {available.length === 0 && (
            <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--muted)' }}>No matching products.</div>
          )}
          {available.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { add(p.id); setQ(''); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', background: 'none', border: 'none',
                borderBottom: '1px solid var(--line)', cursor: 'pointer',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
            >
              {p.image
                ? <img src={p.image} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 36, height: 36, borderRadius: 6, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><I.image style={{ color: 'var(--muted)' }} /></div>
              }
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{p.brand} · {p.price}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function VideosAdminView({ videos, products, onToast }) {
  const [editor, setEditor] = useState(null);

  const del = (id) => {
    router.delete('/admin/videos/' + id, {
      preserveState: true, preserveScroll: true,
      onSuccess: () => onToast('Video removed.')
    });
  };

  const save = (data, isEdit, id) => {
    if (isEdit) {
      router.put('/admin/videos/' + id, data, {
        preserveState: true, preserveScroll: true,
        onSuccess: () => { setEditor(null); onToast('Video saved.'); }
      });
    } else {
      router.post('/admin/videos', data, {
        preserveState: true, preserveScroll: true,
        onSuccess: () => { setEditor(null); onToast('Video saved.'); }
      });
    }
  };

  return (
    <>
      <div className="adm-head"><div><h1>Videos</h1><p>{videos.length} videos across the platform.</p></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <BulkImportButton
            label="videos"
            headers={['title', 'tag', 'thumb', 'youtube', 'video_url', 'duration', 'products']}
            sample={{
              title: "The Bag You'll Carry Forever", tag: 'Fashion', thumb: 'https://example.com/thumb.jpg',
              youtube: 'dQw4w9WgXcQ', video_url: '', duration: '4:32', products: 'quilted-leather-crossbody|eau-de-parfum',
            }}
            existing={videos}
            parseRow={(raw) => ({
              title: raw.title, tag: raw.tag, thumb: raw.thumb, youtube: raw.youtube, video_url: raw.video_url,
              duration: raw.duration, products: splitList(raw.products),
            })}
            matchExisting={(raw, data, existing) => (data.title ? existing.find((v) => (v.title || '').trim().toLowerCase() === data.title.trim().toLowerCase()) : null)}
            getId={(v) => v.id}
            summarize={(data, match) => `${data.title || '(no title)'}${match ? ' → updates “' + match.title + '”' : ''}`}
            importUrl="/admin/videos/bulk-import"
            onToast={onToast}
          />
          <button className="adm-btn adm-btn-primary" onClick={() => setEditor({})}><I.plus /> Add video</button>
        </div></div>
      <div className="adm-panel">
        <table className="adm-table">
          <thead><tr><th></th><th>Title</th><th>Tag</th><th>Duration</th><th>Products</th><th>Video</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
          <tbody>{videos.map((v) => (
            <tr key={v.id}>
              <td style={{ width: 70 }}>{v.thumb ? <img className="adm-thumb" src={v.thumb} alt="" /> : <span className="adm-thumb ph"><I.image width="16" height="16" /></span>}</td>
              <td><div className="adm-pname">{v.title}</div></td>
              <td><span className="adm-tag cat">{v.tag}</span></td>
              <td>{v.duration}</td>
              <td>
                {(v.products && v.products.length > 0)
                  ? <span className="adm-tag yours">{v.products.length} attached</span>
                  : <span style={{ fontSize: 12, color: 'var(--muted)' }}>— none —</span>}
              </td>
              <td style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace' }}>
                {v.youtube
                  ? <span title={v.youtube}>YT: {v.youtube}</span>
                  : v.video_url
                    ? <span style={{ color: 'var(--accent)' }}>Uploaded</span>
                    : <span style={{ opacity: 0.45 }}>—</span>}
              </td>
              <td className="adm-row-actions">
                <button className="adm-icon" onClick={() => setEditor(v)} aria-label="Edit"><I.edit /></button>
                <button className="adm-icon danger" onClick={() => del(v.id)} aria-label="Delete"><I.trash /></button>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {editor && (
        <div className="adm-overlay" onMouseDown={() => setEditor(null)}>
          <div className="adm-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="adm-modal-head"><h2>{editor.id ? 'Edit video' : 'Add video'}</h2>
              <button className="adm-close" onClick={() => setEditor(null)}><I.close /></button></div>
            <div className="adm-modal-body"><VideoEditor initial={editor} products={products} onCancel={() => setEditor(null)} onSave={save} /></div>
          </div>
        </div>
      )}
    </>
  );
}

function extractYouTubeId(str) {
  if (!str || !str.trim()) return '';
  const m = str.match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(str.trim())) return str.trim();
  return '';
}

function VideoEditor({ initial, products, onCancel, onSave }) {
  const isEdit = !!(initial && initial.id);
  const [title, setTitle] = useState(initial.title || '');
  const [tag, setTag] = useState(initial.tag || 'Fashion');
  const [thumb, setThumb] = useState(initial.thumb || '');
  const [duration, setDuration] = useState(initial.duration || '');
  const [selectedIds, setSelectedIds] = useState(
    (initial.products ?? []).map((p) => (typeof p === 'object' ? p.id : p))
  );
  const [err, setErr] = useState('');

  const [mode, setMode] = useState(initial.video_url ? 'upload' : 'youtube');
  const [ytInput, setYtInput] = useState(initial.youtube || '');
  const [ytId, setYtId] = useState(initial.youtube || '');
  const [videoUrl, setVideoUrl] = useState(initial.video_url || '');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imgBusy, bumpImgBusy] = useUploadBusy();
  const fileRef = useRef(null);

  const handleYtChange = (val) => {
    setYtInput(val);
    const id = extractYouTubeId(val);
    setYtId(id);
    if (id && !thumb) setThumb(`https://img.youtube.com/vi/${id}/hqdefault.jpg`);
  };

  const captureThumb = (url) => {
    try {
      const vid = document.createElement('video');
      vid.crossOrigin = 'anonymous';
      vid.src = url;
      vid.preload = 'metadata';
      vid.muted = true;
      vid.onloadedmetadata = () => {
        const s = Math.round(vid.duration);
        if (!isNaN(s) && s > 0) setDuration(`${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`);
        vid.currentTime = Math.min(3, vid.duration * 0.1);
      };
      vid.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = vid.videoWidth || 1280;
          canvas.height = vid.videoHeight || 720;
          canvas.getContext('2d').drawImage(vid, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setThumb((prev) => prev || dataUrl);
        } catch (_) {}
      };
    } catch (_) {}
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('video', file);
    const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/admin/videos/upload');
    xhr.setRequestHeader('X-CSRF-TOKEN', csrf);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setUploadProgress(Math.round(e.loaded / e.total * 100));
    };
    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          const data = JSON.parse(xhr.responseText);
          setVideoUrl(data.url);
          captureThumb(data.url);
        } catch (_) { setErr('Upload response invalid.'); }
      } else {
        setErr('Upload failed. Max size is 500 MB.');
      }
      setUploading(false);
      setUploadProgress(0);
    };
    xhr.onerror = () => { setErr('Upload failed.'); setUploading(false); setUploadProgress(0); };
    setUploading(true);
    setErr('');
    xhr.send(formData);
  };

  const submit = () => {
    if (!title.trim()) return setErr('Title required.');
    const payload = { title: title.trim(), tag, thumb, duration, products: selectedIds };
    if (mode === 'youtube') {
      if (!ytId) return setErr('Paste a valid YouTube URL or 11-character video ID.');
      payload.youtube = ytId;
      payload.video_url = null;
    } else {
      if (!videoUrl.trim()) return setErr('Enter a video URL or upload a file.');
      payload.youtube = null;
      payload.video_url = videoUrl.trim();
    }
    onSave(payload, isEdit, initial.id);
  };

  return (
    <div className="adm-form">
      <div className="adm-grid2">
        <div className="adm-field">
          <label>Title <span className="req">*</span></label>
          <input className="adm-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. The Bag You'll Carry Forever" />
        </div>
        <div className="adm-field">
          <label>Category tag</label>
          <select className="adm-input" value={tag} onChange={(e) => setTag(e.target.value)}>
            {TAG_OPTS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="adm-field">
        <label>Video source</label>
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          {[['youtube', '▶ YouTube'], ['upload', '⬆ Upload / URL']].map(([m, label]) => (
            <button key={m} type="button" onClick={() => setMode(m)} style={{
              padding: '7px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500,
              border: '1.5px solid', cursor: 'pointer',
              borderColor: mode === m ? 'var(--brand)' : 'var(--border)',
              background: mode === m ? 'var(--brand)' : 'transparent',
              color: mode === m ? '#fff' : 'var(--text)',
            }}>{label}</button>
          ))}
        </div>
      </div>

      {mode === 'youtube' ? (
        <div className="adm-grid2">
          <div className="adm-field">
            <label>YouTube URL or ID <span className="req">*</span></label>
            <input className="adm-input" value={ytInput} onChange={(e) => handleYtChange(e.target.value)}
              placeholder="https://youtu.be/dQw4w9WgXcQ  or  dQw4w9WgXcQ" />
            {ytId && <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, display: 'block' }}>ID: {ytId}</span>}
          </div>
          <div className="adm-field">
            <label>Duration</label>
            <input className="adm-input" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 4:32" />
          </div>
        </div>
      ) : (
        <>
          <div className="adm-field">
            <label>Video URL or upload file <span className="req">*</span></label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input className="adm-input" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://..." style={{ flex: 1 }} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} style={{
                padding: '9px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                background: 'var(--brand)', color: '#fff', border: 'none', flexShrink: 0,
                cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1,
              }}>
                {uploading ? `${uploadProgress}%` : 'Upload'}
              </button>
              <input ref={fileRef} type="file"
                accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo,.mp4,.webm,.ogg,.mov,.avi"
                style={{ display: 'none' }} onChange={handleFileChange} />
            </div>
            {uploading && (
              <div style={{ marginTop: 8, height: 4, background: 'var(--bg-alt)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'var(--brand)', width: `${uploadProgress}%`, transition: 'width .2s', borderRadius: 4 }} />
              </div>
            )}
            {videoUrl && !uploading && (
              <div style={{ display: 'flex', gap: 8, marginTop: 5, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: 'var(--muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{videoUrl}</span>
                <button type="button" style={{ fontSize: 11, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                  onClick={() => detectDuration(videoUrl)}>detect duration</button>
              </div>
            )}
          </div>
          <div className="adm-field">
            <label>Duration</label>
            <input className="adm-input" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 4:32" />
          </div>
        </>
      )}

      <ImgInput label="Thumbnail (auto-captured from uploaded video — or paste a URL)" value={thumb} onChange={setThumb} onBusyChange={(b) => bumpImgBusy(b ? 1 : -1)} />

      <div className="adm-section-title">
        Attached products <span style={{ fontWeight: 400, fontSize: 12, textTransform: 'none', letterSpacing: 0, color: 'var(--muted)' }}>— shown beside the video ({selectedIds.length} selected)</span>
      </div>
      <VideoProductPicker selectedIds={selectedIds} onChange={setSelectedIds} products={products || []} />
      <div className="adm-form-foot">
        {err && <span className="err">{err}</span>}
        <span className="spacer"></span>
        <button type="button" className="adm-btn adm-btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="button" className="adm-btn adm-btn-primary" onClick={submit} disabled={imgBusy || uploading}><I.check /> Save video</button>
      </div>
    </div>
  );
}

// ── Journal ───────────────────────────────────────────────────────────────────

function JournalView({ articles, products, onToast }) {
  const [editor, setEditor] = useState(null);

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

  return (
    <>
      <div className="adm-head"><div><h1>Limitra Journal</h1><p>{articles.length} articles published.</p></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <BulkImportButton
            label="articles"
            headers={['slug', 'title', 'tag', 'category', 'excerpt', 'img', 'date', 'author', 'read_time', 'featured']}
            sample={{
              slug: 'the-bag-youll-carry-forever', title: "The Bag You'll Carry Forever", tag: 'Fashion', category: 'Women',
              excerpt: 'Short summary shown on homepage and guide cards.', img: 'https://example.com/hero.jpg',
              date: 'July 3, 2026', author: 'Limitra Editors', read_time: '5 min', featured: 'FALSE',
            }}
            existing={articles}
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
        </div></div>
      <div className="adm-panel">
        <table className="adm-table">
          <thead><tr><th></th><th>Article</th><th>Tag</th><th>Date</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
          <tbody>{articles.map((a) => (
            <tr key={a.id}>
              <td style={{ width: 70 }}>{a.img ? <img className="adm-thumb" src={a.img} alt="" /> : <span className="adm-thumb ph"><I.image width="16" height="16" /></span>}</td>
              <td><div className="adm-pname">{a.title}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{a.excerpt ? a.excerpt.slice(0, 60) + '…' : ''}</div></td>
              <td><span className="adm-tag cat">{a.tag}</span></td>
              <td style={{ fontSize: 12, color: 'var(--muted)' }}>{a.date}</td>
              <td className="adm-row-actions">
                <a className="adm-icon" href={'/article/' + a.slug} target="_blank" rel="noopener" aria-label="Preview"><I.eye /></a>
                <button className="adm-icon" onClick={() => setEditor(a)} aria-label="Edit"><I.edit /></button>
                <button className="adm-icon danger" onClick={() => del(a.id)} aria-label="Delete"><I.trash /></button>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {editor && (
        <div className="adm-overlay" onMouseDown={() => setEditor(null)}>
          <div className="adm-modal" style={{ width: 'min(900px,98vw)' }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="adm-modal-head"><h2>{editor.id ? 'Edit article' : 'New article'}</h2>
              <button className="adm-close" onClick={() => setEditor(null)}><I.close /></button></div>
            <div className="adm-modal-body">
              <ArticleEditor initial={editor} products={products} onCancel={() => setEditor(null)} onSave={save} existing={articles.map((a) => a.slug)} />
            </div>
          </div>
        </div>
      )}
    </>
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
              <textarea className="adm-textarea" style={{ minHeight: 60, fontFamily: 'monospace', fontSize: 12 }} value={(block.ids || []).join(', ')} placeholder="Product IDs comma-separated (e.g. leather-shoulder-bag, eau-de-parfum)" onChange={(e) => setBlock(i, { ids: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />
            </>
          ) : (
            <textarea className="adm-textarea" style={{ minHeight: block.type === 'lead' ? 80 : 56 }} value={block.text || ''} onChange={(e) => setBlock(i, { text: e.target.value })} placeholder={block.type === 'heading' ? 'Section heading' : block.type === 'pullquote' ? 'Quote text' : 'Write content…'} />
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

// ── Occasions ─────────────────────────────────────────────────────────────────

function OccasionsAdminView({ occasions, onToast }) {
  const [editor, setEditor] = useState(null);

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
            existing={occasions}
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
        {occasions.length === 0 ? (
          <div className="adm-empty"><I.sparkle width="40" height="40" /><p style={{ margin: 0 }}>No occasions yet.</p></div>
        ) : (
          <table className="adm-table">
            <thead><tr><th></th><th>Occasion</th><th>Badge</th><th>Link</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>{occasions.map((o) => (
              <tr key={o.id}>
                <td style={{ width: 70 }}>{o.img ? <img className="adm-thumb" src={o.img} alt="" /> : <span className="adm-thumb ph"><I.sparkle width="16" height="16" /></span>}</td>
                <td><div className="adm-pname">{o.title}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>{o.tagline ? o.tagline.slice(0, 55) + '…' : ''}</div></td>
                <td style={{ fontSize: 13 }}>{o.badge}</td>
                <td style={{ fontSize: 12, color: 'var(--muted)' }}>{o.link}</td>
                <td className="adm-row-actions">
                  {o.link && <a className="adm-icon" href={o.link} target="_blank" rel="noopener" aria-label="Preview"><I.eye /></a>}
                  <button className="adm-icon" onClick={() => setEditor(o)} aria-label="Edit"><I.edit /></button>
                  <button className="adm-icon danger" onClick={() => del(o.id)} aria-label="Delete"><I.trash /></button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      {editor && (
        <div className="adm-overlay" onMouseDown={() => setEditor(null)}>
          <div className="adm-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="adm-modal-head"><h2>{editor.id ? 'Edit occasion' : 'New occasion'}</h2>
              <button className="adm-close" onClick={() => setEditor(null)}><I.close /></button></div>
            <div className="adm-modal-body">
              <OccEditor initial={editor} onCancel={() => setEditor(null)} onSave={save} existing={occasions.map((o) => o.key)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function OccEditor({ initial, onCancel, onSave, existing }) {
  const isEdit = !!(initial && initial.id);
  const [title, setTitle] = useState(initial.title || '');
  const [eyebrow, setEyebrow] = useState(initial.eyebrow || '');
  const [tagline, setTagline] = useState(initial.tagline || '');
  const [badge, setBadge] = useState(initial.badge || '');
  const [img, setImg] = useState(initial.img || '');
  const [link, setLink] = useState(initial.link || '/collection/');
  const [featured, setFeatured] = useState(initial.featured || false);
  const [isHero, setIsHero] = useState(initial.is_hero || false);
  const [err, setErr] = useState('');
  const [imgBusy, bumpImgBusy] = useUploadBusy();
  const submit = () => {
    if (!title.trim()) return setErr('Title required.');
    const key = initial.key || admSlug(title);
    if (!isEdit && existing.includes(key)) return setErr(`Key "${key}" already exists.`);
    onSave({ key, title: title.trim(), eyebrow: eyebrow.trim(), tagline: tagline.trim(), badge: badge.trim(), img, link, featured, is_hero: isHero }, isEdit, initial.id);
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

// ── Settings ──────────────────────────────────────────────────────────────────

function HeroSlidesEditor({ value, onChange, onBusyChange }) {
  const parse = (v) => { try { return JSON.parse(v || '[]'); } catch (e) { return []; } };
  const [slides, setSlides] = useState(() => parse(value));
  const [imgBusy, bumpImgBusy] = useUploadBusy();
  useEffect(() => { onBusyChange?.(imgBusy); }, [imgBusy]);
  const commit = (next) => { setSlides(next); onChange(JSON.stringify(next)); };
  const setField = (i, k, v) => commit(slides.map((s, idx) => idx === i ? { ...s, [k]: v } : s));
  const add = () => commit([...slides, { image: '', alt: '', eyebrow: '', title: '', subtitle: '', cta_text: '', cta_url: '', cta2_text: '', cta2_url: '' }]);
  const remove = (i) => commit(slides.filter((_, idx) => idx !== i));
  const move = (i, dir) => {
    const next = [...slides]; const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]]; commit(next);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {slides.length === 0 && (
        <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>
          No slides yet. Add one below. Leave text fields blank to use the global defaults from the "Hero defaults" panel.
        </p>
      )}
      {slides.map((slide, i) => (
        <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--surface-alt, #f7f6f4)', borderBottom: '1px solid var(--line)' }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--brand)' }}>Slide {i + 1}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" className="adm-btn adm-btn-ghost sm" onClick={() => move(i, -1)} disabled={i === 0} title="Move up">↑</button>
              <button type="button" className="adm-btn adm-btn-ghost sm" onClick={() => move(i, 1)} disabled={i === slides.length - 1} title="Move down">↓</button>
              <button type="button" className="adm-btn adm-btn-ghost sm" onClick={() => remove(i)} style={{ color: '#c0392b' }}>Remove</button>
            </div>
          </div>
          <div style={{ padding: 16 }}>
            <ImgInput label="Slide image" value={slide.image} onChange={(v) => setField(i, 'image', v)} onBusyChange={(b) => bumpImgBusy(b ? 1 : -1)} />
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="adm-grid2">
                <div className="adm-field">
                  <label>Eyebrow label <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span></label>
                  <input className="adm-input" value={slide.eyebrow || ''} onChange={(e) => setField(i, 'eyebrow', e.target.value)} placeholder="e.g. New Arrivals" />
                </div>
                <div className="adm-field">
                  <label>Alt text</label>
                  <input className="adm-input" value={slide.alt || ''} onChange={(e) => setField(i, 'alt', e.target.value)} placeholder="Describe the image for accessibility" />
                </div>
              </div>
              <div className="adm-field">
                <label>Headline <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(leave blank to use global default)</span></label>
                <input className="adm-input" value={slide.title || ''} onChange={(e) => setField(i, 'title', e.target.value)} placeholder="e.g. Discover Better Products." />
              </div>
              <div className="adm-field">
                <label>Subtitle <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span></label>
                <textarea className="adm-textarea" style={{ minHeight: 56 }} value={slide.subtitle || ''} onChange={(e) => setField(i, 'subtitle', e.target.value)} placeholder="Short supporting text below the headline…" />
              </div>
              <div className="adm-grid2">
                <div className="adm-field">
                  <label>Primary button text</label>
                  <input className="adm-input" value={slide.cta_text || ''} onChange={(e) => setField(i, 'cta_text', e.target.value)} placeholder="e.g. Explore Now" />
                </div>
                <div className="adm-field">
                  <label>Primary button URL</label>
                  <input className="adm-input" value={slide.cta_url || ''} onChange={(e) => setField(i, 'cta_url', e.target.value)} placeholder="/collection/new" />
                </div>
              </div>
              <div className="adm-grid2">
                <div className="adm-field">
                  <label>Secondary button text <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span></label>
                  <input className="adm-input" value={slide.cta2_text || ''} onChange={(e) => setField(i, 'cta2_text', e.target.value)} placeholder="e.g. Read Guides" />
                </div>
                <div className="adm-field">
                  <label>Secondary button URL</label>
                  <input className="adm-input" value={slide.cta2_url || ''} onChange={(e) => setField(i, 'cta2_url', e.target.value)} placeholder="/guides" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="adm-btn adm-btn-ghost" onClick={add} style={{ alignSelf: 'flex-start' }}>+ Add slide</button>
    </div>
  );
}

function SettingsView({ settings, onToast }) {
  const [form, setForm] = useState({ ...settings });
  const [imgBusy, bumpImgBusy] = useUploadBusy();
  const [slidesBusy, setSlidesBusy] = useState(false);
  const anyBusy = imgBusy || slidesBusy;
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const save = () => {
    router.put('/admin/settings', form, {
      preserveState: true, preserveScroll: true,
      onSuccess: () => onToast('Settings saved.')
    });
  };
  return (
    <>
      <div className="adm-head"><div><h1>Settings</h1><p>Edit homepage text, hero content, and section labels.</p></div></div>
      <div className="adm-panel">
        <h2>Announce bar</h2>
        <p className="sub">The thin strip at the very top of every page. HTML allowed.</p>
        <div className="adm-form">
          <div className="adm-field"><label>Announcement text</label>
            <input className="adm-input" value={form.announce_text || ''} onChange={(e) => set('announce_text', e.target.value)} /></div>
        </div>
      </div>
      <div className="adm-panel">
        <h2>Hero defaults</h2>
        <p className="sub">Fallback text used when a slide has no headline or subtitle set. Also used when there are no slides at all.</p>
        <div className="adm-form">
          <div className="adm-grid2">
            <div className="adm-field"><label>Eyebrow label</label><input className="adm-input" value={form.hero_eyebrow || ''} onChange={(e) => set('hero_eyebrow', e.target.value)} placeholder="e.g. Editor's Collection" /></div>
            <div className="adm-field"><label>Headline</label><input className="adm-input" value={form.hero_title || ''} onChange={(e) => set('hero_title', e.target.value)} /></div>
          </div>
          <div className="adm-field"><label>Subtitle</label><textarea className="adm-textarea" value={form.hero_subtitle || ''} onChange={(e) => set('hero_subtitle', e.target.value)} /></div>
          <div className="adm-grid2">
            <div className="adm-field"><label>Primary CTA text</label><input className="adm-input" value={form.hero_cta_primary || ''} onChange={(e) => set('hero_cta_primary', e.target.value)} /></div>
            <div className="adm-field"><label>Primary CTA URL</label><input className="adm-input" value={form.hero_cta_primary_url || ''} onChange={(e) => set('hero_cta_primary_url', e.target.value)} /></div>
          </div>
          <div className="adm-grid2">
            <div className="adm-field"><label>Secondary CTA text</label><input className="adm-input" value={form.hero_cta_secondary || ''} onChange={(e) => set('hero_cta_secondary', e.target.value)} /></div>
            <div className="adm-field"><label>Secondary CTA URL</label><input className="adm-input" value={form.hero_cta_secondary_url || ''} onChange={(e) => set('hero_cta_secondary_url', e.target.value)} /></div>
          </div>
        </div>
      </div>
      <div className="adm-panel">
        <h2>Featured Products row</h2>
        <p className="sub">Controlled by the "Feature on homepage" checkbox in each product's editor.</p>
        <div className="adm-form">
          <div className="adm-grid3">
            <div className="adm-field"><label>Eyebrow</label><input className="adm-input" value={form.featured_eyebrow || ''} onChange={(e) => set('featured_eyebrow', e.target.value)} /></div>
            <div className="adm-field"><label>Title</label><input className="adm-input" value={form.featured_title || ''} onChange={(e) => set('featured_title', e.target.value)} /></div>
            <div className="adm-field"><label>Subtitle</label><input className="adm-input" value={form.featured_sub || ''} onChange={(e) => set('featured_sub', e.target.value)} /></div>
          </div>
        </div>
      </div>
      <div className="adm-panel">
        <h2>Resort Picks row</h2>
        <p className="sub">Controlled by the "Resort picks row" checkbox in each product's editor.</p>
        <div className="adm-form">
          <div className="adm-grid3">
            <div className="adm-field"><label>Eyebrow</label><input className="adm-input" value={form.resort_eyebrow || ''} onChange={(e) => set('resort_eyebrow', e.target.value)} /></div>
            <div className="adm-field"><label>Title</label><input className="adm-input" value={form.resort_title || ''} onChange={(e) => set('resort_title', e.target.value)} /></div>
            <div className="adm-field"><label>Subtitle</label><input className="adm-input" value={form.resort_sub || ''} onChange={(e) => set('resort_sub', e.target.value)} /></div>
          </div>
        </div>
      </div>
      <div className="adm-panel">
        <h2>Hero carousel slides</h2>
        <p className="sub">Add, remove, and reorder the slides shown in the homepage hero banner. Each slide needs an image and optional alt text.</p>
        <div className="adm-form">
          <HeroSlidesEditor value={form.hero_slides || '[]'} onChange={(v) => set('hero_slides', v)} onBusyChange={setSlidesBusy} />
        </div>
      </div>
      <div className="adm-panel">
        <h2>Homepage row limits</h2>
        <p className="sub">Maximum number of products shown in each homepage row.</p>
        <div className="adm-form">
          <div className="adm-grid3">
            <div className="adm-field">
              <label>Featured products count</label>
              <input type="number" className="adm-input" min={1} max={24} value={form.home_featured_count || 8} onChange={(e) => set('home_featured_count', e.target.value)} />
            </div>
            <div className="adm-field">
              <label>Resort picks count</label>
              <input type="number" className="adm-input" min={1} max={24} value={form.home_resort_count || 8} onChange={(e) => set('home_resort_count', e.target.value)} />
            </div>
            <div className="adm-field">
              <label>Journal articles count</label>
              <input type="number" className="adm-input" min={1} max={20} value={form.home_articles_count || 6} onChange={(e) => set('home_articles_count', e.target.value)} />
            </div>
          </div>
        </div>
      </div>
      <div className="adm-panel">
        <h2>Newsletter popup</h2>
        <p className="sub">Controls the signup modal that appears after a visitor has been on the site for a while.</p>
        <div className="adm-form">
          <ImgInput label="Modal image" value={form.newsletter_modal_image || ''} onChange={(v) => set('newsletter_modal_image', v)} onBusyChange={(b) => bumpImgBusy(b ? 1 : -1)} />
          <div className="adm-grid2">
            <div className="adm-field">
              <label>Delay before popup (ms)</label>
              <input type="number" className="adm-input" min={0} step={500} value={form.newsletter_popup_delay_ms || 3000} onChange={(e) => set('newsletter_popup_delay_ms', e.target.value)} />
              <span style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, display: 'block' }}>e.g. 3000 = 3 seconds after page load</span>
            </div>
            <div className="adm-field">
              <label>Cooldown after dismissal (ms)</label>
              <input type="number" className="adm-input" min={0} step={3600000} value={form.newsletter_popup_cooldown_ms || 86400000} onChange={(e) => set('newsletter_popup_cooldown_ms', e.target.value)} />
              <span style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, display: 'block' }}>e.g. 86400000 = 24 hours before showing again</span>
            </div>
          </div>
        </div>
      </div>
      <div style={{ padding: '16px 0' }}>
        <button className="adm-btn adm-btn-primary" onClick={save} disabled={anyBusy}><I.check /> Save all settings</button>
      </div>
    </>
  );
}

// ── Bulk Uploads ─────────────────────────────────────────────────────────────

function BulkImportsView({ batches }) {
  const [active, setActive] = useState(null);

  return (
    <>
      <div className="adm-head">
        <div><h1>Bulk Uploads</h1><p>History of CSV bulk imports from every section.</p></div>
        <button type="button" className="adm-btn adm-btn-ghost" onClick={() => router.reload({ only: ['bulkImports'] })}><I.upload /> Refresh</button>
      </div>

      {batches.length === 0 ? (
        <div className="adm-panel">
          <div className="adm-empty">
            <I.upload width="42" height="42" />
            <h3>No bulk uploads yet</h3>
            <p>CSV imports from Products, Looks, Videos, Journal, or Occasions will show up here.</p>
          </div>
        </div>
      ) : (
        <div className="adm-panel">
          <table className="adm-table">
            <thead><tr><th>Upload</th><th>Section</th><th>When</th><th>Status</th><th>Result</th></tr></thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => setActive(b)}>
                  <td>{b.filename || `import-${b.id}`}</td>
                  <td><span className="adm-tag cat">{b.type}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(b.created_at).toLocaleString()}</td>
                  <td>
                    {b.status === 'processing'
                      ? <span className="adm-tag yours">Processing…</span>
                      : b.status === 'failed'
                        ? <span style={{ color: '#c0392b', fontWeight: 700, fontSize: 12.5 }}>Failed</span>
                        : <span className="adm-link-ok"><I.check width="13" height="13" /> Completed</span>}
                  </td>
                  <td style={{ fontSize: 12.5, color: 'var(--muted)' }}>{b.status === 'processing' ? '—' : bulkResultMessage(b)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {active && (
        <div className="adm-overlay" onMouseDown={() => setActive(null)}>
          <div className="adm-modal" style={{ width: 'min(760px,98vw)' }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="adm-modal-head">
              <h2>{active.filename || `Import #${active.id}`}</h2>
              <button className="adm-close" onClick={() => setActive(null)}><I.close /></button>
            </div>
            <div className="adm-modal-body">
              <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 0 }}>
                {active.type} · {new Date(active.created_at).toLocaleString()}
              </p>
              {active.status === 'processing' ? (
                <div className="adm-empty" style={{ padding: '30px 20px' }}>
                  <p>Still processing — check back shortly.</p>
                  <button type="button" className="adm-btn adm-btn-ghost sm" onClick={() => router.reload({ only: ['bulkImports'] })}>Refresh</button>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 13.5 }}>
                    {active.status === 'failed' ? 'This import crashed before it could finish.' : bulkResultMessage(active)}
                  </p>
                  {(active.errors || []).length > 0 && (
                    <div style={{ maxHeight: 360, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 8 }}>
                      <table className="adm-table">
                        <thead><tr><th>Row</th><th>Item</th><th>Reason</th></tr></thead>
                        <tbody>
                          {active.errors.map((e, i) => (
                            <tr key={i}>
                              <td>{e.row != null ? e.row + 1 : '—'}</td>
                              <td>{e.summary || '—'}</td>
                              <td style={{ color: '#c0392b' }}>{e.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Admin shell ───────────────────────────────────────────────────────────────

function LogoutButton() {
  const { post, processing } = useForm();
  return (
    <button
      onClick={() => post('/admin/logout')}
      disabled={processing}
      style={{ color: 'rgba(255,255,255,.85)', fontSize: 13.5, display: 'inline-flex', alignItems: 'center', gap: 7, transition: 'color .2s', background: 'none', border: 'none', cursor: 'pointer' }}
      onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
      onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,.85)'}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      {processing ? 'Signing out…' : 'Sign out'}
    </button>
  );
}

export default function AdminIndex() {
  const { props } = usePage();
  const { products = [], categories = [], occasions = [], articles = [], looks = [], videos = [], settings = {}, bulkImports = [] } = props;

  const [view, setView] = useState('dashboard');
  const [editor, setEditor] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    document.documentElement.dataset.palette = 'riviera';
    const loader = document.getElementById('site-loader');
    if (loader) { loader.classList.add('sl-done'); setTimeout(() => loader.remove(), 600); }
  }, []);

  const admToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  const saveProduct = (data, isEdit) => {
    if (isEdit) {
      router.put('/admin/products/' + data.id, data, {
        preserveState: true, preserveScroll: true,
        onSuccess: () => { setEditor(null); admToast('Product updated.'); }
      });
    } else {
      router.post('/admin/products', data, {
        preserveState: true, preserveScroll: true,
        onSuccess: () => { setEditor(null); admToast('Product added — live on storefront.'); }
      });
    }
  };

  const deleteProduct = (p) => {
    if (!confirm(`Delete "${p.name}"? This removes it from the storefront.`)) return;
    router.delete('/admin/products/' + p.id, {
      preserveState: true, preserveScroll: true,
      onSuccess: () => admToast('Product deleted.')
    });
  };

  const nav = [
    { key: 'dashboard', label: 'Dashboard', icon: 'grid' },
    { key: 'products', label: 'Products', icon: 'box', badge: products.length },
    { key: 'categories', label: 'Categories', icon: 'sparkle' },
    { key: 'looks', label: 'Style the Look', icon: 'bookmark' },
    { key: 'videos', label: 'Videos', icon: 'image' },
    { key: 'journal', label: 'Journal', icon: 'link' },
    { key: 'occasions', label: 'Occasions', icon: 'heart' },
    { key: 'bulk-imports', label: 'Bulk Uploads', icon: 'upload', badge: bulkImports.filter((b) => b.status === 'processing').length || null },
    { key: 'settings', label: 'Settings', icon: 'edit' },
  ];

  return (
    <div className="adm-body">
      <Seo title="Admin Dashboard" noIndex />
      <div className="adm-top">
        <span className="word">LIMITRA</span>
        <span className="tag">Admin</span>
        <span className="spacer"></span>
        <a href="/" target="_blank" rel="noopener"><I.store /> View storefront</a>
        <LogoutButton />
      </div>
      <div className="adm-shell">
        <aside className="adm-side">
          <div className="grp">Manage</div>
          {nav.map((n) => {
            const Icon = I[n.icon];
            return (
              <button key={n.key} className={'adm-nav' + (view === n.key ? ' active' : '')} onClick={() => setView(n.key)}>
                <Icon /> {n.label}
                {n.badge != null && <span className="badge">{n.badge}</span>}
              </button>
            );
          })}
          <div className="side-foot">Data is stored in the database. Use standard backups to export.</div>
        </aside>

        <main className="adm-main">
          {view === 'dashboard' && <Dashboard products={products} settings={settings} onAdd={() => setEditor({})} onGo={setView} />}
          {view === 'products' && <ProductsView products={products} categories={categories} onAdd={() => setEditor({})} onEdit={(p) => setEditor(p)} onDelete={deleteProduct} onToast={admToast} />}
          {view === 'categories' && <CategoriesView categories={categories} onToast={admToast} />}
          {view === 'looks' && <LooksView looks={looks} products={products} onToast={admToast} />}
          {view === 'videos' && <VideosAdminView videos={videos} products={products} onToast={admToast} />}
          {view === 'journal' && <JournalView articles={articles} products={products} onToast={admToast} />}
          {view === 'occasions' && <OccasionsAdminView occasions={occasions} onToast={admToast} />}
          {view === 'bulk-imports' && <BulkImportsView batches={bulkImports} />}
          {view === 'settings' && <SettingsView settings={settings} onToast={admToast} />}
        </main>
      </div>

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
                existingIds={products.map((p) => p.slug).filter(Boolean)}
                onCancel={() => setEditor(null)}
                onSave={saveProduct}
              />
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="adm-toast"><I.check /> {toast}</div>
      )}
    </div>
  );
}
