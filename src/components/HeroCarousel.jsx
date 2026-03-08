import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import './HeroCarousel.css';

/* Static fallback images bundled in assets/carousel */
const imageModules = import.meta.glob('../assets/carousel/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
});

const afterImages = Object.entries(imageModules)
  .filter(([path]) => path.includes('after'))
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, url]) => url);

const defaultSlides = [
  {
    image: afterImages[0],
    badge: "Residential Landscapes",
    headline: "Transform Your Backyard Into a Living Masterpiece",
    subtext: "Custom design, expert installation, and reliable delivery for Central Florida homes.",
    cta_label: "Get Free Quote", cta_link: "/quote",
    cta2_label: "View Portfolio", cta2_link: "/portfolio",
  },
  {
    image: afterImages[1],
    badge: "Commercial Properties",
    headline: "Professional Grounds That Make a Lasting Impression",
    subtext: "Comprehensive commercial landscaping for offices, retail centers, and mixed-use developments.",
    cta_label: "Request a Quote", cta_link: "/quote",
    cta2_label: "Our Services", cta2_link: "/services",
  },
  {
    image: afterImages[2],
    badge: "Design & Build",
    headline: "From Concept to Completion — One Trusted Partner",
    subtext: "Full-service landscape architecture, hardscaping, and planting by our expert team.",
    cta_label: "Start Your Project", cta_link: "/quote",
    cta2_label: "See Our Work", cta2_link: "/about",
  },
  {
    image: afterImages[3],
    badge: "Delivery & Installation",
    headline: "We Deliver and Install — You Enjoy the Results",
    subtext: "From plants and trees to sod and materials, we handle delivery and professional installation across Central Florida.",
    cta_label: "Schedule Service", cta_link: "/quote",
    cta2_label: "Learn More", cta2_link: "/services",
  },
].filter((s) => s.image);

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [slides, setSlides] = useState(defaultSlides);

  useEffect(() => {
    fetch('/api/hero-slides')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const active = data.filter(s => s.active && s.image).map(s => ({
          ...s,
          cta_link: (!s.cta_link || s.cta_link === '/login') ? '/quote' : s.cta_link,
        }));
        if (active.length > 0) setSlides(active);
      })
      .catch(() => { /* keep defaults */ });
  }, []);

  const total = slides.length;
  const goNext = useCallback(() => setCurrent((c) => (c + 1) % total), [total]);
  const goPrev = useCallback(() => setCurrent((c) => (c - 1 + total) % total), [total]);

  useEffect(() => {
    if (paused || total <= 1) return;
    const id = setInterval(goNext, 6000);
    return () => clearInterval(id);
  }, [paused, goNext, total]);

  // Reset current if it exceeds slide count after API load
  useEffect(() => {
    setCurrent(0);
  }, [slides]);

  if (total === 0) return null;

  return (
    <section
      className="hero-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      {slides.map((slide, i) => (
        <div
          key={slide.id || i}
          className={`hero-slide ${i === current ? 'active' : ''}`}
          aria-hidden={i !== current}
        >
          <img src={slide.image} alt="" className="hero-slide-img" />
          <div className="hero-slide-overlay" />
          <div className="hero-slide-content">
            {slide.badge && <span className="hero-badge">{slide.badge}</span>}
            {slide.headline && <h1>{slide.headline}</h1>}
            {slide.subtext && <p>{slide.subtext}</p>}
            <div className="hero-actions">
              {slide.cta_label && (
                <Link to={slide.cta_link || '/quote'} className="btn btn-primary btn-lg">
                  {slide.cta_label}
                </Link>
              )}
              {slide.cta2_label && slide.cta2_link && (
                <Link to={slide.cta2_link} className="btn btn-outline btn-lg">
                  {slide.cta2_label}
                </Link>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Arrows */}
      {total > 1 && (
        <>
          <button className="hero-arrow hero-arrow-left" onClick={goPrev} aria-label="Previous slide">
            &#8249;
          </button>
          <button className="hero-arrow hero-arrow-right" onClick={goNext} aria-label="Next slide">
            &#8250;
          </button>
        </>
      )}

      {/* Dots */}
      {total > 1 && (
        <div className="hero-dots">
          {slides.map((_, i) => (
            <button
              key={i}
              className={`hero-dot ${i === current ? 'active' : ''}`}
              onClick={() => setCurrent(i)}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}

    </section>
  );
}
