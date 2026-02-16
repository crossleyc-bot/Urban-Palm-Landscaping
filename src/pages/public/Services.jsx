import { Link } from 'react-router-dom';
import { services } from '../../data/mockData';
import './Services.css';

export default function Services() {
  return (
    <div className="services-page">
      <section className="page-hero">
        <div className="container">
          <h1>Our Services</h1>
          <p>Comprehensive landscaping solutions tailored to your needs and budget.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="services-full-grid">
            {services.map((service) => (
              <div key={service.id} className="service-full-card">
                <div className="service-full-icon">{service.icon}</div>
                <div className="service-full-content">
                  <h3>{service.name}</h3>
                  <p>{service.description}</p>
                  <div className="service-full-footer">
                    <span className="service-price">{service.price}</span>
                    <Link to="/contact" className="btn btn-secondary btn-sm">Get Quote</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section process-section">
        <div className="container">
          <div className="section-header">
            <h2>Our Process</h2>
            <p>From concept to completion, we make it simple.</p>
          </div>
          <div className="process-steps">
            <div className="process-step">
              <div className="step-number">1</div>
              <h3>Consultation</h3>
              <p>We visit your property, discuss your vision, and assess the landscape.</p>
            </div>
            <div className="process-step">
              <div className="step-number">2</div>
              <h3>Design</h3>
              <p>Our team creates a custom design plan with detailed proposals.</p>
            </div>
            <div className="process-step">
              <div className="step-number">3</div>
              <h3>Installation</h3>
              <p>Expert crews bring the design to life with quality materials.</p>
            </div>
            <div className="process-step">
              <div className="step-number">4</div>
              <h3>Maintenance</h3>
              <p>Ongoing care to keep your landscape looking its best year-round.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
