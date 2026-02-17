import { useState, useEffect } from 'react';
import './BeforeAfterCarousel.css';

const imageFiles = [
  'backyard-after.svg',
  'backyard-before.svg',
  'commercial-after.svg',
  'commercial-before.svg',
  'frontyard-after.svg',
  'frontyard-before.svg',
  'patio-after.svg',
  'patio-before.svg',
].sort();

const titles = {
  backyard: 'Backyard Retreat',
  commercial: 'Commercial Property',
  frontyard: 'Front Yard Makeover',
  patio: 'Patio & Hardscaping',
};

const beforeLabels = {
  backyard: 'Overgrown & Neglected',
  commercial: 'Unkempt Landscape',
  frontyard: 'Bare & Patchy Lawn',
  patio: 'Cracked Concrete',
};

const afterLabels = {
  backyard: 'Lush Garden Oasis',
  commercial: 'Professional Grounds',
  frontyard: 'Manicured Curb Appeal',
  patio: 'Elegant Stone Patio',
};

const slides = imageFiles.map((file, index) => {
  const [property, variant] = file.replace('.svg', '').split('-');
  return {
    id: index + 1,
    property,
    variant,
    title: titles[property] || property,
    label: variant === 'before' ? beforeLabels[property] : afterLabels[property],
    img: `/images/carousel/${file}`,
  };
});

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

        <div className="carousel-single">
          <div className="carousel-image-wrapper">
            <img src={slide.img} alt={`${slide.variant === 'before' ? 'Before' : 'After'}: ${slide.label}`} className="carousel-img" />
            <div className={`carousel-label carousel-label-${slide.variant}`}>
              {slide.variant === 'before' ? 'Before' : 'After'}
            </div>
            <p className="carousel-description">{slide.label}</p>
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
