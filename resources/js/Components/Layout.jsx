import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import I from './Icons';
import ChatWidget from './ChatWidget';
import AuthModal from './AuthModal';

const NAV_MINI_DATA = {
  newArrivals: {
    eyebrow: "Freshly Curated",
    description: "The newest finds added this week across every category.",
    links: [{ label: "All New Arrivals", href: "/collection/new" }],
  },
  trending: {
    eyebrow: "Most Loved Now",
    description: "Popular, useful, and stylish finds shoppers are watching right now.",
    dividerIndex: 4,
    links: [
      { label: "All Trending Finds",      href: "/collection/trending"  },
      { label: "Editor's Picks",          href: "/collection/editors"   },
      { label: "Recently Added",          href: "/collection/new"       },
      { label: "Gift Edits",              href: "/collection/gifts"     },
      { label: "⚽ World Cup Edit",        href: "/collection/worldcup"  },
      { label: "♻️ Pre-loved Treasures",   href: "/collection/preloved"  },
    ],
  },
  guides: {
    eyebrow: "Shop Smarter",
    description: "Helpful guides that make choosing the right product easier.",
    links: [
      { label: "Style the Look",    href: "/looks"                            },
      { label: "All Buying Guides", href: "/guides"                           },
      { label: "Fashion Guides",    href: "/article/bags-to-own-forever"      },
      { label: "Beauty Guides",     href: "/article/fragrance-wardrobe"       },
      { label: "Travel Guides",     href: "/article/travel-edit-editors-pack" },
      { label: "Gift Guides",       href: "/collection/gifts"                 },
      { label: "Capsule Wardrobe",  href: "/article/capsule-wardrobe-2026"    },
    ],
  },
};

function MiniDropdown({ eyebrow, description, links, dividerIndex }) {
  return (
    <div className="mini-mega" role="menu">
      <div className="mini-mega-head">
        <span className="eyebrow">{eyebrow}</span>
        <p>{description}</p>
      </div>
      {links.map((link, idx) => (
        <div key={idx}>
          {dividerIndex === idx && <div className="mini-mega-divider"></div>}
          <Link href={link.href}>
            {link.label}<span className="arr">→</span>
          </Link>
        </div>
      ))}
    </div>
  );
}

function MegaDropdown({ intro, leftLinks, rightLinks, images }) {
  return (
    <div className="mega" role="menu" style={{ width: "50vw", minWidth: 900 }}>
      <div className="mega-inner">
        <div className="mega-intro">
          <span className="eyebrow">{intro.eyebrow}</span>
          <h3>{intro.title}</h3>
          <p>{intro.description}</p>
          <Link className="see-all" href={intro.href}>{intro.cta}</Link>
        </div>
        <div className="mega-links">
          <h4>{intro.browseLabel}</h4>
          {leftLinks.map((link, idx) => (
            <Link href={link.href} key={idx}>
              {link.label}<span className="arr">→</span>
            </Link>
          ))}
        </div>
        <div className="mega-links">
          <h4>&nbsp;</h4>
          {rightLinks.map((link, idx) => (
            <Link href={link.href} key={idx}>
              {link.label}<span className="arr">→</span>
            </Link>
          ))}
        </div>
        <div className="mega-imgs">
          {images.map((img, idx) => (
            <Link className="mega-img" href={img.href} key={idx}>
              <img src={img.src} alt={img.alt} loading="lazy" />
              <span className="cap">{img.caption}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

const NS_KEY = "limitra.newsletter.v1";
const NS_SHOWN_KEY = "limitra.newsletter.shown_at";

function hasSignedUp() {
  try { return !!localStorage.getItem(NS_KEY); } catch (e) { return false; }
}
function shownWithinCooldown(cooldownMs) {
  try {
    const ts = localStorage.getItem(NS_SHOWN_KEY);
    return ts && (Date.now() - Number(ts)) < cooldownMs;
  } catch (e) { return false; }
}
function markShown() {
  try { localStorage.setItem(NS_SHOWN_KEY, String(Date.now())); } catch (e) {}
}

function SignupModal({ open, onClose, modalImage }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const esc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const submit = async () => {
    if (!name.trim()) return setErr("Please enter your name.");
    if (!email.trim()) return setErr("Please enter your email.");
    if (!agreed) return setErr("Please agree to the terms.");
    setLoading(true); setErr("");
    try {
      const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";
      const res = await fetch("/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": csrf },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return setErr(data?.message || "Something went wrong. Please try again.");
      }
      try { localStorage.setItem(NS_KEY, JSON.stringify({ email: email.trim(), date: Date.now() })); } catch (e) {}
      setDone(true);
      setTimeout(onClose, 2800);
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ns-overlay" onMouseDown={onClose}>
      <div className="ns-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ns-photo">
          <img src={modalImage || "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80"} alt="Limitra USA" />
        </div>
        <button className="ns-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="ns-form-side">
          {done ? (
            <div className="ns-success">
              <div className="check-ic"><I.check width="28" height="28" /></div>
              <h3>Welcome to Limitra</h3>
              <p>You're on the list — expect editor picks, new arrivals and exclusive updates in your inbox.</p>
            </div>
          ) : (
            <>
              <div className="ns-brand">
                <div className="nw">LIMITRA</div>
                <div className="usa-row">
                  <span className="rule"></span>
                  <span className="usa">USA</span>
                  <span className="rule"></span>
                </div>
              </div>
              <h2 className="ns-headline">JOIN THE<br />NEWSLETTER</h2>
              <div className="ns-divider"><span className="dia">◆</span></div>
              <p className="ns-desc">Be first to discover new arrivals, premium picks, exclusive updates, and shopping inspiration from Limitra USA.</p>
              <div className="ns-fields">
                <div className="ns-field">
                  <label>Name<span className="req">*</span></label>
                  <div className="ns-input-wrap">
                    <I.user width="17" height="17" />
                    <input type="text" placeholder="Your Name" value={name} onChange={(e) => { setName(e.target.value); setErr(""); }} />
                  </div>
                </div>
                <div className="ns-field">
                  <label>E-mail<span className="req">*</span></label>
                  <div className="ns-input-wrap">
                    <I.mail width="17" height="17" />
                    <input type="email" placeholder="Your Email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} />
                  </div>
                </div>
                <div className="ns-field">
                  <label>Phone Number <span style={{fontSize:11,color:"var(--muted)",fontWeight:400,letterSpacing:0,textTransform:"none"}}>(US only, optional)</span></label>
                  <div className="ns-input-wrap">
                    <span style={{fontSize:18,lineHeight:1}}>🇺🇸</span>
                    <span style={{fontSize:14,color:"var(--muted)",borderRight:"1px solid #ddd",paddingRight:10,marginRight:2}}>+1</span>
                    <input type="tel" placeholder="(201) 555-0123" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                </div>
              </div>
              {err && <div style={{ color: "#c0392b", fontSize: 13, marginTop: 8, width: "100%", textAlign: "left" }}>{err}</div>}
              <button className="ns-submit" onClick={submit} disabled={loading}>{loading ? "Joining…" : "JOIN NEWSLETTER"}</button>
              <div className="ns-terms">
                <input type="checkbox" id="ns-agree" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                <label htmlFor="ns-agree">By checking this box, you agree to our <a href="#">Terms of Use</a> and <a href="#">Privacy Policy</a>.</label>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SearchModal({ open, onClose, catalog, categories }) {
  const [q, setQ] = useState("");
  const [hl, setHl] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQ(""); setHl(0);
    const id = setTimeout(() => inputRef.current && inputRef.current.focus(), 40);
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { clearTimeout(id); document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);

  const query = q.trim().toLowerCase();
  const results = useMemo(() => {
    if (!query) return [];
    const cat = catalog || [];
    const scored = cat.map((p) => {
      const hay = `${p.name} ${p.brand} ${p.category} ${p.subcategory}`.toLowerCase();
      let score = -1;
      if (p.name.toLowerCase().startsWith(query)) score = 0;
      else if (p.name.toLowerCase().includes(query)) score = 1;
      else if (p.brand.toLowerCase().includes(query)) score = 2;
      else if (hay.includes(query)) score = 3;
      return { p, score };
    }).filter((x) => x.score >= 0).sort((a, b) => a.score - b.score);
    return scored.map((x) => x.p);
  }, [query, catalog]);

  const catMatches = useMemo(() => {
    if (!query) return [];
    const out = [];
    (categories || []).forEach((c) => {
      if (c.name.toLowerCase().includes(query)) out.push({ type: "cat", label: c.name, href: `/category/${c.slug}` });
      (c.subcategories || []).forEach((s) => {
        if (s.toLowerCase().includes(query)) out.push({ type: "sub", label: s, sub: c.name, href: `/category/${c.slug}/${encodeURIComponent(s.toLowerCase().replace(/\s+/g, '-'))}` });
      });
    });
    return out.slice(0, 6);
  }, [query, categories]);

  const shown = results.slice(0, 6);

  useEffect(() => {
    if (!open) return;
    const onNav = (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setHl((h) => Math.min(h + 1, shown.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setHl((h) => Math.max(h - 1, 0)); }
      else if (e.key === "Enter" && shown[hl]) { window.location.href = `/product/${shown[hl].slug || shown[hl].id}`; }
    };
    document.addEventListener("keydown", onNav);
    return () => document.removeEventListener("keydown", onNav);
  }, [open, shown, hl, query]);

  if (!open) return null;

  const popular = [
    { label: "Handbags", href: "/category/women/handbags" },
    { label: "Watches", href: "/category/men/watches" },
    { label: "Fragrances", href: "/category/beauty/fragrances" },
    { label: "Skincare", href: "/category/beauty/skincare" },
    { label: "Luggage", href: "/category/travel/luggage" },
    { label: "Gifts under $75", href: "/collection/gifts" },
  ];

  return (
    <div className="search-overlay" onMouseDown={onClose}>
      <div className="search-panel" onMouseDown={(e) => e.stopPropagation()}>
        <div className="search-bar">
          <I.search className="si" width="20" height="20" />
          <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setHl(0); }}
            placeholder="Search products, brands, categories…" aria-label="Search" />
          {q && <button className="search-clear" onClick={() => { setQ(""); inputRef.current.focus(); }} aria-label="Clear"><I.close /></button>}
          <button className="search-esc" onClick={onClose}>ESC</button>
        </div>
        <div className="search-body">
          {!query ? (
            <div className="search-group">
              <h5>Popular searches</h5>
              <div className="search-chips">
                {popular.map((p) => <Link key={p.label} href={p.href}>{p.label}</Link>)}
              </div>
            </div>
          ) : (results.length === 0 && catMatches.length === 0) ? (
            <div className="search-empty">
              <I.search width="38" height="38" />
              <p>No matches for <span className="q">"{q}"</span>.<br />Try a product, brand or category name.</p>
            </div>
          ) : (
            <>
              {catMatches.length > 0 && (
                <div className="search-group">
                  <h5>Categories</h5>
                  <div className="search-chips">
                    {catMatches.map((c, i) => <Link key={i} href={c.href}>{c.type === "sub" ? `${c.sub} · ${c.label}` : c.label}</Link>)}
                  </div>
                </div>
              )}
              {shown.length > 0 && (
                <div className="search-group">
                  <h5>Products · {results.length} found</h5>
                  {shown.map((p, i) => (
                    <Link className={"search-res" + (i === hl ? " hl" : "")} key={p.id} href={`/product/${p.slug || p.id}`}
                      onMouseEnter={() => setHl(i)}>
                      <span className="thumb">{p.image ? <img className="p-img" src={p.image} alt="" /> : null}</span>
                      <span className="meta">
                        <span className="n">{p.name}</span>
                        <span className="c">{p.category} · {p.subcategory}</span>
                      </span>
                    </Link>
                  ))}
                  {results.length > shown.length && (
                    <Link className="search-more" href={`/category/${(categories || [])[0]?.slug || ''}`}>
                      View all {results.length} results →
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BrandMark({ footer }) {
  if (footer) {
    return (
      <div className="foot-brand">
        <div className="word">LIMITRA</div>
      </div>
    );
  }
  return (
    <Link className="brand-mark" href="/" aria-label="Limitra USA home">
      <span className="word">LIMITRA</span>
      <span className="rule"></span>
      <span className="sub">USA</span>
    </Link>
  );
}

export function Header({ savedCount, onOpenSaved }) {
  const { props } = usePage();
  const cats = props.categories || [];
  const catalog = props.catalog || [];
  const ls = props.layoutSettings || {};
  const user = props.auth?.user || null;
  const popupDelayMs   = Number(ls.newsletter_popup_delay_ms   ?? 3000);
  const popupCooldownMs = Number(ls.newsletter_popup_cooldown_ms ?? 86400000);
  const modalImage = ls.newsletter_modal_image || '';

  const [searchOpen,   setSearchOpen]   = useState(false);
  const [signupOpen,   setSignupOpen]   = useState(false);
  const [authOpen,     setAuthOpen]     = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(null);
  const [openNav, setOpenNav] = useState(null);
  const navRef = useRef(null);

  const logout = () => router.post('/logout');

  useEffect(() => {
    if (hasSignedUp() || shownWithinCooldown(popupCooldownMs)) return;
    const t = setTimeout(() => {
      setSignupOpen(true);
      markShown();
    }, popupDelayMs);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setMobileOpen(false); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => {
    if (!openNav) return;
    const close = (e) => { if (navRef.current && !navRef.current.contains(e.target)) setOpenNav(null); };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("touchstart", close); };
  }, [openNav]);

  const miniWrap = { position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", zIndex: 200 };
  const megaWrap = { position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", zIndex: 200 };

  const toggleNav = (key, href, e) => {
    if (openNav !== key) { e.preventDefault(); setOpenNav(key); }
    else setOpenNav(null);
  };

  return (
    <header className="site-header" id="top">
      <div className="wrap header-row">
        <BrandMark />

        <nav className="desktop-nav" ref={navRef}>
          <ul className="main-nav">
            <li className={"nav-item" + (openNav === 'new' ? ' nav-open' : '')} style={{ position: "relative", paddingBottom: 10 }} onMouseLeave={() => setOpenNav(null)}>
              <Link className="nav-link" href="/collection/new" onClick={(e) => toggleNav('new', '/collection/new', e)}>New Arrivals</Link>
              <div style={miniWrap}>
                <MiniDropdown
                  eyebrow={NAV_MINI_DATA.newArrivals.eyebrow}
                  description={NAV_MINI_DATA.newArrivals.description}
                  links={[
                    ...NAV_MINI_DATA.newArrivals.links,
                    ...cats.map((c) => ({ label: `New in ${c.name}`, href: `/collection/new?cat=${encodeURIComponent(c.name)}` })),
                  ]}
                />
              </div>
            </li>
            {cats.map((c) => (
              <li className={"nav-item" + (openNav === c.slug ? ' nav-open' : '')} key={c.slug} style={{ position: "relative", paddingBottom: 10 }} onMouseLeave={() => setOpenNav(null)}>
                <Link className="nav-link" href={`/category/${c.slug}`} onClick={(e) => toggleNav(c.slug, `/category/${c.slug}`, e)}>{c.name}</Link>
                <div style={megaWrap}>
                  <MegaDropdown
                    intro={{
                      eyebrow: "Limitra Edit",
                      title: c.name,
                      description: c.tagline,
                      href: `/category/${c.slug}`,
                      cta: `Shop all ${c.name} →`,
                      browseLabel: "Browse",
                    }}
                    leftLinks={(c.subcategories || []).slice(0, Math.ceil((c.subcategories || []).length / 2)).map((s) => ({
                      label: s,
                      href: `/category/${c.slug}/${encodeURIComponent(s.toLowerCase().replace(/\s+/g, '-'))}`,
                    }))}
                    rightLinks={(c.subcategories || []).slice(Math.ceil((c.subcategories || []).length / 2)).map((s) => ({
                      label: s,
                      href: `/category/${c.slug}/${encodeURIComponent(s.toLowerCase().replace(/\s+/g, '-'))}`,
                    }))}
                    images={[
                      { src: c.feature_img,  alt: c.name, href: `/category/${c.slug}`, caption: `Shop ${c.name}` },
                      { src: c.feature_img2, alt: c.name, href: `/category/${c.slug}`, caption: "New arrivals"   },
                    ]}
                  />
                </div>
              </li>
            ))}
            <li className={"nav-item" + (openNav === 'trending' ? ' nav-open' : '')} style={{ position: "relative", paddingBottom: 10 }} onMouseLeave={() => setOpenNav(null)}>
              <Link className="nav-link" href="/collection/trending" onClick={(e) => toggleNav('trending', '/collection/trending', e)}>Trending</Link>
              <div style={miniWrap}>
                <MiniDropdown
                  eyebrow={NAV_MINI_DATA.trending.eyebrow}
                  description={NAV_MINI_DATA.trending.description}
                  links={NAV_MINI_DATA.trending.links}
                  dividerIndex={NAV_MINI_DATA.trending.dividerIndex}
                />
              </div>
            </li>
            <li className={"nav-item" + (openNav === 'guides' ? ' nav-open' : '')} style={{ position: "relative", paddingBottom: 10 }} onMouseLeave={() => setOpenNav(null)}>
              <Link className="nav-link" href="/guides" onClick={(e) => toggleNav('guides', '/guides', e)}>Guides</Link>
              <div style={miniWrap}>
                <MiniDropdown
                  eyebrow={NAV_MINI_DATA.guides.eyebrow}
                  description={NAV_MINI_DATA.guides.description}
                  links={NAV_MINI_DATA.guides.links}
                />
              </div>
            </li>
          </ul>
        </nav>

        <div className="header-tools">
          <div className="search" onClick={() => setSearchOpen(true)} role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSearchOpen(true); }}>
            <I.search />
            <input placeholder="Search items or brands" aria-label="Search" readOnly tabIndex={-1} style={{ pointerEvents: "none" }} />
          </div>
          <button className="icon-btn search-trigger" onClick={() => setSearchOpen(true)} aria-label="Search"><I.search width="19" height="19" /></button>
          <Link className="tool-link desktop-only" href="/page/contact">Contact</Link>
          <button className="icon-btn" onClick={onOpenSaved} aria-label="Saved products">
            <I.heart />
            {savedCount > 0 && <span className="count">{savedCount}</span>}
          </button>
          {user ? (
            <span className="desktop-only" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="tool-link" style={{ cursor: "default" }}>{user.name}</span>
              <button className="tool-link" onClick={logout} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit", color: "inherit" }}>Log out</button>
            </span>
          ) : (
            <button className="tool-link desktop-only" onClick={() => setAuthOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit", color: "inherit" }}>Sign in</button>
          )}
          <button className="icon-btn mobile-menu-btn" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="mobile-nav-overlay" onMouseDown={() => setMobileOpen(false)}>
          <div className="mobile-nav-drawer" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Navigation menu">
            <div className="mobile-nav-head">
              <BrandMark />
              <button className="icon-btn" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="mobile-nav-body">
              <Link className="mobile-nav-link" href="/collection/new">New Arrivals</Link>
              {cats.map((c) => (
                <div className="mobile-nav-group" key={c.slug}>
                  <button
                    className={"mobile-nav-cat" + (mobileExpanded === c.slug ? " open" : "")}
                    onClick={() => setMobileExpanded(mobileExpanded === c.slug ? null : c.slug)}
                  >
                    {c.name}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                      style={{ transform: mobileExpanded === c.slug ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
                      <path d="m6 9 6 6 6-6"/>
                    </svg>
                  </button>
                  {mobileExpanded === c.slug && (
                    <div className="mobile-nav-subs">
                      <Link href={`/category/${c.slug}`}>Shop all {c.name} →</Link>
                      {(c.subcategories || []).map((s) => (
                        <Link key={s} href={`/category/${c.slug}/${encodeURIComponent(s.toLowerCase().replace(/\s+/g, '-'))}`}>{s}</Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <Link className="mobile-nav-link" href="/collection/trending">Trending</Link>
              <Link className="mobile-nav-link" href="/guides">Guides</Link>
            </div>
            <div className="mobile-nav-foot">
              <Link href="/page/contact">Contact</Link>
              {user ? (
                <button onClick={() => { setMobileOpen(false); logout(); }}>Log out ({user.name})</button>
              ) : (
                <button onClick={() => { setMobileOpen(false); setAuthOpen(true); }}>Sign in</button>
              )}
            </div>
          </div>
        </div>
      )}

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} catalog={catalog} categories={cats} />
      <SignupModal open={signupOpen} onClose={() => setSignupOpen(false)} modalImage={modalImage} />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </header>
  );
}

export function TrustStrip() {
  const items = [
    { icon: "sparkle", text: "Curated Product Picks" },
    { icon: "bookmark", text: "Shopping Inspiration" },
    { icon: "shield", text: "Trusted Retail Destinations" },
    { icon: "check", text: "Simple Discovery" },
  ];
  return (
    <div className="trust-strip">
      <div className="wrap trust-strip-inner">
        {items.map((it) => { const Icon = I[it.icon]; return (
          <div className="trust-item" key={it.text}><Icon width="17" height="17" /><span>{it.text}</span></div>
        );})}
      </div>
    </div>
  );
}

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const submit = (e) => {
    e.preventDefault();
    if (email.trim()) setDone(true);
  };
  return (
    <section className="newsletter">
      <div className="wrap news-inner">
        <div className="news-copy">
          <h2>Discover Better Finds in Your Inbox</h2>
          <p>Get curated product ideas, shopping guides, and useful finds from Limitra USA. Simple updates, no unnecessary noise.</p>
        </div>
        <form className="news-form" onSubmit={submit}>
          {done ? (
            <div className="news-ok">You're in — welcome to Limitra. Check your inbox to confirm.</div>
          ) : (
            <>
              <div className="news-fields">
                <input type="email" placeholder="Enter your email address" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email address" />
                <button className="btn btn-accent" type="submit">Subscribe</button>
              </div>
              <div className="news-note"><I.lock /> We respect your privacy. Unsubscribe anytime.</div>
            </>
          )}
        </form>
      </div>
    </section>
  );
}

export function Footer() {
  const { props } = usePage();
  const catalog = props.catalog || [];
  const ls = props.layoutSettings || {};
  const socials = [
    { key: 'instagram', label: 'Instagram', href: ls.social_instagram_url, Icon: I.instagram },
    { key: 'facebook', label: 'Facebook', href: ls.social_facebook_url, Icon: I.facebook },
    { key: 'pinterest', label: 'Pinterest', href: ls.social_pinterest_url, Icon: I.pinterest },
    { key: 'x', label: 'X', href: ls.social_x_url, Icon: I.x },
    { key: 'tiktok', label: 'TikTok', href: ls.social_tiktok_url, Icon: I.tiktok },
  ].filter((s) => s.href);

  const cols = [
    { h: "Discover", links: [
      { t: "Style the Look", href: "/looks" },
      { t: "Trending Finds", href: "/collection/trending" },
      { t: "New Arrivals", href: "/collection/new" },
      { t: "Editor's Picks", href: "/collection/editors" },
      { t: "Shopping Guides", href: "/guides" },
      { t: "Gift Edits", href: "/collection/gifts" },
      { t: "World Cup Edit", href: "/collection/worldcup" },
      { t: "Pre-loved Treasures", href: "/collection/preloved" },
    ] },
    { h: "Company", links: [
      { t: "About Us", href: "/page/about" },
      { t: "Careers", href: "/page/careers" },
      { t: "Contact Us", href: "/page/contact" },
      { t: "Partner With Us", href: "/page/partner" },
    ] },
    { h: "Trust & Policies", links: [
      { t: "Affiliate Disclosure", href: "/page/disclosure" },
      { t: "Editorial Policy", href: "/page/editorial" },
      { t: "Privacy Policy", href: "/page/privacy" },
      { t: "Terms of Use", href: "/page/terms" },
    ] },
  ];
  return (
    <>
    <footer className="site-footer">
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-col">
            <BrandMark footer />
            <p>Limitra USA is a curated product discovery platform. We help shoppers find better products from trusted retail destinations.</p>
            {socials.length > 0 && (
              <div className="socials">
                {socials.map(({ key, label, href, Icon }) => (
                  <a key={key} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}><Icon /></a>
                ))}
              </div>
            )}
          </div>
          {cols.map((col) => (
            <div className="foot-col" key={col.h}>
              <h5>{col.h}</h5>
              <ul>{col.links.map((l) => <li key={l.t}><Link href={l.href}>{l.t}</Link></li>)}</ul>
            </div>
          ))}
        </div>
      </div>
      <div className="affiliate-note">
        Limitra USA helps shoppers discover curated products and shopping inspiration. Purchases are completed through third-party retail partners. Limitra USA may earn a commission from qualifying purchases.
      </div>
      <div className="wrap">
        <div className="foot-bottom">
          <span>© {new Date().getFullYear()} Limitra USA. All rights reserved.</span>
          <span><Link href="/page/privacy">Privacy Policy</Link> · <Link href="/page/terms">Terms of Use</Link> · <Link href="/page/disclosure">Affiliate Disclosure</Link></span>
        </div>
      </div>
    </footer>
    <ChatWidget catalog={catalog} />
    </>
  );
}

export default function Layout({ children, savedCount, onOpenSaved }) {
  useEffect(() => {
    const loader = document.getElementById('site-loader');
    if (!loader) return;
    loader.classList.add('sl-done');
    const t = setTimeout(() => loader.remove(), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <Header savedCount={savedCount || 0} onOpenSaved={onOpenSaved || (() => {})} />
      <main>{children}</main>
      <Newsletter />
      <Footer />
    </>
  );
}
