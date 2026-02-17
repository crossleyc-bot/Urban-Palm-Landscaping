import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiGet, apiPost } from '../../api';
import { useToast } from '../../components/ui/Toast';
import Spinner from '../../components/ui/Spinner';
import useFormValidation from '../../hooks/useFormValidation';

export default function RequestQuote() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [services, setServices] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { getFieldProps, FieldError, validateAll } = useFormValidation({
    service: ['required'],
    details: ['required'],
    address: ['required'],
  });

  useEffect(() => {
    apiGet('/services').then(setServices);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = e.target;
    const values = {
      service: form.service.value,
      details: form.details.value,
      address: form.address.value,
    };
    if (!validateAll(values)) return;

    setSubmitting(true);
    try {
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
      addToast('Quote request submitted successfully!', 'success');
    } catch {
      addToast('Failed to submit quote request. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
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
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
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
            <select id="service" name="service" required defaultValue="" {...getFieldProps('service')}>
              <option value="" disabled>Select a service</option>
              {services.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
            <FieldError field="service" />
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
              {...getFieldProps('details')}
            />
            <FieldError field="details" />
          </div>

          <div className="form-group">
            <label htmlFor="address">Property Address</label>
            <input
              id="address"
              name="address"
              type="text"
              placeholder="123 Main St, Central Florida, FL"
              required
              {...getFieldProps('address')}
            />
            <FieldError field="address" />
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ alignSelf: 'flex-start' }} disabled={submitting}>
            {submitting ? <><Spinner size={16} /> Submitting...</> : 'Submit Quote Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
