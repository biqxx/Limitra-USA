import { useState, useEffect } from 'react';
import { usePage, Link } from '@inertiajs/react';
import Layout from '../Components/Layout';
import Seo from '../Components/Seo';
import { SavedDrawer } from '../Components/ProductCard';

const PAGES = {
  about: {
    title: "About Us",
    eyebrow: "Our Story",
    headline: "Smarter Shopping Starts with Better Discovery.",
    lead: "Limitra USA is a curated product discovery platform created to help shoppers find better products, useful ideas, and trusted shopping destinations — with less confusion.",
    sections: [
      { h: "What We Do", body: "We help shoppers discover curated product ideas, compare useful finds, explore shopping guides, and connect with trusted retail destinations across fashion, beauty, home, fitness, technology, and lifestyle." },
      { h: "Why Limitra USA Exists", body: "Online shopping can feel crowded, noisy, and time-consuming. Limitra USA was created to make product discovery feel cleaner, simpler, and more inspiring. We organize selected finds so customers can discover products more easily and make more confident shopping decisions." },
      { h: "Our Standard", body: "We focus on clarity, usefulness, trust, and premium presentation. Every page should help customers understand what they are seeing, why it matters, and where to go next. When a customer finds something they like, we guide them to a trusted retail destination where they can review final details and complete the purchase." },
      { h: "Our Promise", body: "Better discovery, smarter choices, and a more confident shopping experience. We do not aim to overwhelm shoppers with endless options — our goal is to simplify discovery by highlighting products and ideas that feel useful, relevant, and worth exploring." },
    ],
    cta: { text: "Explore Curated Finds", href: "/collection/new" },
  },
  disclosure: {
    title: "Affiliate Disclosure",
    eyebrow: "Transparency",
    headline: "Affiliate Disclosure",
    lead: "Limitra USA is a curated product discovery platform. Some links on our website may be affiliate links.",
    sections: [
      { h: "What This Means", body: "When you click a link on Limitra USA and complete a qualifying purchase through a third-party retail partner, Limitra USA may earn a commission. This does not change the price you pay. Product prices, availability, shipping, returns, warranties, and customer service are controlled entirely by the retailer where the purchase is completed." },
      { h: "Affiliate Programs", body: "Limitra USA may participate in affiliate programs including Amazon Associates and other retail partner programs. As an Amazon Associate, Limitra USA may earn from qualifying purchases." },
      { h: "Our Commitment", body: "Affiliate relationships do not remove our responsibility to present products honestly and avoid misleading customers. Our goal is to recommend and organize useful product ideas in a clear and trustworthy way. We avoid fake reviews, misleading discounts, and unsupported claims." },
      { h: "Important Note for Shoppers", body: "Customers should always review final product details, pricing, delivery information, return policies, and warranty information directly on the retailer's website before completing a purchase. Limitra USA is a discovery platform — final purchases are completed through third-party retail partners." },
    ],
  },
  careers: {
    title: "Careers",
    eyebrow: "Join the Team",
    headline: "Build the Future of Smarter Product Discovery.",
    lead: "Limitra USA is growing as a curated product discovery platform focused on shopping inspiration, premium presentation, and customer-first digital experiences.",
    sections: [
      { h: "Who We Look For", body: "We look for people who are thoughtful, reliable, creative, detail-oriented, and committed to building a premium digital brand. Everyone at Limitra USA should support one goal: helping shoppers discover better products with more confidence and less confusion." },
      { h: "Areas of Opportunity", list: ["Content and Shopping Research", "Social Media and Community Growth", "Website Design and Product Experience", "Affiliate Partnership Support", "Brand Copywriting", "Digital Marketing", "Product Curation", "Customer Support", "Data and Performance Review"] },
      { h: "Interested in Working With Us?", body: "If you believe you can help Limitra USA grow, improve customer trust, or create a better shopping discovery experience, we would be happy to hear from you. Contact us with a short note about yourself and your area of interest." },
    ],
    cta: { text: "Contact Limitra USA", href: "/page/contact" },
    note: "We do not list open roles unless positions are formally approved. All applications are reviewed carefully.",
  },
  contact: {
    title: "Contact Us",
    eyebrow: "Get in Touch",
    headline: "Contact Limitra USA",
    lead: "Have a question, partnership idea, media request, or general message? Contact the Limitra USA team and we will review your message as soon as possible.",
    form: true,
    note: "For questions about an order, delivery, return, warranty, or payment, please contact the retailer where the purchase was completed. Limitra USA helps with product discovery — final purchases are completed through third-party retail partners.",
  },
  editorial: {
    title: "Editorial Policy",
    eyebrow: "Our Standards",
    headline: "Editorial Policy",
    lead: "Limitra USA creates product discovery content, shopping guides, and curated product pages to help customers explore useful finds and make more confident shopping decisions.",
    sections: [
      { h: "How We Select Products", body: "Products may be selected based on category relevance, customer usefulness, visual quality, product details, retail availability, trend interest, and overall fit for the Limitra USA shopping experience. We curate with the shopper in mind, not advertising pressures." },
      { h: "Our Content Standard", body: "We avoid fake reviews, fake ratings, misleading discounts, copied product descriptions, and unsupported claims. Product information may change at any time, so customers should always confirm final details directly with the retailer before purchasing." },
      { h: "Affiliate Relationships", body: "Some content may include affiliate links. Limitra USA may earn from qualifying purchases, but our content is guided by usefulness and customer value — not commission rates. We would not feature a product we wouldn't recommend to a friend." },
      { h: "Corrections and Updates", body: "If you notice inaccurate information on Limitra USA, please contact us. We take accuracy seriously and will review and correct issues promptly." },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    eyebrow: "Your Privacy",
    headline: "Privacy Policy",
    lead: "Limitra USA respects customer privacy. This page explains how we handle information collected through our website.",
    sections: [
      { h: "Information We Collect", body: "We may collect basic information such as contact form details, newsletter signups, website usage data, and click activity. This is used to improve the website experience, understand customer interest, and communicate with visitors who choose to hear from us." },
      { h: "Cookies and Analytics", body: "We may use standard analytics tools and cookies to understand how visitors use the Limitra USA website. This data is aggregated and anonymous. You can manage cookie preferences through your browser settings." },
      { h: "Third-Party Retailers", body: "We do not control the privacy practices of third-party retailers. When a visitor leaves Limitra USA and visits a retail partner's website, the retailer's own privacy policy applies. We encourage customers to review the privacy policy of any retailer before completing a purchase." },
      { h: "Your Rights", body: "You may request to unsubscribe from communications at any time. For questions about your data or to request removal, please use our contact form." },
    ],
    note: "This page provides a summary. The full Privacy Policy should be reviewed by a legal professional before final publication.",
  },
  terms: {
    title: "Terms of Use",
    eyebrow: "Legal",
    headline: "Terms of Use",
    lead: "By using Limitra USA, visitors agree that the website is provided for product discovery, shopping inspiration, and informational purposes.",
    sections: [
      { h: "Nature of the Service", body: "Limitra USA is a curated product discovery platform. We link to third-party retail websites where purchases are completed. We are not a marketplace, retailer, or fulfillment service. Purchases, payments, shipping, returns, warranties, product support, and customer service are handled entirely by the retailer where the purchase is completed." },
      { h: "No Guarantees", body: "Limitra USA does not guarantee product availability, pricing, delivery times, retailer policies, or product performance. All information on this site is provided in good faith but may change at any time. Visitors should review all final details directly on the retailer's website before purchasing." },
      { h: "Affiliate Links", body: "Some links on Limitra USA are affiliate links. By clicking and purchasing through these links, you help support the platform. This never affects the price you pay." },
      { h: "Content Use", body: "Content on Limitra USA is for personal, non-commercial use only. Reproduction, redistribution, or commercial use of our editorial content without permission is not permitted." },
    ],
    note: "This page provides a summary. The full Terms of Use should be reviewed by a legal professional before final publication.",
  },
  partner: {
    title: "Partner With Us",
    eyebrow: "Partnerships",
    headline: "Partner With Limitra USA",
    lead: "Limitra USA works to connect shoppers with curated products, useful shopping ideas, and trusted retail destinations. We welcome partnership conversations with aligned brands and creators.",
    sections: [
      { h: "Who Can Partner With Us", list: ["Brands & Retailers", "Affiliate Networks", "Content Creators & Influencers", "Publishers & Media Partners", "Product Discovery Partners"] },
      { h: "What We Value", list: ["Quality products with clear customer value", "Honest communication and professional presentation", "Reliable retail experiences", "Strong brand alignment with Limitra USA's standards", "Customer-first approach to product discovery"] },
      { h: "What Partnership Looks Like", body: "We review partnership opportunities carefully to protect customer trust and brand quality. A good partnership creates genuine value for the shoppers we serve — not just for the businesses involved." },
    ],
    cta: { text: "Start a Partnership Conversation", href: "/page/contact" },
  },
};

export default function StaticPage() {
  const { props } = usePage();
  const pageKey = props.page || "about";
  const pg = PAGES[pageKey] || PAGES.about;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("General Questions");
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => { document.documentElement.dataset.palette = "riviera"; }, [pageKey]);

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

          {pg.eyebrow && <span className="static-tag">{pg.eyebrow}</span>}
          <h1>{pg.headline}</h1>
          <p className="lead">{pg.lead}</p>

          {pg.sections && pg.sections.map((s) => (
            <div key={s.h}>
              <h2>{s.h}</h2>
              {s.body && <p>{s.body}</p>}
              {s.list && <ul>{s.list.map((li) => <li key={li}>{li}</li>)}</ul>}
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
                <div className="note" style={{ marginTop: 0 }}>{PAGES.contact.note}</div>
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
