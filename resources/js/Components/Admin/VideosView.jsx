import { useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import I from '../Icons';
import { TAG_OPTS } from '../../constants';
import DataTable from './DataTable';
import { useUploadBusy, ImgInput, BulkImportButton, VideoProductPicker, splitList, handleSessionExpired, useLookup, useServerTable } from './AdminShared';

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
      } else if (xhr.status === 419) {
        handleSessionExpired();
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
                  onClick={() => captureThumb(videoUrl)}>detect duration</button>
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

export default function VideosAdminView({ videos, productsLookup, onToast }) {
  const [editor, setEditor] = useState(null);
  const videosLookup = useLookup('/admin/videos/lookup');
  const { server } = useServerTable('videos', 'videos');

  const del = (id) => {
    router.delete('/admin/videos/' + id, {
      only: ['videos'], preserveState: true, preserveScroll: true,
      onSuccess: () => onToast('Video removed.')
    });
  };

  const save = (data, isEdit, id) => {
    if (isEdit) {
      router.put('/admin/videos/' + id, data, {
        only: ['videos'], preserveState: true, preserveScroll: true,
        onSuccess: () => { setEditor(null); onToast('Video saved.'); }
      });
    } else {
      router.post('/admin/videos', data, {
        only: ['videos'], preserveState: true, preserveScroll: true,
        onSuccess: () => { setEditor(null); onToast('Video saved.'); }
      });
    }
  };

  const columns = [
    {
      key: 'thumb', label: '', sortable: false, width: 70,
      render: (v) => v.thumb ? <img className="adm-thumb" src={v.thumb} alt="" /> : <span className="adm-thumb ph"><I.image width="16" height="16" /></span>,
    },
    { key: 'title', label: 'Title', render: (v) => <div className="adm-pname">{v.title}</div> },
    { key: 'tag', label: 'Tag', render: (v) => <span className="adm-tag cat">{v.tag}</span> },
    { key: 'duration', label: 'Duration' },
    {
      key: 'products', label: 'Products', sortValue: (v) => (v.products || []).length,
      render: (v) => (v.products && v.products.length > 0)
        ? <span className="adm-tag yours">{v.products.length} attached</span>
        : <span style={{ fontSize: 12, color: 'var(--muted)' }}>— none —</span>,
    },
    {
      key: 'source', label: 'Video', sortable: false,
      render: (v) => (
        <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace' }}>
          {v.youtube
            ? <span title={v.youtube}>YT: {v.youtube}</span>
            : v.video_url
              ? <span style={{ color: 'var(--accent)' }}>Uploaded</span>
              : <span style={{ opacity: 0.45 }}>—</span>}
        </span>
      ),
    },
    {
      key: 'actions', label: 'Actions', align: 'right', sortable: false,
      render: (v) => (
        <div className="adm-row-actions">
          <button className="adm-icon" onClick={() => setEditor(v)} aria-label="Edit"><I.edit /></button>
          <button className="adm-icon danger" onClick={() => del(v.id)} aria-label="Delete"><I.trash /></button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="adm-head"><div><h1>Videos</h1><p>{videos.total} video{videos.total === 1 ? '' : 's'} across the platform.</p></div></div>
      <div className="adm-panel">
        <DataTable
          columns={columns}
          rows={videos.data}
          getRowId={(v) => v.id}
          server={server(videos)}
          toolbar={
            <>
              <span className="dtbl-toolbar-spacer"></span>
              <BulkImportButton
                label="videos"
                headers={['title', 'tag', 'thumb', 'youtube', 'video_url', 'duration', 'products']}
                sample={{
                  title: "The Bag You'll Carry Forever", tag: 'Fashion', thumb: 'https://example.com/thumb.jpg',
                  youtube: 'dQw4w9WgXcQ', video_url: '', duration: '4:32', products: 'quilted-leather-crossbody|eau-de-parfum',
                }}
                existing={videosLookup}
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
            </>
          }
        />
      </div>
      {editor && (
        <div className="adm-overlay" onMouseDown={() => setEditor(null)}>
          <div className="adm-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="adm-modal-head"><h2>{editor.id ? 'Edit video' : 'Add video'}</h2>
              <button className="adm-close" onClick={() => setEditor(null)}><I.close /></button></div>
            <div className="adm-modal-body"><VideoEditor initial={editor} products={productsLookup} onCancel={() => setEditor(null)} onSave={save} /></div>
          </div>
        </div>
      )}
    </>
  );
}
