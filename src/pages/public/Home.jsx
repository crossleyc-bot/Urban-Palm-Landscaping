import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../../api';
import HeroCarousel from '../../components/HeroCarousel';
import './Home.css';

export default function Home() {
  const [services, setServices] = useState([]);
  const [testimonials, setTestimonials] = useState([]);

  useEffect(() => {
    apiGet('/services').then(setServices);
    apiGet('/testimonials').then(setTestimonials);
  }, []);

  return (
    <div className="home">
      {/* Hero Carousel */}
      <HeroCarousel />

      {/* Single Provider Value Prop */}
      <section className="section value-prop-section">
        <div className="container">
          <div className="value-prop-grid">
            <div className="value-prop-content">
              <span className="section-tag">Full-Service Partner</span>
              <h2>One Provider for Your Entire Landscape Lifecycle</h2>
              <p>
                From initial design concepts to ongoing maintenance, Urban Palm delivers
                seamless landscaping services that cover every phase of your outdoor space.
                No more juggling multiple contractors.
              </p>
              <ul className="value-prop-list">
                <li><span className="vp-check">&#10003;</span> Design & landscape architecture</li>
                <li><span className="vp-check">&#10003;</span> Professional installation & hardscaping</li>
                <li><span className="vp-check">&#10003;</span> Ongoing maintenance & seasonal care</li>
                <li><span className="vp-check">&#10003;</span> Water management & irrigation systems</li>
              </ul>
              <Link to="/services" className="btn btn-primary">See All Services</Link>
            </div>
            <div className="value-prop-cards">
              <div className="vp-card">
                <div className="vp-card-icon">&#127793;</div>
                <h4>Design</h4>
                <p>Custom plans from expert landscape architects</p>
              </div>
              <div className="vp-card">
                <div className="vp-card-icon">&#128296;</div>
                <h4>Build</h4>
                <p>Quality installation with premium materials</p>
              </div>
              <div className="vp-card">
                <div className="vp-card-icon">&#127807;</div>
                <h4>Maintain</h4>
                <p>Year-round care to keep landscapes thriving</p>
              </div>
              <div className="vp-card">
                <div className="vp-card-icon">&#9830;</div>
                <h4>Enhance</h4>
                <p>Seasonal upgrades that add curb appeal</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section features-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Why Choose Us</span>
            <h2>Why Choose Urban Palm</h2>
            <p>We bring expertise, reliability, and passion to every project.</p>
          </div>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">&#9733;</div>
              <h3>Expert Team</h3>
              <p>Over 15 years of combined experience in landscape design and horticulture across Central Florida.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">&#127758;</div>
              <h3>Sustainable Practices</h3>
              <p>Eco-friendly solutions that conserve water and support local ecosystems in Florida's unique climate.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">&#10003;</div>
              <h3>Satisfaction Guaranteed</h3>
              <p>We stand behind our work with a comprehensive satisfaction guarantee on every project.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">&#127968;</div>
              <h3>Local Expertise</h3>
              <p>Deep understanding of Central Florida's climate, soil, and the plants that thrive here year-round.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Services preview */}
      <section className="section services-preview">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Services</span>
            <h2>Comprehensive Landscaping Solutions</h2>
            <p>From residential gardens to commercial properties, we handle it all.</p>
          </div>
          <div className="services-grid">
            {services.slice(0, 3).map((service) => (
              <div key={service.id} className="service-preview-card">
                <div className="service-icon">{service.icon}</div>
                <h3>{service.name}</h3>
                <p>{service.description}</p>
                <div className="service-card-footer">
                  <span className="service-price">{service.price}</span>
                  <Link to="/contact" className="btn btn-secondary btn-sm">Get Quote</Link>
                </div>
              </div>
            ))}
          </div>
          <div className="section-cta">
            <Link to="/services" className="btn btn-primary">View All Services</Link>
          </div>
        </div>
      </section>

      {/* Markets Served */}
      <section className="section markets-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Markets We Serve</span>
            <h2>Expertise Across Industries</h2>
            <p>Tailored landscaping solutions for every type of property.</p>
          </div>
          <div className="markets-grid">
            <div className="market-card">
              <div className="market-icon">&#127968;</div>
              <h4>Residential</h4>
              <p>Beautiful yards and outdoor living spaces</p>
            </div>
            <div className="market-card">
              <div className="market-icon">&#127970;</div>
              <h4>Commercial</h4>
              <p>Professional grounds for offices and retail</p>
            </div>
            <div className="market-card">
              <div className="market-icon">&#127960;</div>
              <h4>HOA & Multi-Family</h4>
              <p>Community spaces residents are proud of</p>
            </div>
            <div className="market-card">
              <div className="market-icon">&#127963;</div>
              <h4>Hospitality</h4>
              <p>Stunning landscapes for hotels and resorts</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section testimonials-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Testimonials</span>
            <h2>What Our Clients Say</h2>
            <p>Hear from property owners who transformed their outdoor spaces with us.</p>
          </div>
          <div className="testimonials-grid">
            {testimonials.map((t) => (
              <div key={t.id} className="testimonial-card">
                <div className="testimonial-stars">
                  {'\u2605'.repeat(t.rating)}{'\u2606'.repeat(5 - t.rating)}
                </div>
                <p className="testimonial-text">"{t.text}"</p>
                <div className="testimonial-author">
                  <div className="testimonial-avatar">{t.name.charAt(0)}</div>
                  <div>
                    <div className="testimonial-name">{t.name}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section cta-section">
        <div className="container">
          <span className="cta-tag">Ready to Get Started?</span>
          <h2>Let's Create Your Dream Landscape</h2>
          <p>Contact us today for a free on-site consultation and detailed estimate. No obligation, no pressure.</p>
          <div className="cta-actions">
            <Link to="/contact" className="btn btn-primary btn-lg">Get Free Consultation</Link>
            <a href="tel:3212312094" className="btn btn-outline btn-lg cta-phone-btn">Call (321) 231-2094</a>
          </div>
        </div>
      </section>
    </div>
  );
}
