import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../../api';
import './Services.css';

export default function Services() {
  const [services, setServices] = useState([]);

  useEffect(() => {
    apiGet('/services').then(setServices);
  }, []);

  return (
    <div className="services-page">
      <section className="page-hero">
        <div className="container">
          <span className="hero-badge">Professional Landscaping</span>
          <h1>Our Services</h1>
          <p>Comprehensive landscaping solutions tailored to your needs and budget.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="services-full-grid">
            {services.map((service) => (
              <div key={service.id} className="service-full-card service-full-card-col">
                {(service.image_before || service.image_after) && (
                  <div className="service-ba-gallery">
                    {service.image_before && (
                      <div className="service-ba-item">
                        <span className="service-ba-label">Before</span>
                        <img src={service.image_before} alt={`${service.name} before`} />
                      </div>
                    )}
                    {service.image_after && (
                      <div className="service-ba-item">
                        <span className="service-ba-label service-ba-label-after">After</span>
                        <img src={service.image_after} alt={`${service.name} after`} />
                      </div>
                    )}
                  </div>
                )}
                <div className="service-full-body">
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
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section process-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">How It Works</span>
            <h2>Our Process</h2>
            <p>From concept to completion, we make it simple and transparent.</p>
          </div>
          <div className="process-steps">
            <div className="process-step">
              <div className="step-number">1</div>
              <h3>Consultation</h3>
              <p>We visit your property, discuss your vision, and assess the landscape to understand your needs.</p>
            </div>
            <div className="process-connector" />
            <div className="process-step">
              <div className="step-number">2</div>
              <h3>Design</h3>
              <p>Our team creates a custom design plan with detailed proposals and transparent pricing.</p>
            </div>
            <div className="process-connector" />
            <div className="process-step">
              <div className="step-number">3</div>
              <h3>Installation</h3>
              <p>Expert crews bring the design to life with quality materials and careful craftsmanship.</p>
            </div>
            <div className="process-connector" />
            <div className="process-step">
              <div className="step-number">4</div>
              <h3>Delivery</h3>
              <p>We deliver and install all materials, plants, and features right to your property with care.</p>
            </div>
          </div>
        </div>
      </section>

      {/* What to Expect - Transparency */}
      <section className="section expect-section">
        <div className="container">
          <div className="expect-grid">
            <div className="expect-content">
              <span className="section-tag">What to Expect</span>
              <h2>Transparent From Start to Finish</h2>
              <p>
                We know that a landscaping project can feel like a big undertaking. That's why
                we walk you through every step so there are no surprises.
              </p>
              <div className="expect-items">
                <div className="expect-item">
                  <div className="expect-item-icon">&#128221;</div>
                  <div>
                    <h4>Detailed Written Estimates</h4>
                    <p>Every project starts with a clear, itemized quote so you know exactly what you're paying for.</p>
                  </div>
                </div>
                <div className="expect-item">
                  <div className="expect-item-icon">&#128197;</div>
                  <div>
                    <h4>Clear Timelines</h4>
                    <p>We provide realistic schedules and keep you updated throughout the entire process.</p>
                  </div>
                </div>
                <div className="expect-item">
                  <div className="expect-item-icon">&#128222;</div>
                  <div>
                    <h4>Dedicated Point of Contact</h4>
                    <p>One person manages your project from start to finish so communication is always easy.</p>
                  </div>
                </div>
                <div className="expect-item">
                  <div className="expect-item-icon">&#10003;</div>
                  <div>
                    <h4>Post-Install Walkthrough</h4>
                    <p>We review the completed work with you and make sure everything meets your expectations.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Service Area */}
      <section className="section service-area-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Service Area</span>
            <h2>Serving Central Florida</h2>
            <p>Proud to serve the greater Orlando area and surrounding communities.</p>
          </div>
          <div className="service-area-grid">
            {['Orlando', 'Winter Park', 'Windermere', 'Lake Nona', 'Sorrento', 'Sanford', 'Clermont', 'Ocoee'].map(city => (
              <div key={city} className="service-area-tag">
                <span className="area-dot" />
                {city}, FL
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section cta-section">
        <div className="container">
          <h2>Ready to Transform Your Property?</h2>
          <p>Get a free consultation and detailed estimate for your project. No obligation.</p>
          <div className="cta-actions">
            <Link to="/contact" className="btn btn-primary btn-lg">Get Free Consultation</Link>
            <a href="tel:3212312094" className="btn btn-outline btn-lg cta-phone-btn">Call (321) 231-2094</a>
          </div>
        </div>
      </section>
    </div>
  );
}
