import { useState, useEffect } from 'react';
import { usePage, Link } from '@inertiajs/react';
import Layout from '../Components/Layout';
import Seo from '../Components/Seo';
import { SavedDrawer } from '../Components/ProductCard';

export default function StaticPage() {
  const { props } = usePage();
  const page = props.page || {};
  const pg = {
    title: page.title || '',
    eyebrow: page.eyebrow,
    headline: page.headline || '',
    lead: page.lead,
    heroImg: page.hero_img,
    sections: page.sections || [],
    note: page.note,
    form: page.has_form,
    cta: page.cta_text && page.cta_href ? { text: page.cta_text, href: page.cta_href } : null,
  };

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("General Questions");
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { document.documentElement.dataset.palette = "riviera"; }, [page.key]);

  const sendMsg = () => {
    if (!name.trim() || !email.trim() || !msg.trim()) return;
    setSent(true);
  };

  return (
    <Layout savedCount={0} onOpenSaved={() => setDrawerOpen(true)}>
      <Seo
        title={pg.title}
        description={pg.lead}
      />
      <div className="announce">Exclusive access to curated luxury · <strong>Editor-vetted picks, updated weekly</strong></div>

      <div className="wrap">
        <div className="static-body">
          <nav className="breadcrumb" style={{ paddingTop: 0, marginBottom: 28 }}>
            <Link href="/">Home</Link><span className="sep">/</span>
            <span className="here">{pg.title}</span>
          </nav>

          {pg.heroImg && <img className="static-hero-img" src={pg.heroImg} alt={pg.title} />}
          {pg.eyebrow && <span className="static-tag">{pg.eyebrow}</span>}
          <h1>{pg.headline}</h1>
          <p className="lead">{pg.lead}</p>

          {pg.sections && pg.sections.map((s, i) => (
            <div key={i}>
              <h2>{s.h}</h2>
              {s.body && <p>{s.body}</p>}
              {s.list && <ul>{s.list.map((li, j) => <li key={j}>{li}</li>)}</ul>}
            </div>
          ))}

          {pg.note && <div className="note">{pg.note}</div>}

          {pg.form && !sent && (
            <>
              <div className="static-divider"></div>
              <h2>Send a Message</h2>
              <form className="static-form" onSubmit={(e) => { e.preventDefault(); sendMsg(); }}>
                <div className="two">
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 7 }}>Full Name *</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 7 }}>Email Address *</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 7 }}>Reason for Contact</label>
                  <select value={reason} onChange={(e) => setReason(e.target.value)}>
                    {["General Questions", "Partnerships", "Affiliate and Retail Inquiries", "Media and Brand Requests", "Website Feedback"].map((r) => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--muted)", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: 7 }}>Message *</label>
                  <textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="How can we help?" required></textarea>
                </div>
                <div className="note" style={{ marginTop: 0 }}>{pg.note}</div>
                <button className="static-cta" type="submit">Send Message</button>
              </form>
            </>
          )}
          {pg.form && sent && (
            <div style={{ background: "color-mix(in oklab, var(--accent) 10%, var(--surface))", border: "1px solid var(--accent-soft)", borderRadius: 10, padding: "22px 24px", marginTop: 24 }}>
              <strong style={{ color: "var(--brand)" }}>Message sent.</strong> Thank you for reaching out — we will review your message and get back to you as soon as possible.
            </div>
          )}

          {pg.cta && (
            <div style={{ marginTop: 36 }}>
              <Link className="static-cta" href={pg.cta.href}>{pg.cta.text}</Link>
            </div>
          )}
        </div>
      </div>

      <SavedDrawer open={drawerOpen} products={[]} onClose={() => setDrawerOpen(false)}
        onToggle={() => {}} onQuick={() => {}} />
    </Layout>
  );
}
