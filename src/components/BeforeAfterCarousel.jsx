import { useState, useEffect } from 'react';
import './BeforeAfterCarousel.css';

const imageModules = import.meta.glob('../assets/carousel/*.{png,jpg,jpeg,svg,webp}', {
  eager: true,
  import: 'default',
});

const slides = Object.entries(imageModules)
  .map(([path, url]) => {
    const filename = path.split('/').pop();
    return { filename, url };
  })
  .sort((a, b) => a.filename.localeCompare(b.filename))
  .map((entry, index) => ({
    id: index + 1,
    img: entry.url,
    name: entry.filename.replace(/\.[^.]+$/, ''),
  }));

export default function BeforeAfterCarousel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  if (slides.length === 0) {
    return null;
  }

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
