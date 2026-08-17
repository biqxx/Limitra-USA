import { useEffect, useRef, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import I from '../Icons';

// ── Lightweight lookups ──────────────────────────────────────────────────────
//
// The admin tables are server-paginated — each Inertia prop only carries the
// current page. Features that need to see the *entire* resource (the
// cross-editor product picker, slug/key-uniqueness checks in an editor,
// bulk-import "does this already exist?" matching) fetch one of the small
// GET /admin/{resource}/lookup endpoints instead, via this hook.

/**
 * Fetches a lookup endpoint once on mount; returns [] until it resolves.
 * Pass a falsy `url` (e.g. gated behind a "do we need this yet?" flag) to skip
 * fetching entirely — useful for deferring a shared lookup until the first
 * tab that actually needs it is opened.
 */
export function useLookup(url) {
  const [data, setData] = useState([]);
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    fetch(url, { headers: { Accept: 'application/json' } })
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setData(Array.isArray(d) ? d : []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [url]);
  return data;
}

// ── Server-paginated tables ──────────────────────────────────────────────────
//
// Builds the `server` prop DataTable needs (page/perPage/total/lastPage/sort +
// change handlers) from a Laravel paginator object, driving page/perPage/sort
// changes through a partial Inertia reload of just that one prop.
//
// paramPrefix: query-string prefix the controller reads (e.g. "static_pages"
// for static_pages_page/static_pages_per_page/...).
// propName: the Inertia prop key to reload (e.g. "staticPages").
export function useServerTable(paramPrefix, propName) {
  const [sort, setSort] = useState(null);
  const [loading, setLoading] = useState(false);

  const reload = (paginator, overrides = {}) => {
    const nextSort = overrides.sort !== undefined ? overrides.sort : sort;
    router.reload({
      data: {
        [`${paramPrefix}_page`]: overrides.page ?? paginator.current_page,
        [`${paramPrefix}_per_page`]: overrides.perPage ?? paginator.per_page,
        [`${paramPrefix}_sort`]: nextSort?.key || '',
        [`${paramPrefix}_dir`]: nextSort?.dir || '',
      },
      only: [propName],
      preserveState: true,
      preserveScroll: true,
      onStart: () => setLoading(true),
      onFinish: () => setLoading(false),
    });
  };

  const server = (paginator) => ({
    page: paginator.current_page,
    perPage: paginator.per_page,
    total: paginator.total,
    lastPage: paginator.last_page,
    sort,
    loading,
    onPageChange: (page) => reload(paginator, { page }),
    onPerPageChange: (perPage) => reload(paginator, { perPage, page: 1 }),
    onSortChange: (nextSort) => { setSort(nextSort); reload(paginator, { sort: nextSort, page: 1 }); },
  });

  return { server };
}

// ── Session / uploads ────────────────────────────────────────────────────────

export class SessionExpiredError extends Error {}

// A 419 on any admin request means the session/CSRF token is no longer valid —
// log the admin out by sending them to the login screen. (Router-driven Inertia
// requests are handled globally in app.jsx; this covers raw fetch/XHR calls.)
export function handleSessionExpired() {
  window.location.href = '/admin/login';
}

export async function uploadImageFile(file) {
  const data = new FormData();
  data.append('image', file);
  const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
  const res = await fetch('/admin/images/upload', {
    method: 'POST',
    headers: { 'X-CSRF-TOKEN': token, 'Accept': 'application/json' },
    body: data,
  });
  if (res.status === 419) { handleSessionExpired(); throw new SessionExpiredError('Session expired'); }
  if (!res.ok) throw new Error('Upload failed');
  return (await res.json()).url;
}

export async function uploadVideoFile(file) {
  const data = new FormData();
  data.append('video', file);
  const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
  const res = await fetch('/admin/videos/upload', {
    method: 'POST',
    headers: { 'X-CSRF-TOKEN': token, 'Accept': 'application/json' },
    body: data,
  });
  if (res.status === 419) { handleSessionExpired(); throw new SessionExpiredError('Session expired'); }
  if (!res.ok) throw new Error('Upload failed');
  return (await res.json()).url;
}

export function uploadErrorMessage(err) {
  return err instanceof SessionExpiredError
    ? 'Your session has expired — please reload the page and try again.'
    : 'Upload failed — try again.';
}

export function UploadErrorNote({ error }) {
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

export function admSlug(s) {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Tracks how many concurrent uploads are in flight so a parent editor can
// disable its Save button until every image has finished processing.
export function useUploadBusy() {
  const [count, setCount] = useState(0);
  const bump = (delta) => setCount((n) => Math.max(0, n + delta));
  return [count > 0, bump];
}

// ── Shared image & video inputs ───────────────────────────────────────────────

export function ImgInput({ value, onChange, label, onBusyChange }) {
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

export function VideoInput({ value, onChange, label, onBusyChange }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const pick = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setBusy(true); setUploadError(null); onBusyChange?.(true);
    try { onChange(await uploadVideoFile(f)); } catch (err) { setUploadError(err); }
    setBusy(false); onBusyChange?.(false);
    e.target.value = '';
  };
  return (
    <div className="adm-field">
      {label && <label>{label}</label>}
      <div className="adm-img">
        <div className="adm-img-prev" style={{ width: 110, height: 75, background: '#0d1b2a', borderRadius: 6, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {value ? (
            <video src={value} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline />
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          )}
        </div>
        <div className="adm-img-controls">
          <input ref={ref} type="file" accept="video/mp4,video/webm,video/ogg,video/quicktime,video/*" style={{ display: 'none' }} onChange={pick} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="adm-btn adm-btn-ghost sm" onClick={() => ref.current.click()} disabled={busy}>
              <I.upload /> {busy ? 'Uploading video…' : 'Upload Video File'}
            </button>
            {value && <button type="button" className="adm-btn adm-btn-ghost sm" onClick={() => onChange('')}>Remove</button>}
          </div>
          <UploadErrorNote error={uploadError} />
          <input
            className="adm-input"
            placeholder="…or paste direct video URL (.mp4, .webm)"
            value={value && value.startsWith('data:') ? '' : (value || '')}
            onChange={(e) => onChange(e.target.value)}
            style={{ fontSize: 13 }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Bulk CSV import ────────────────────────────────────────────────────────────

export function parseCSV(text) {
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

export function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function downloadCSV(filename, headers, rows) {
  const lines = [headers.join(','), ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function splitList(s) {
  return String(s || '').split('|').map((x) => x.trim()).filter(Boolean);
}

export function toBool(s) {
  return ['true', '1', 'yes', 'y'].includes(String(s || '').trim().toLowerCase());
}

export async function postJSON(url, body) {
  const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token, 'Accept': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 419) { handleSessionExpired(); throw new SessionExpiredError('Session expired'); }
  if (!res.ok) throw new Error('Import failed');
  return res.json();
}

export function bulkResultMessage(batch) {
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
export function BulkImportButton({ label, headers, sample, existing, parseRow, matchExisting, getId, summarize, importUrl, onToast }) {
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

// ── Skeleton / loading state ──────────────────────────────────────────────────

export function AdmTabSkeleton() {
  return (
    <>
      <div className="adm-head">
        <div className="adm-skel" style={{ width: 220, height: 30, marginBottom: 10 }}></div>
        <div className="adm-skel" style={{ width: 320, height: 15 }}></div>
      </div>
      <div className="adm-panel">
        <div className="adm-skel" style={{ width: 160, height: 20, marginBottom: 14 }}></div>
        <div className="adm-skel" style={{ width: '100%', height: 46, marginBottom: 8 }}></div>
        <div className="adm-skel" style={{ width: '100%', height: 46, marginBottom: 8 }}></div>
        <div className="adm-skel" style={{ width: '100%', height: 46 }}></div>
      </div>
    </>
  );
}

// ── Product picker (used by Looks/Videos/Journal/Guides/Occasions editors) ────

export function VideoProductPicker({ selectedIds, onChange, products }) {
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

// ── Admin top bar ─────────────────────────────────────────────────────────────

export function LogoutButton() {
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
