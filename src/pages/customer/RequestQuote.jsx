import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiGet, apiPost } from '../../api';

export default function RequestQuote() {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    apiGet('/services').then(setServices);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    await apiPost('/quotes', {
      user_id: user.id,
      service: form.service.value,
      property_type: form.property.value,
      timeline: form.timeline.value,
      budget: form.budget.value,
      details: form.details.value,
      address: form.address.value,
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div>
        <div className="page-header">
          <h1>Request a Quote</h1>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>&#10003;</div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Quote Request Submitted!</h2>
          <p style={{ color: '#718096', marginBottom: '1.5rem' }}>
            We'll review your request and get back to you within 24 hours with a detailed estimate.
          </p>
          <button className="btn btn-primary" onClick={() => setSubmitted(false)}>
            Submit Another Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Request a Quote</h1>
        <p>Tell us about your project and we'll provide a detailed estimate.</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '600px' }}>
          <div className="form-group">
            <label htmlFor="service">Service Type</label>
            <select id="service" name="service" required defaultValue="">
              <option value="" disabled>Select a service</option>
              {services.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

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
            />
          </div>

          <div className="form-group">
            <label htmlFor="address">Property Address</label>
            <input
              id="address"
              name="address"
              type="text"
              placeholder="123 Main St, Central Florida, FL"
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ alignSelf: 'flex-start' }}>
            Submit Quote Request
          </button>
        </form>
      </div>
    </div>
  );
}
