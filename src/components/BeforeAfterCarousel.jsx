import { useState, useEffect } from 'react';
import './BeforeAfterCarousel.css';

const imageFiles = [
  'backyard-after.png',
  'backyard-before.png',
  'commercial-after.png',
  'commercial-before.png',
  'frontyard-after.png',
  'frontyard-before.png',
  'patio-after.png',
  'patio-before.png',
].sort();

const slides = imageFiles.map((file, index) => ({
  id: index + 1,
  img: `/images/carousel/${file}`,
  name: file.replace(/\.[^.]+$/, ''),
}));

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
      <div className="carousel-viewport">
        <button className="carousel-arrow carousel-arrow-left" onClick={prev} aria-label="Previous slide">
          &#8249;
        </button>

        <div className="carousel-single">
          <div className="carousel-image-wrapper">
            <img src={slide.img} alt={slide.name} className="carousel-img" />
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
