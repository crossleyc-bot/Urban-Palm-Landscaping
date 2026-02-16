import { useState } from 'react';
import { services } from '../../data/mockData';

export default function ScheduleService() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div>
        <div className="page-header">
          <h1>Schedule a Service</h1>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>&#128197;</div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Service Scheduled!</h2>
          <p style={{ color: '#718096', marginBottom: '1.5rem' }}>
            Your service has been scheduled. We'll send a confirmation email with the details.
          </p>
          <button className="btn btn-primary" onClick={() => setSubmitted(false)}>
            Schedule Another Service
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Schedule a Service</h1>
        <p>Choose a service, pick a date, and we'll take care of the rest.</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '600px' }}>
          <div className="form-group">
            <label htmlFor="service">Service</label>
            <select id="service" required defaultValue="">
              <option value="" disabled>Select a service</option>
              {services.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="date">Preferred Date</label>
              <input id="date" type="date" required />
            </div>

            <div className="form-group">
              <label htmlFor="time">Preferred Time</label>
              <select id="time" defaultValue="">
                <option value="" disabled>Select time</option>
                <option>Morning (8am - 12pm)</option>
                <option>Afternoon (12pm - 4pm)</option>
                <option>Late Afternoon (4pm - 6pm)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="frequency">Frequency</label>
            <select id="frequency" defaultValue="">
              <option value="" disabled>Select frequency</option>
              <option>One-time</option>
              <option>Weekly</option>
              <option>Bi-weekly</option>
              <option>Monthly</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="address">Service Address</label>
            <input
              id="address"
              type="text"
              placeholder="123 Main St, Central Florida, FL"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="notes">Special Instructions</label>
            <textarea
              id="notes"
              placeholder="Gate code, pet considerations, areas to focus on, etc."
            />
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ alignSelf: 'flex-start' }}>
            Schedule Service
          </button>
        </form>
      </div>
    </div>
  );
}
