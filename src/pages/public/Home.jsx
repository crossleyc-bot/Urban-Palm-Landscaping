import { Link } from 'react-router-dom';
import { services, testimonials } from '../../data/mockData';
import './Home.css';

export default function Home() {
  return (
    <div className="home">
      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <h1>Transform Your Outdoor Space</h1>
          <p>
            Professional landscaping design, installation, and maintenance
            services that bring your vision to life.
          </p>
          <div className="hero-actions">
            <Link to="/contact" className="btn btn-primary btn-lg">Get Free Quote</Link>
            <Link to="/services" className="btn btn-outline btn-lg">Our Services</Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section features-section">
        <div className="container">
          <div className="section-header">
            <h2>Why Choose Urban Palm</h2>
            <p>We bring expertise, reliability, and passion to every project.</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">&#9733;</div>
              <h3>Expert Team</h3>
              <p>Over 15 years of combined experience in landscape design and horticulture.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">&#9854;</div>
              <h3>Sustainable Practices</h3>
              <p>Eco-friendly solutions that conserve water and support local ecosystems.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">&#10003;</div>
              <h3>Satisfaction Guaranteed</h3>
              <p>We stand behind our work with a comprehensive satisfaction guarantee.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services preview */}
      <section className="section services-preview">
        <div className="container">
          <div className="section-header">
            <h2>Our Services</h2>
            <p>Comprehensive landscaping solutions for residential and commercial properties.</p>
          </div>
          <div className="services-grid">
            {services.slice(0, 3).map((service) => (
              <div key={service.id} className="service-preview-card">
                <div className="service-icon">{service.icon}</div>
                <h3>{service.name}</h3>
                <p>{service.description}</p>
                <span className="service-price">{service.price}</span>
              </div>
            ))}
          </div>
          <div className="section-cta">
            <Link to="/services" className="btn btn-secondary">View All Services</Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section testimonials-section">
        <div className="container">
          <div className="section-header">
            <h2>What Our Clients Say</h2>
            <p>Hear from homeowners who transformed their outdoor spaces with us.</p>
          </div>
          <div className="testimonials-grid">
            {testimonials.map((t) => (
              <div key={t.id} className="testimonial-card">
                <div className="testimonial-stars">
                  {'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}
                </div>
                <p className="testimonial-text">"{t.text}"</p>
                <div className="testimonial-author">— {t.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section cta-section">
        <div className="container">
          <h2>Ready to Get Started?</h2>
          <p>Contact us today for a free consultation and quote.</p>
          <Link to="/contact" className="btn btn-primary btn-lg">Contact Us</Link>
        </div>
      </section>
    </div>
  );
}
