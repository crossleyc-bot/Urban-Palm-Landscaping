import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiGet, apiPost } from '../../api';
import { useToast } from '../../components/ui/Toast';
import Spinner from '../../components/ui/Spinner';
import SEO from '../../components/SEO';

export default function RequestQuote() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [services, setServices] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiGet('/services').then(setServices);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const payload = {
      service: form.service.value,
      property_type: form.property.value,
      timeline: form.timeline.value,
      budget: form.budget.value,
      details: form.details.value,
      address: form.address.value,
    };

    if (user) {
      payload.user_id = user.id;
    } else {
      payload.guest_name = form.guest_name.value;
      payload.guest_email = form.guest_email.value;
      payload.guest_phone = form.guest_phone.value;
    }

    setSubmitting(true);
    try {
      await apiPost('/quotes', payload);
      setSubmitted(true);
      addToast('Quote request submitted!', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to submit. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="products-page">
        <SEO title="Quote Submitted" path="/quote" />
        <section className="section">
          <div className="container" style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center', padding: '3rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#10003;</div>
            <h1 style={{ color: '#16a34a', marginBottom: '0.5rem' }}>Quote Request Submitted!</h1>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
              We'll review your request and get back to you within 24 hours with a detailed estimate.
            </p>
            <button className="btn btn-primary" onClick={() => setSubmitted(false)}>
              Submit Another Request
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="products-page">
      <SEO title="Get a Free Quote" description="Request a free landscaping quote from Urban Palm. Same-day estimates available." path="/quote" />
      <section className="page-hero">
        <div className="container">
          <h1>Get a Free Quote</h1>
          <p>Tell us about your project and we'll provide a detailed estimate — usually the same day.</p>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: 640 }}>
          <div className="card">
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Contact info for guests */}
              {!user && (
                <>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Your Information</h2>
                  <div className="form-group">
                    <label htmlFor="guest_name">Full Name</label>
                    <input id="guest_name" name="guest_name" type="text" placeholder="John Smith" required />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label htmlFor="guest_email">Email</label>
                      <input id="guest_email" name="guest_email" type="email" placeholder="you@example.com" required />
                    </div>
                    <div className="form-group">
                      <label htmlFor="guest_phone">Phone</label>
                      <input id="guest_phone" name="guest_phone" type="tel" placeholder="(321) 231-2094" />
                    </div>
                  </div>
                </>
              )}

              {user && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem', background: '#f0fdf4', borderRadius: 8,
                  border: '1px solid #bbf7d0',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'var(--color-primary)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.9rem', flexShrink: 0,
                  }}>
                    {user.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{user.email}</div>
                  </div>
                </div>
              )}

              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0.5rem 0 0' }}>Project Details</h2>

              <div className="form-group">
                <label htmlFor="service">Service Type</label>
                <select id="service" name="service" required defaultValue="">
                  <option value="" disabled>Select a service</option>
                  {services.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="property">Property Type</label>
                  <select id="property" name="property" defaultValue="">
                    <option value="" disabled>Select property type</option>
                    <option>Residential - Small Yard</option>
                    <option>Residential - Large Yard</option>
                    <option>Commercial - Small</option>
                    <option>Commercial - Large</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="timeline">Preferred Timeline</label>
                  <select id="timeline" name="timeline" defaultValue="">
                    <option value="" disabled>Select timeline</option>
                    <option>As soon as possible</option>
                    <option>Within 1-2 weeks</option>
                    <option>Within a month</option>
                    <option>Flexible</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="budget">Budget Range</label>
                <select id="budget" name="budget" defaultValue="">
                  <option value="" disabled>Select budget range</option>
                  <option>Under $500</option>
                  <option>$500 - $1,000</option>
                  <option>$1,000 - $5,000</option>
                  <option>$5,000+</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="details">Project Details</label>
                <textarea
                  id="details"
                  name="details"
                  placeholder="Describe your project, including any specific requirements or preferences..."
                  required
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label htmlFor="address">Property Address</label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  placeholder="123 Main St, Orlando, FL 32801"
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
                {submitting ? <><Spinner size={16} /> Submitting...</> : 'Submit Quote Request'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
