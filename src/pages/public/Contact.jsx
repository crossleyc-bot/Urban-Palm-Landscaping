import { useState } from 'react';
import './Contact.css';

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="contact-page">
      <section className="page-hero">
        <div className="container">
          <h1>Contact Us</h1>
          <p>Get in touch for a free consultation and quote.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="contact-grid">
            <div className="contact-form-wrapper">
              <h2>Send Us a Message</h2>
              {submitted ? (
                <div className="success-message">
                  <div className="success-icon">&#10003;</div>
                  <h3>Message Sent!</h3>
                  <p>Thank you for reaching out. We'll get back to you within 24 hours.</p>
                  <button className="btn btn-primary" onClick={() => setSubmitted(false)}>
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="contact-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="name">Full Name</label>
                      <input id="name" type="text" placeholder="John Smith" required />
                    </div>
                    <div className="form-group">
                      <label htmlFor="email">Email</label>
                      <input id="email" type="email" placeholder="john@example.com" required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input id="phone" type="tel" placeholder="(555) 123-4567" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="service">Service Interested In</label>
                    <select id="service" defaultValue="">
                      <option value="" disabled>Select a service</option>
                      <option>Lawn Maintenance</option>
                      <option>Landscape Design</option>
                      <option>Tree & Shrub Care</option>
                      <option>Irrigation Systems</option>
                      <option>Hardscaping</option>
                      <option>Seasonal Cleanup</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="message">Message</label>
                    <textarea id="message" placeholder="Tell us about your project..." required />
                  </div>
                  <button type="submit" className="btn btn-primary btn-lg">Send Message</button>
                </form>
              )}
            </div>

            <div className="contact-info">
              <div className="contact-info-card">
                <h3>Get In Touch</h3>
                <div className="contact-detail">
                  <strong>Address</strong>
                  <p>25546 High Hampton Circle<br />Sorrento, FL 32776</p>
                </div>
                <div className="contact-detail">
                  <strong>Phone</strong>
                  <p>(321) 231-2094</p>
                </div>
                <div className="contact-detail">
                  <strong>Email</strong>
                  <p>info@urbanpalm.com</p>
                </div>
                <div className="contact-detail">
                  <strong>Hours</strong>
                  <p>Mon–Fri: 8am – 6pm<br />Sat: 9am – 2pm<br />Sun: Closed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
