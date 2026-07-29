import { useState } from 'react';
import { router } from '@inertiajs/react';
import I from '../Icons';
import { ImgInput, useUploadBusy } from './AdminShared';

function CatEditor({ cat, onCancel, onSave }) {
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
    <div className="adm-form">
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
      <div className="adm-form-foot">
        <span className="spacer"></span>
        <button type="button" className="adm-btn adm-btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="button" className="adm-btn adm-btn-primary" onClick={() => onSave({ img, featureImg: fi1, featureImg2: fi2, bannerImg: ban, subs })} disabled={imgBusy}>
          <I.check /> Save category
        </button>
      </div>
    </div>
  );
}

export default function CategoriesView({ categories, onToast }) {
  const [editor, setEditor] = useState(null);

  const save = (patch) => {
    router.put('/admin/categories/' + editor.id, patch, {
      preserveState: true, preserveScroll: true,
      onSuccess: () => { setEditor(null); onToast('Category updated.'); }
    });
  };

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
              <button className="adm-btn adm-btn-ghost sm" onClick={() => setEditor(c)}>
                Edit <I.edit />
              </button>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[['Homepage tile', c.img], ['Feature 1', c.featureImg], ['Feature 2', c.featureImg2], ['Banner', c.bannerImg]].map(([lab, src]) => (
                <div key={lab} style={{ textAlign: 'center' }}>
                  <div style={{ width: 52, height: 52, borderRadius: 7, overflow: 'hidden', background: 'var(--card)', border: '1px solid var(--line)' }}>
                    {src && <img src={src} alt={lab} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 3 }}>{lab}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {editor && (
        <div className="adm-overlay" onMouseDown={() => setEditor(null)}>
          <div className="adm-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="adm-modal-head">
              <h2>Edit {editor.name}</h2>
              <button className="adm-close" onClick={() => setEditor(null)} aria-label="Close"><I.close /></button>
            </div>
            <div className="adm-modal-body">
              <CatEditor cat={editor} onCancel={() => setEditor(null)} onSave={save} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
