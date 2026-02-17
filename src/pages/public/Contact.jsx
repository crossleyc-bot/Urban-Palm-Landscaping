import { useState } from 'react';
import { apiPost } from '../../api';
import { useToast } from '../../components/ui/Toast';
import Spinner from '../../components/ui/Spinner';
import useFormValidation from '../../hooks/useFormValidation';
import './Contact.css';

export default function Contact() {
  const { addToast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { getFieldProps, FieldError, validateAll } = useFormValidation({
    name: ['required'],
    email: ['required', 'email'],
    message: ['required'],
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const values = {
      name: form.name.value,
      email: form.email.value,
      message: form.message.value,
    };
    if (!validateAll(values)) return;

    setSubmitting(true);
    try {
      await apiPost('/contact', {
        name: form.name.value,
        email: form.email.value,
        phone: form.phone.value,
        service: form.service.value,
        message: form.message.value,
      });
      setSubmitted(true);
      addToast('Message sent successfully!', 'success');
    } catch {
      addToast('Failed to send message. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="contact-page">
      <section className="page-hero">
        <div className="container">
          <span className="hero-badge">Free Estimates &bull; No Obligation</span>
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
                      <input id="name" name="name" type="text" placeholder="John Smith" required {...getFieldProps('name')} />
                      <FieldError field="name" />
                    </div>
                    <div className="form-group">
                      <label htmlFor="email">Email</label>
                      <input id="email" name="email" type="email" placeholder="john@example.com" required {...getFieldProps('email')} />
                      <FieldError field="email" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input id="phone" name="phone" type="tel" placeholder="(555) 123-4567" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="service">Service Interested In</label>
                    <select id="service" name="service" defaultValue="">
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
                    <textarea id="message" name="message" placeholder="Tell us about your project..." required {...getFieldProps('message')} />
                    <FieldError field="message" />
                  </div>
                  <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
                    {submitting ? <><Spinner size={16} /> Sending...</> : 'Send Message'}
                  </button>
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
                  <p>info@urbanpalmlandscaping.com</p>
                </div>
                <div className="contact-detail">
                  <strong>Hours</strong>
                  <p>Mon-Fri: 8am - 6pm<br />Sat: 9am - 2pm<br />Sun: Closed</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
