import { useState, useEffect } from 'react';
import './BeforeAfterCarousel.css';

const slides = [
  {
    id: 1,
    title: 'Backyard Retreat',
    beforeLabel: 'Overgrown & Neglected',
    afterLabel: 'Lush Garden Oasis',
    beforeColor: '#8B7355',
    afterColor: '#2d7a4a',
  },
  {
    id: 2,
    title: 'Front Yard Makeover',
    beforeLabel: 'Bare & Patchy Lawn',
    afterLabel: 'Manicured Curb Appeal',
    beforeColor: '#9B8B6E',
    afterColor: '#3a8f5c',
  },
  {
    id: 3,
    title: 'Patio & Hardscaping',
    beforeLabel: 'Cracked Concrete',
    afterLabel: 'Elegant Stone Patio',
    beforeColor: '#7A7A7A',
    afterColor: '#1a472a',
  },
  {
    id: 4,
    title: 'Commercial Property',
    beforeLabel: 'Unkempt Landscape',
    afterLabel: 'Professional Grounds',
    beforeColor: '#A0926B',
    afterColor: '#2E8B57',
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
            <div
              className="carousel-placeholder"
              style={{ background: slide.beforeColor }}
            >
              {/* Replace this div with: <img src="/images/before-1.jpg" alt="Before" /> */}
              <span className="carousel-placeholder-icon">&#9744;</span>
              <span className="carousel-placeholder-text">Before Photo</span>
            </div>
            <div className="carousel-label carousel-label-before">Before</div>
            <p className="carousel-description">{slide.beforeLabel}</p>
          </div>

          <div className="carousel-image-wrapper">
            <div
              className="carousel-placeholder"
              style={{ background: slide.afterColor }}
            >
              {/* Replace this div with: <img src="/images/after-1.jpg" alt="After" /> */}
              <span className="carousel-placeholder-icon">&#9752;</span>
              <span className="carousel-placeholder-text">After Photo</span>
            </div>
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
