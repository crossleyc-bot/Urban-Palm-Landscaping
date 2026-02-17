import { Link } from 'react-router-dom';
import BeforeAfterCarousel from '../../components/BeforeAfterCarousel';
import './Portfolio.css';

export default function Portfolio() {
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
