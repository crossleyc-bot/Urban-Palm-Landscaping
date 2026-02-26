import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../../api';
import './Careers.css';

export default function Careers() {
  const [openings, setOpenings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    apiGet('/job-openings/public').then(setOpenings).finally(() => setLoading(false));
  }, []);

  return (
    <div className="careers-page">
      <section className="page-hero">
        <div className="container">
          <span className="hero-badge">Join Our Team</span>
          <h1>Careers at Urban Palm</h1>
          <p>Help us build beautiful outdoor spaces across Central Florida.</p>
        </div>
      </section>

      {/* Why work here */}
      <section className="section">
        <div className="container">
          <div className="section-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span className="section-tag">Why Urban Palm?</span>
            <h2>Grow Your Career With Us</h2>
          </div>
          <div className="careers-perks">
            <div className="perk-card">
              <div className="perk-icon">&#127793;</div>
              <h3>Hands-On Work</h3>
              <p>Every day is different. Work outdoors building landscapes people love.</p>
            </div>
            <div className="perk-card">
              <div className="perk-icon">&#128200;</div>
              <h3>Growth Opportunities</h3>
              <p>We invest in training and promote from within as we expand across Central Florida.</p>
            </div>
            <div className="perk-card">
              <div className="perk-icon">&#129309;</div>
              <h3>Great Team Culture</h3>
              <p>Join a supportive crew that takes pride in quality work and treats everyone like family.</p>
            </div>
            <div className="perk-card">
              <div className="perk-icon">&#128176;</div>
              <h3>Competitive Pay</h3>
              <p>Fair compensation, paid time off, and benefits for full-time team members.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Openings */}
      <section className="section" style={{ background: 'var(--color-bg-secondary)' }}>
        <div className="container">
          <div className="section-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span className="section-tag">Open Positions</span>
            <h2>Current Opportunities</h2>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading openings...</p>
          ) : openings.length === 0 ? (
            <div className="careers-empty">
              <p>No open positions right now, but we&apos;re always growing!</p>
              <p>Send your resume to <strong>careers@urbanpalmlandscaping.com</strong> and we&apos;ll keep you in mind.</p>
            </div>
          ) : (
            <div className="careers-openings">
              {openings.map(o => (
                <div key={o.id} className="opening-card">
                  <div className="opening-header" onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}>
                    <div className="opening-info">
                      <h3>{o.title}</h3>
                      <div className="opening-meta">
                        {o.department && <span className="opening-tag">{o.department}</span>}
                        <span className="opening-tag">{o.type}</span>
                        <span className="opening-tag">{o.location}</span>
                      </div>
                    </div>
                    <span className="opening-toggle">{expandedId === o.id ? '\u2212' : '+'}</span>
                  </div>
                  {expandedId === o.id && (
                    <div className="opening-details">
                      {o.description && (
                        <div className="opening-section">
                          <h4>About the Role</h4>
                          <p>{o.description}</p>
                        </div>
                      )}
                      {o.requirements && (
                        <div className="opening-section">
                          <h4>Requirements</h4>
                          <ul>
                            {o.requirements.split('\n').filter(Boolean).map((r, i) => <li key={i}>{r}</li>)}
                          </ul>
                        </div>
                      )}
                      <div className="opening-apply">
                        <p>Interested? Send your resume to <strong>careers@urbanpalmlandscaping.com</strong> with the job title in the subject line.</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container" style={{ textAlign: 'center' }}>
          <h2 style={{ marginBottom: '0.75rem' }}>Don&apos;t See the Right Fit?</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', maxWidth: 500, margin: '0 auto 1.5rem' }}>
            We&apos;re always interested in meeting talented people. Reach out and tell us what you bring to the table.
          </p>
          <Link to="/contact" className="btn btn-primary">Contact Us</Link>
        </div>
      </section>
    </div>
  );
}
