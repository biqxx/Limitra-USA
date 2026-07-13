import { useState, useEffect, useRef } from 'react';
import { Link } from '@inertiajs/react';
import I from './Icons';

const TAG_COLORS_V = {
  "Fashion": "var(--brand)",
  "Beauty": "#a0436b",
  "Travel": "#2a6fdb",
  "Lifestyle": "var(--accent)",
};

function trackVideoView(video) {
  if (typeof window === 'undefined') return;
  const id = video?.vid_id || video?.id;
  if (!id) return;
  const token = document.querySelector('meta[name="csrf-token"]')?.content || '';
  fetch(`/videos/${id}/track-view`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token },
    body: JSON.stringify({ source_page: window.location.pathname }),
  }).catch(() => {});
}

function VideoPlayer({ video, isActive = true }) {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!isActive) setPlaying(false);
  }, [isActive]);

  const ytId = video.youtube;
  const srcUrl = video.video_url;
  const thumb = video.thumb || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null);
  const hasSource = !!(ytId || srcUrl);

  if (playing && ytId) {
    return (
      <div style={{ position: "relative", width: "100%", height: "100%", background: "#000" }}>
        <iframe
          src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&playsinline=1`}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
          title={video.title}
        />
      </div>
    );
  }

  if (playing && srcUrl) {
    return (
      <div style={{ position: "relative", width: "100%", height: "100%", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <video
          src={srcUrl}
          autoPlay
          controls
          playsInline
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </div>
    );
  }

  return (
    <div style={{
      position: "relative", width: "100%", height: "100%",
      background: "#000", display: "flex", alignItems: "center", justifyContent: "center",
      flex: "0 0 100%", overflow: "hidden"
    }}>
      {thumb && (
        <img src={thumb} alt={video.title} style={{
          position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover"
        }} />
      )}
      <div
        role={hasSource ? "button" : undefined}
        tabIndex={hasSource ? 0 : undefined}
        onClick={hasSource ? () => { setPlaying(true); trackVideoView(video); } : undefined}
        onKeyDown={hasSource ? (e) => { if (e.key === "Enter") { setPlaying(true); trackVideoView(video); } } : undefined}
        style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,.3)", zIndex: 5, cursor: hasSource ? "pointer" : "default",
        }}
      >
        <div style={{
          width: 60, height: 60, borderRadius: "50%", background: "rgba(255,255,255,.9)",
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: hasSource ? 1 : 0.35,
          transition: "transform .18s ease",
        }}
          onMouseEnter={(e) => hasSource && (e.currentTarget.style.transform = "scale(1.12)")}
          onMouseLeave={(e) => hasSource && (e.currentTarget.style.transform = "scale(1)")}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="#000"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.7) 100%)",
        padding: "32px 20px 24px", color: "#fff", zIndex: 10,
      }}>
        <div style={{ fontSize: 9, letterSpacing: ".18em", textTransform: "uppercase", fontWeight: 700, color: TAG_COLORS_V[video.tag] || "var(--accent)", marginBottom: 6 }}>{video.tag}</div>
        <h3 style={{ fontFamily: "var(--font-display,'Bodoni Moda'),serif", fontWeight: 400, fontSize: 18, color: "#fff", margin: "0 0 4px", lineHeight: 1.25 }}>{video.title}</h3>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>{video.duration}</div>
      </div>
    </div>
  );
}

function ProductItem({ product }) {
  const [hov, setHov] = useState(false);
  return (
    <Link
      href={`/product/${product.slug || product.id}`}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ display: "block", flexShrink: 0, textDecoration: "none" }}
    >
      <img
        src={product.image}
        alt={product.name || product.brand || ''}
        style={{
          display: "block",
          width: 110, height: 110,
          objectFit: "cover",
          borderRadius: 12,
          border: hov ? "2px solid rgba(255,255,255,.85)" : "2px solid rgba(255,255,255,.22)",
          transform: hov ? "scale(1.12)" : "scale(1)",
          transition: "transform .22s ease, border-color .22s ease",
          cursor: "pointer",
        }}
      />
    </Link>
  );
}

function ProductMobileItem({ product }) {
  return (
    <Link
      href={`/product/${product.slug || product.id}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{ flexShrink: 0, textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 7, width: 90 }}
    >
      <img
        src={product.image}
        alt={product.name || product.brand || ''}
        style={{ width: 82, height: 82, objectFit: "cover", borderRadius: 10, border: "2px solid rgba(255,255,255,.25)" }}
      />
      <span style={{ fontSize: 10, color: "rgba(255,255,255,.7)", textAlign: "center", lineHeight: 1.3, width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {product.name || product.brand}
      </span>
    </Link>
  );
}

function ProductPanel({ products }) {
  if (!products || !products.length) return null;
  return (
    <div style={{
      width: 150,
      height: "100vh",
      overflowY: "auto",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 14,
      paddingTop: "11vh",
      paddingRight: 20,
      paddingLeft: 12,
      paddingBottom: "11vh",
      scrollbarWidth: "none",
      msOverflowStyle: "none",
      boxSizing: "border-box",
    }}>
      {products.map((p) => <ProductItem key={p.id} product={p} />)}
    </div>
  );
}

const CARD_H   = 78;
const CARD_TOP = 11;
const SPACING  = 84;

function buildWindow(allVideos, centerIdx) {
  return [-2, -1, 0, 1, 2].map((o) => allVideos[centerIdx + o] ?? null);
}

function VideoModal({ video, onClose, allVideos, currentIndex, onNext, onPrev }) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const [offsetY, setOffsetY] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [windowVideos, setWindowVideos] = useState(() => buildWindow(allVideos, currentIndex));
  const animatingRef  = useRef(false);
  const accumulated   = useRef(0);
  const accumTimer    = useRef(null);
  const dragStart     = useRef(null);
  const SCROLL_THRESH = 120;

  // Mobile swipe state
  const swipeStart      = useRef(null);
  const [swipeX, setSwipeX]             = useState(0);
  const [swipeAnimating, setSwipeAnimating] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const slideToNext = () => {
    if (animatingRef.current || currentIndex >= allVideos.length - 1) return;
    animatingRef.current = true;
    setAnimating(true);
    setOffsetY(-SPACING);
    setTimeout(() => {
      const newCenter = currentIndex + 1;
      setWindowVideos(buildWindow(allVideos, newCenter));
      setOffsetY(0);
      setAnimating(false);
      animatingRef.current = false;
      onNext();
    }, 350);
  };

  const slideToPrev = () => {
    if (animatingRef.current || currentIndex <= 0) return;
    animatingRef.current = true;
    setAnimating(true);
    setOffsetY(SPACING);
    setTimeout(() => {
      const newCenter = currentIndex - 1;
      setWindowVideos(buildWindow(allVideos, newCenter));
      setOffsetY(0);
      setAnimating(false);
      animatingRef.current = false;
      onPrev();
    }, 350);
  };

  const handleWheel = (e) => {
    if (accumTimer.current) clearTimeout(accumTimer.current);
    accumTimer.current = setTimeout(() => { accumulated.current = 0; }, 200);
    accumulated.current += e.deltaY;
    if (accumulated.current >= SCROLL_THRESH) {
      accumulated.current -= SCROLL_THRESH;
      slideToNext();
    } else if (accumulated.current <= -SCROLL_THRESH) {
      accumulated.current += SCROLL_THRESH;
      slideToPrev();
    }
  };

  const handlePointerDown = (e) => { dragStart.current = e.clientY; };
  const handlePointerUp   = (e) => {
    if (dragStart.current == null) return;
    const delta = e.clientY - dragStart.current;
    if (delta > 60) slideToPrev(); else if (delta < -60) slideToNext();
    dragStart.current = null;
  };

  useEffect(() => {
    if (!video) return;
    const onKey = (e) => {
      if      (e.key === "Escape")    onClose();
      else if (e.key === "ArrowUp")   slideToPrev();
      else if (e.key === "ArrowDown") slideToNext();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [video, currentIndex, animating]);

  // keep desktop window in sync when currentIndex changes externally
  useEffect(() => {
    setWindowVideos(buildWindow(allVideos, currentIndex));
  }, [currentIndex]);

  // reset swipe offset when video changes
  useEffect(() => {
    setSwipeX(0);
    setSwipeAnimating(false);
  }, [video?.id]);

  const handleTouchStart = (e) => {
    swipeStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchMove = (e) => {
    if (!swipeStart.current) return;
    const dx = e.touches[0].clientX - swipeStart.current.x;
    const dy = e.touches[0].clientY - swipeStart.current.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      e.preventDefault();
      setSwipeX(dx * 0.6); // dampen drag so it feels resistive
    }
  };

  const handleTouchEnd = (e) => {
    if (!swipeStart.current) return;
    const dx = e.changedTouches[0].clientX - swipeStart.current.x;
    const dy = e.changedTouches[0].clientY - swipeStart.current.y;
    swipeStart.current = null;
    const canNext = currentIndex < allVideos.length - 1;
    const canPrev = currentIndex > 0;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0 && canNext) {
        setSwipeAnimating(true);
        setSwipeX(-window.innerWidth);
        setTimeout(() => { onNext(); setSwipeX(0); setSwipeAnimating(false); }, 300);
      } else if (dx > 0 && canPrev) {
        setSwipeAnimating(true);
        setSwipeX(window.innerWidth);
        setTimeout(() => { onPrev(); setSwipeX(0); setSwipeAnimating(false); }, 300);
      } else {
        setSwipeAnimating(true);
        setSwipeX(0);
        setTimeout(() => setSwipeAnimating(false), 300);
      }
    } else {
      setSwipeAnimating(true);
      setSwipeX(0);
      setTimeout(() => setSwipeAnimating(false), 300);
    }
  };

  if (!video) return null;

  /* ── Mobile layout ── */
  if (isMobile) {
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < allVideos.length - 1;
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "#000",
        display: "flex", flexDirection: "column",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}>
        {/* Close */}
        <button onClick={onClose} aria-label="Close" style={{
          position: "absolute", top: 14, right: 14, zIndex: 10,
          width: 40, height: 40, borderRadius: "50%",
          background: "rgba(255,255,255,.18)", border: "none",
          color: "#fff", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
        }}>✕</button>

        {/* Video — 9:16 aspect ratio, swipeable */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            width: "100%", aspectRatio: "9/16", maxHeight: "62vh", flexShrink: 0, position: "relative",
            transform: `translateX(${swipeX}px)`,
            transition: swipeAnimating ? "transform .3s cubic-bezier(.22,.61,.36,1)" : "none",
            touchAction: "pan-y",
          }}
        >
          <VideoPlayer video={video} />
          {/* Swipe hint arrows */}
          {hasPrev && swipeX > 10 && (
            <div style={{
              position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
              color: "rgba(255,255,255,.7)", fontSize: 28, pointerEvents: "none", zIndex: 20,
            }}>‹</div>
          )}
          {hasNext && swipeX < -10 && (
            <div style={{
              position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
              color: "rgba(255,255,255,.7)", fontSize: 28, pointerEvents: "none", zIndex: 20,
            }}>›</div>
          )}
        </div>

        {/* Prev / Next navigation */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px 10px", borderBottom: "1px solid rgba(255,255,255,.1)",
        }}>
          <button
            onClick={() => { if (hasPrev) onPrev(); }}
            disabled={!hasPrev}
            style={{
              display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
              color: hasPrev ? "rgba(255,255,255,.85)" : "rgba(255,255,255,.25)",
              fontSize: 13, fontWeight: 500, cursor: hasPrev ? "pointer" : "default", padding: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Prev
          </button>
          <span style={{ color: "rgba(255,255,255,.45)", fontSize: 12, letterSpacing: ".06em" }}>
            {currentIndex + 1} / {allVideos.length}
          </span>
          <button
            onClick={() => { if (hasNext) onNext(); }}
            disabled={!hasNext}
            style={{
              display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
              color: hasNext ? "rgba(255,255,255,.85)" : "rgba(255,255,255,.25)",
              fontSize: 13, fontWeight: 500, cursor: hasNext ? "pointer" : "default", padding: 0,
            }}
          >
            Next
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        {/* Products */}
        {video.products && video.products.length > 0 && (
          <div style={{ padding: "18px 0 28px" }}>
            <div style={{
              fontSize: 10, letterSpacing: ".28em", textTransform: "uppercase",
              color: "var(--accent, #cf8a32)", fontWeight: 700, padding: "0 20px 14px",
            }}>
              Shop the look
            </div>
            <div style={{
              display: "flex", gap: 14,
              overflowX: "auto", WebkitOverflowScrolling: "touch",
              paddingLeft: 20, paddingRight: 20,
              scrollbarWidth: "none", msOverflowStyle: "none",
            }}>
              {video.products.map((p) => <ProductMobileItem key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── Desktop layout (unchanged) ── */
  return (
    <div
      onWheel={handleWheel}
      style={{
        position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,.65)", backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}
    >
      <button onClick={onClose} aria-label="Close video" style={{
        position: "fixed", top: 20, right: 20, zIndex: 301,
        width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,.2)",
        color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, backdropFilter: "blur(6px)", transition: "background .2s", border: "none", cursor: "pointer"
      }} onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,.4)"}
         onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,.2)"}>
        ✕
      </button>

      <div style={{ position: "relative" }} onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ position: "absolute", right: "100%", top: 0, height: "100vh" }}>
          <ProductPanel products={video.products} />
        </div>
        <div style={{
          position: "relative", width: "80vw", height: "100vh", maxWidth: "480px",
          background: "transparent", overflow: "hidden",
        }}>
          <div
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}
          >
            <div style={{
              position: "absolute", inset: 0,
              transition: animating ? `transform .35s cubic-bezier(.22,.61,.36,1)` : "none",
              transform: `translateY(${offsetY}%)`
            }}>
              {windowVideos.map((v, slotIndex) => {
                if (!v) return null;
                const position = slotIndex - 2;
                const isCurrent = position === 0;
                return (
                  <div
                    key={v.id}
                    style={{
                      position: "absolute", left: 0, width: "100%",
                      height: `${CARD_H}vh`,
                      top: `${CARD_TOP}vh`,
                      borderRadius: 18,
                      overflow: "hidden",
                      transform: `translateY(calc(${position} * ${SPACING}vh))`,
                      opacity: isCurrent ? 1 : 0.38,
                      filter: isCurrent ? "none" : "blur(2.5px)",
                      transition: animating ? "opacity .35s ease, filter .35s ease" : "none"
                    }}
                  >
                    <VideoPlayer video={v} isActive={isCurrent} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VideoCard({ video, onPlay }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className="vid-card"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onPlay(video)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onPlay(video); }}
      aria-label={`Watch: ${video.title}`}
    >
      <div className="vid-thumb">
        <img src={video.thumb} alt={video.title} loading="lazy" />
        <div className={"vid-overlay" + (hover ? " show" : "")}>
          <div className="vid-play-btn">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
        <span className="vid-dur">{video.duration}</span>
        <span className="vid-tag-pill" style={{ background: TAG_COLORS_V[video.tag] || "var(--accent)" }}>{video.tag}</span>
      </div>
      <div className="vid-info">
        <h3>{video.title}</h3>
      </div>
    </div>
  );
}

export function VideoSection({ videos }) {
  const allVideos = videos || [];
  const scrollRef = useRef(null);
  const [active, setActive] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const updateArrows = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 340, behavior: "smooth" });
    setTimeout(updateArrows, 350);
  };

  const goToVideo = (v) => {
    const idx = allVideos.findIndex((vid) => vid.id === v.id);
    setActiveIndex(idx >= 0 ? idx : 0);
    setActive(v);
  };

  const nextVideo = () => {
    const next = (activeIndex + 1) % allVideos.length;
    setActiveIndex(next);
    setActive(allVideos[next]);
  };

  const prevVideo = () => {
    const prev = (activeIndex - 1 + allVideos.length) % allVideos.length;
    setActiveIndex(prev);
    setActive(allVideos[prev]);
  };

  return (
    <section className="video-section">
      <div className="wrap">
        <div className="vid-head">
          <div>
            <span className="eyebrow">Watch & Discover</span>
            <h2>Videos</h2>
          </div>
          <div className="vid-head-right">
            <Link href="/guides" className="vid-see-all">See all videos →</Link>
            <div className="vid-arrows">
              <button className={"vid-arrow" + (!canLeft ? " disabled" : "")} onClick={() => scroll(-1)} aria-label="Previous">
                <I.back />
              </button>
              <button className={"vid-arrow" + (!canRight ? " disabled" : "")} onClick={() => scroll(1)} aria-label="Next">
                <I.back style={{ transform: "rotate(180deg)" }} />
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="vid-scroll-outer">
        <div
          className="vid-scroll"
          ref={scrollRef}
          onScroll={updateArrows}
          style={{ paddingRight: "10vw", scrollPaddingLeft: 0 }}
        >
          {allVideos.map((v) => (
            <VideoCard key={v.id} video={v} onPlay={goToVideo} />
          ))}
        </div>
      </div>
      <VideoModal video={active} onClose={() => setActive(null)} allVideos={allVideos} currentIndex={activeIndex} onNext={nextVideo} onPrev={prevVideo} />
    </section>
  );
}

export function VideoGrid({ videos }) {
  const allVideos = videos || [];
  const [shown, setShown] = useState(6);
  const [active, setActive] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const visible = allVideos.slice(0, shown);
  const hasMore = shown < allVideos.length;

  const goToVideo = (v) => {
    const idx = allVideos.findIndex((vid) => vid.id === v.id);
    setActiveIndex(idx >= 0 ? idx : 0);
    setActive(v);
  };

  const nextVideo = () => {
    const next = (activeIndex + 1) % allVideos.length;
    setActiveIndex(next);
    setActive(allVideos[next]);
  };

  const prevVideo = () => {
    const prev = (activeIndex - 1 + allVideos.length) % allVideos.length;
    setActiveIndex(prev);
    setActive(allVideos[prev]);
  };

  return (
    <section style={{ background: "var(--brand-deep)", padding: "52px 0 60px" }}>
      <div className="wrap">
        <div className="vid-head" style={{ marginBottom: 32 }}>
          <div>
            <span className="eyebrow" style={{ color: "var(--accent-soft)" }}>Watch</span>
            <h2 style={{ fontFamily: "var(--font-display,'Bodoni Moda'),serif", fontWeight: 500, fontSize: "clamp(26px,3vw,36px)", color: "#fff", margin: 0 }}>All Videos</h2>
          </div>
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 20,
        }}>
          {visible.map((v) => (
            <VideoCard key={v.id} video={v} onPlay={goToVideo} />
          ))}
        </div>
        {hasMore && (
          <div style={{ textAlign: "center", marginTop: 40 }}>
            <button
              onClick={() => setShown((s) => Math.min(s + 6, allVideos.length))}
              style={{
                display: "inline-flex", alignItems: "center", gap: 9,
                background: "rgba(255,255,255,.1)", color: "#fff",
                border: "1px solid rgba(255,255,255,.28)", borderRadius: 8,
                padding: "13px 28px", fontSize: 14, fontWeight: 600,
                letterSpacing: ".06em", textTransform: "uppercase",
                cursor: "pointer", transition: "background .2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,.18)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,.1)"}
            >
              Show more videos
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 10 }}>
              Showing {shown} of {allVideos.length} videos
            </div>
          </div>
        )}
      </div>
      <VideoModal video={active} onClose={() => setActive(null)} allVideos={allVideos} currentIndex={activeIndex} onNext={nextVideo} onPrev={prevVideo} />
    </section>
  );
}

export default VideoSection;
