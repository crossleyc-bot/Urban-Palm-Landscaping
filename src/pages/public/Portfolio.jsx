import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../../api';
import BeforeAfterCarousel from '../../components/BeforeAfterCarousel';
import './Portfolio.css';

export default function Portfolio() {
  const [services, setServices] = useState([]);

  useEffect(() => {
    apiGet('/services').then(data => {
      setServices(data.filter(s => s.image_before || s.image_after));
    });
  }, []);

  return (
    <div className="portfolio-page">
      <section className="portfolio-hero">
        <div className="container">
          <span className="section-tag">Portfolio</span>
          <h1>Our Transformations</h1>
          <p>See the difference professional landscaping makes. Browse our before-and-after gallery showcasing real projects across Central Florida.</p>
        </div>
      </section>

      <section className="section carousel-section">
        <div className="container">
          <BeforeAfterCarousel />
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
            <div className="portfolio-ba-grid">
              {services.map(service => (
                <div key={service.id} className="portfolio-ba-card">
                  <div className="portfolio-ba-images">
                    {service.image_before && (
                      <div className="portfolio-ba-item">
                        <span className="portfolio-ba-label">Before</span>
                        <img src={service.image_before} alt={`${service.name} before`} />
                      </div>
                    )}
                    {service.image_after && (
                      <div className="portfolio-ba-item">
                        <span className="portfolio-ba-label portfolio-ba-label-after">After</span>
                        <img src={service.image_after} alt={`${service.name} after`} />
                      </div>
                    )}
                  </div>
                  <div className="portfolio-ba-info">
                    <h3>{service.name}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
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
