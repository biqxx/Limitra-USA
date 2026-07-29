import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import I from '../Icons';
import { useUploadBusy, ImgInput } from './AdminShared';

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

export default function SettingsView({ settings, onToast }) {
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
        <h2>Social links</h2>
        <p className="sub">Shown as icons in the site footer. Leave a field blank to hide that icon.</p>
        <div className="adm-form">
          <div className="adm-grid2">
            <div className="adm-field"><label>Instagram URL</label><input className="adm-input" value={form.social_instagram_url || ''} onChange={(e) => set('social_instagram_url', e.target.value)} placeholder="https://instagram.com/limitrausa" /></div>
            <div className="adm-field"><label>Facebook URL</label><input className="adm-input" value={form.social_facebook_url || ''} onChange={(e) => set('social_facebook_url', e.target.value)} placeholder="https://facebook.com/limitrausa" /></div>
          </div>
          <div className="adm-grid2">
            <div className="adm-field"><label>Pinterest URL</label><input className="adm-input" value={form.social_pinterest_url || ''} onChange={(e) => set('social_pinterest_url', e.target.value)} placeholder="https://pinterest.com/limitrausa" /></div>
            <div className="adm-field"><label>X (Twitter) URL</label><input className="adm-input" value={form.social_x_url || ''} onChange={(e) => set('social_x_url', e.target.value)} placeholder="https://x.com/limitrausa" /></div>
          </div>
          <div className="adm-grid2">
            <div className="adm-field"><label>TikTok URL</label><input className="adm-input" value={form.social_tiktok_url || ''} onChange={(e) => set('social_tiktok_url', e.target.value)} placeholder="https://tiktok.com/@limitrausa" /></div>
            <div className="adm-field"><label>LinkedIn URL</label><input className="adm-input" value={form.social_linkedin_url || ''} onChange={(e) => set('social_linkedin_url', e.target.value)} placeholder="https://linkedin.com/company/limitrausa" /></div>
          </div>
          <div className="adm-field"><label>Snapchat URL</label><input className="adm-input" value={form.social_snapchat_url || ''} onChange={(e) => set('social_snapchat_url', e.target.value)} placeholder="https://snapchat.com/add/limitrausa" /></div>
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
