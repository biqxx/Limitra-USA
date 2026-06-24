import { useState, useEffect, useRef } from 'react';

const FALLBACK_SLIDES = [
  {
    id: 'h1',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1920&q=80',
    alt: 'Luxury lifestyle collection',
  },
];

const DURATION = 6000;

export default function HeroCarousel({ slides, settings = {} }) {
  const allSlides = (slides && slides.length) ? slides : FALLBACK_SLIDES;
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState(null);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const progressRef = useRef(null);

  const startTimers = (idx) => {
    clearTimeout(timerRef.current);
    clearInterval(progressRef.current);
    if (allSlides.length <= 1) return;
    const start = Date.now();
    progressRef.current = setInterval(() => {
      setProgress(Math.min(((Date.now() - start) / DURATION) * 100, 100));
    }, 40);
    timerRef.current = setTimeout(() => {
      clearInterval(progressRef.current);
      const next = (idx + 1) % allSlides.length;
      setPrev(idx);
      setCurrent(next);
      setProgress(0);
      setTimeout(() => setPrev(null), 800);
    }, DURATION);
  };

  useEffect(() => {
    startTimers(current);
    return () => { clearTimeout(timerRef.current); clearInterval(progressRef.current); };
  }, [current, allSlides.length]);

  const goTo = (idx) => {
    if (idx === current) return;
    clearTimeout(timerRef.current);
    clearInterval(progressRef.current);
    setPrev(current);
    setCurrent(idx);
    setProgress(0);
    setTimeout(() => setPrev(null), 800);
  };

  const goNext = () => goTo((current + 1) % allSlides.length);
  const goPrev = () => goTo((current - 1 + allSlides.length) % allSlides.length);

  const slide = allSlides[current] || allSlides[0];

  const title    = slide.title    || settings.hero_title    || 'Discover Better Products. Shop Smarter.';
  const subtitle = slide.subtitle || settings.hero_subtitle || 'Editor-vetted fashion, beauty, home & lifestyle picks from trusted retailers, updated weekly.';
  const eyebrow  = slide.eyebrow  || settings.hero_eyebrow  || "Editor's Collection";
  const cta1Text = slide.cta_text || settings.hero_cta_primary || 'Explore Curated Finds';
  const cta1Url  = slide.cta_url  || settings.hero_cta_primary_url || '/collection/new';
  const cta2Text = slide.cta2_text || settings.hero_cta_secondary || '';
  const cta2Url  = slide.cta2_url  || settings.hero_cta_secondary_url || '/guides';

  return (
    <section className="hero">

      {/* Background images with crossfade + Ken Burns */}
      <div className="hero-bg">
        {allSlides.map((s, idx) => (
          <div
            key={s.id || idx}
            className={`hero-slide-bg${idx === current ? ' active' : ''}${idx === prev ? ' leaving' : ''}`}
          >
            {s.image && <img src={s.image} alt={s.alt || ''} fetchpriority={idx === 0 ? 'high' : 'auto'} />}
          </div>
        ))}
      </div>

      {/* Gradient scrim */}
      <div className="hero-scrim" />

      {/* Copy */}
      <div className="hero-inner">
        <div className="wrap">
          <div className="hero-copy">
            {eyebrow && <span className="hero-eyebrow">{eyebrow}</span>}
            <h1>{title.split(/<br\s*\/?>/i).map((seg, i, arr) => (
              <span key={i}>{seg}{i < arr.length - 1 && <br />}</span>
            ))}</h1>
            <p>{subtitle}</p>
            <div className="hero-cta">
              <a href={cta1Url} className="btn btn-primary">{cta1Text}</a>
              {cta2Text && (
                <a href={cta2Url} className="btn btn-hero-ghost">{cta2Text}</a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Arrows */}
      {allSlides.length > 1 && (
        <>
          <button className="hero-arrow hero-arrow-left" onClick={goPrev} aria-label="Previous slide">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button className="hero-arrow hero-arrow-right" onClick={goNext} aria-label="Next slide">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </>
      )}

      {/* Bottom controls */}
      <div className="hero-controls">
        {allSlides.length > 1 && (
          <>
            <span className="hero-counter">
              {String(current + 1).padStart(2, '0')} <span className="hero-counter-sep">/</span> {String(allSlides.length).padStart(2, '0')}
            </span>
            <div className="hero-bars">
              {allSlides.map((s, idx) => (
                <button key={idx} className="hero-bar-btn" onClick={() => goTo(idx)} aria-label={`Slide ${idx + 1}`}>
                  <div className="hero-bar">
                    <div
                      className="hero-bar-fill"
                      style={{ width: idx < current ? '100%' : idx === current ? progress + '%' : '0%' }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Scroll cue */}
      <div className="hero-scroll-cue" aria-hidden="true">
        <div className="hero-scroll-line" />
        <span>Scroll</span>
      </div>

    </section>
  );
}
