import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../../api';
import SEO from '../../components/SEO';
import './Portfolio.css';

export default function Portfolio() {
  const [services, setServices] = useState([]);
  const [lightbox, setLightbox] = useState(null); // { src, alt }

  useEffect(() => {
    apiGet('/services').then(data => {
      // Keep services that have any before/after images (primary or additional)
      setServices(data.filter(s =>
        s.image_before || s.image_after || (s.images && s.images.length > 0)
      ));
    });
  }, []);

  const openLightbox = (src, alt) => setLightbox({ src, alt });
  const closeLightbox = useCallback(() => setLightbox(null), []);

  useEffect(() => {
    if (!lightbox) return;
    const handleKey = (e) => { if (e.key === 'Escape') closeLightbox(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [lightbox, closeLightbox]);

  // Build all image pairs for a service (primary + additional)
  const getAllPairs = (service) => {
    const pairs = [];
    if (service.image_before || service.image_after) {
      pairs.push({ id: 'primary', image_before: service.image_before, image_after: service.image_after });
    }
    for (const img of (service.images || [])) {
      pairs.push(img);
    }
    return pairs;
  };

  return (
    <div className="portfolio-page">
      <SEO title="Landscaping Portfolio & Before-After Gallery" description="See real transformation results from our landscaping projects across Central Florida. Browse before-and-after photos of landscape designs." path="/portfolio" />
      <section className="page-hero">
        <div className="container">
          <span className="hero-badge">Portfolio</span>
          <h1>Our Transformations</h1>
          <p>See the difference professional landscaping makes. Browse our before-and-after gallery showcasing real projects across Central Florida.</p>
        </div>
      </section>

      {services.length > 0 && (
        <section className="section portfolio-services-ba">
          <div className="container">
            <div className="section-header">
              <span className="section-tag">Before &amp; After</span>
              <h2>Service Transformations</h2>
              <p>Real results from our landscaping services.</p>
            </div>
            {services.map(service => {
              const pairs = getAllPairs(service);
              return (
                <div key={service.id} className="portfolio-service-group">
                  <h3 className="portfolio-service-name">{service.name}</h3>
                  <div className="portfolio-ba-grid">
                    {pairs.map(pair => (
                      <div key={pair.id} className="portfolio-ba-card">
                        <div className="portfolio-ba-images">
                          {pair.image_before && (
                            <div
                              className="portfolio-ba-item portfolio-ba-clickable"
                              onClick={() => openLightbox(pair.image_before, `${service.name} before`)}
                            >
                              <span className="portfolio-ba-label">Before</span>
                              <img src={pair.image_before} alt={`${service.name} before`} />
                              <div className="portfolio-ba-zoom">&#x2922;</div>
                            </div>
                          )}
                          {pair.image_after && (
                            <div
                              className="portfolio-ba-item portfolio-ba-clickable"
                              onClick={() => openLightbox(pair.image_after, `${service.name} after`)}
                            >
                              <span className="portfolio-ba-label portfolio-ba-label-after">After</span>
                              <img src={pair.image_after} alt={`${service.name} after`} />
                              <div className="portfolio-ba-zoom">&#x2922;</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="portfolio-lightbox-overlay" onClick={closeLightbox}>
          <button className="portfolio-lightbox-close" onClick={closeLightbox}>&times;</button>
          <img
            src={lightbox.src}
            alt={lightbox.alt}
            className="portfolio-lightbox-img"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      <section className="section portfolio-cta">
        <div className="container">
          <h2>Ready to Transform Your Space?</h2>
          <p>Let us bring the same level of craftsmanship to your property.</p>
          <div className="portfolio-cta-actions">
            <Link to="/contact" className="btn btn-primary btn-lg">Get Free Consultation</Link>
            <Link to="/services" className="btn btn-outline btn-lg">View Services</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
