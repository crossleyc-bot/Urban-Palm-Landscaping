import { useState, useEffect } from 'react';
import './BeforeAfterCarousel.css';

const slides = [
  {
    id: 1,
    title: 'Backyard Retreat',
    beforeLabel: 'Overgrown & Neglected',
    afterLabel: 'Lush Garden Oasis',
    beforeImg: '/images/backyard-before.svg',
    afterImg: '/images/backyard-after.svg',
  },
  {
    id: 2,
    title: 'Front Yard Makeover',
    beforeLabel: 'Bare & Patchy Lawn',
    afterLabel: 'Manicured Curb Appeal',
    beforeImg: '/images/frontyard-before.svg',
    afterImg: '/images/frontyard-after.svg',
  },
  {
    id: 3,
    title: 'Patio & Hardscaping',
    beforeLabel: 'Cracked Concrete',
    afterLabel: 'Elegant Stone Patio',
    beforeImg: '/images/patio-before.svg',
    afterImg: '/images/patio-after.svg',
  },
  {
    id: 4,
    title: 'Commercial Property',
    beforeLabel: 'Unkempt Landscape',
    afterLabel: 'Professional Grounds',
    beforeImg: '/images/commercial-before.svg',
    afterImg: '/images/commercial-after.svg',
  },
];

export default function BeforeAfterCarousel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goTo = (index) => setCurrent(index);
  const prev = () => setCurrent((current - 1 + slides.length) % slides.length);
  const next = () => setCurrent((current + 1) % slides.length);

  const slide = slides[current];

  return (
    <div className="carousel">
      <h3 className="carousel-slide-title">{slide.title}</h3>
      <div className="carousel-viewport">
        <button className="carousel-arrow carousel-arrow-left" onClick={prev} aria-label="Previous slide">
          &#8249;
        </button>

        <div className="carousel-pair">
          <div className="carousel-image-wrapper">
            <img src={slide.beforeImg} alt={`Before: ${slide.beforeLabel}`} className="carousel-img" />
            <div className="carousel-label carousel-label-before">Before</div>
            <p className="carousel-description">{slide.beforeLabel}</p>
          </div>

          <div className="carousel-image-wrapper">
            <img src={slide.afterImg} alt={`After: ${slide.afterLabel}`} className="carousel-img" />
            <div className="carousel-label carousel-label-after">After</div>
            <p className="carousel-description">{slide.afterLabel}</p>
          </div>
        </div>

        <button className="carousel-arrow carousel-arrow-right" onClick={next} aria-label="Next slide">
          &#8250;
        </button>
      </div>

      <div className="carousel-dots">
        {slides.map((s, i) => (
          <button
            key={s.id}
            className={`carousel-dot ${i === current ? 'active' : ''}`}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
