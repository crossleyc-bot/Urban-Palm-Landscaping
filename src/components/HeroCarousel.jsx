import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import './HeroCarousel.css';

const imageModules = import.meta.glob('../assets/carousel/*.{png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
});

/* Use the polished "after" images for the hero slides */
const afterImages = Object.entries(imageModules)
  .filter(([path]) => path.includes('after'))
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, url]) => url);

const slides = [
  {
    image: afterImages[0],
    badge: "Residential Landscapes",
    headline: "Transform Your Backyard Into a Living Masterpiece",
    subtext: "Custom design, expert installation, and year-round maintenance for Central Florida homes.",
    cta: { label: "Get Free Consultation", to: "/contact" },
    ctaSecondary: { label: "View Portfolio", to: "/services" },
  },
  {
    image: afterImages[1],
    badge: "Commercial Properties",
    headline: "Professional Grounds That Make a Lasting Impression",
    subtext: "Comprehensive commercial landscaping for offices, retail centers, and mixed-use developments.",
    cta: { label: "Request a Quote", to: "/contact" },
    ctaSecondary: { label: "Our Services", to: "/services" },
  },
  {
    image: afterImages[2],
    badge: "Design & Build",
    headline: "From Concept to Completion — One Trusted Partner",
    subtext: "Full-service landscape architecture, hardscaping, and planting by our expert team.",
    cta: { label: "Start Your Project", to: "/contact" },
    ctaSecondary: { label: "See Our Work", to: "/about" },
  },
  {
    image: afterImages[3],
    badge: "Landscape Maintenance",
    headline: "Keep Your Property Looking Its Best, Every Season",
    subtext: "Proactive maintenance programs tailored to Florida's unique climate and growing conditions.",
    cta: { label: "Schedule Service", to: "/contact" },
    ctaSecondary: { label: "Learn More", to: "/services" },
  },
];

/* Only use slides where the image resolved successfully */
const validSlides = slides.filter((s) => s.image);

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = validSlides.length;

  const goNext = useCallback(() => setCurrent((c) => (c + 1) % total), [total]);
  const goPrev = useCallback(() => setCurrent((c) => (c - 1 + total) % total), [total]);

  useEffect(() => {
    if (paused || total <= 1) return;
    const id = setInterval(goNext, 6000);
    return () => clearInterval(id);
  }, [paused, goNext, total]);

  if (total === 0) return null;

  return (
    <section
      className="hero-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      {validSlides.map((slide, i) => (
        <div
          key={i}
          className={`hero-slide ${i === current ? 'active' : ''}`}
          aria-hidden={i !== current}
        >
          <img src={slide.image} alt="" className="hero-slide-img" />
          <div className="hero-slide-overlay" />
          <div className="hero-slide-content">
            <span className="hero-badge">{slide.badge}</span>
            <h1>{slide.headline}</h1>
            <p>{slide.subtext}</p>
            <div className="hero-actions">
              <Link to={slide.cta.to} className="btn btn-primary btn-lg">
                {slide.cta.label}
              </Link>
              <Link to={slide.ctaSecondary.to} className="btn btn-outline btn-lg">
                {slide.ctaSecondary.label}
              </Link>
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
          {validSlides.map((_, i) => (
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
