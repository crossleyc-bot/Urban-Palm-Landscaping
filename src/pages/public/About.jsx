import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../../api';
import './About.css';

function AnimatedStat({ end, suffix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const startTime = Date.now();
          const numEnd = parseInt(end, 10);
          const duration = 2000;
          const tick = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * numEnd));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);

  return <span ref={ref}>{count}{suffix}</span>;
}

export default function About() {
  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => {
    apiGet('/team').then(setTeamMembers);
  }, []);

  return (
    <div className="about-page">
      <section className="page-hero">
        <div className="container">
          <span className="hero-badge">Est. 2011 &bull; Central Florida</span>
          <h1>About Urban Palm</h1>
          <p>Passionate about creating beautiful outdoor spaces for over a decade.</p>
        </div>
      </section>

      {/* Heritage / Story */}
      <section className="section">
        <div className="container">
          <div className="about-story">
            <div className="about-story-content">
              <span className="section-tag">Our Heritage</span>
              <h2>Rooted in Central Florida Since 2011</h2>
              <p>
                Urban Palm Landscaping was founded with a simple mission: to transform
                ordinary outdoor spaces into extraordinary living environments. What
                started as a one-person lawn care operation has grown into a
                full-service landscaping company serving the greater Central Florida area.
              </p>
              <p>
                Today, our team of skilled designers, horticulturists, and craftsmen
                work together to deliver exceptional results on every project. We
                combine creative design with sustainable practices to create landscapes
                that are both beautiful and environmentally responsible.
              </p>
              <div className="about-milestones">
                <div className="milestone">
                  <div className="milestone-year">2011</div>
                  <div className="milestone-text">Founded in Orlando as a residential lawn care provider</div>
                </div>
                <div className="milestone">
                  <div className="milestone-year">2015</div>
                  <div className="milestone-text">Expanded to full-service landscaping design &amp; installation</div>
                </div>
                <div className="milestone">
                  <div className="milestone-year">2019</div>
                  <div className="milestone-text">Launched commercial landscaping division for Central Florida businesses</div>
                </div>
                <div className="milestone">
                  <div className="milestone-year">2024</div>
                  <div className="milestone-text">Serving 50+ active clients across 8 communities</div>
                </div>
              </div>
            </div>
            <div className="about-stats">
              <div className="about-stat">
                <div className="about-stat-value"><AnimatedStat end={500} suffix="+" /></div>
                <div className="about-stat-label">Projects Completed</div>
              </div>
              <div className="about-stat">
                <div className="about-stat-value"><AnimatedStat end={15} suffix="+" /></div>
                <div className="about-stat-label">Years Experience</div>
              </div>
              <div className="about-stat">
                <div className="about-stat-value"><AnimatedStat end={98} suffix="%" /></div>
                <div className="about-stat-label">Client Satisfaction</div>
              </div>
              <div className="about-stat">
                <div className="about-stat-value"><AnimatedStat end={50} suffix="+" /></div>
                <div className="about-stat-label">Active Clients</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="section team-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Our People</span>
            <h2>Meet Our Team</h2>
            <p>The talented people behind every beautiful landscape.</p>
          </div>
          <div className="team-grid">
            {teamMembers.map((member) => (
              <div key={member.id} className="team-card">
                {member.image ? (
                  <img src={member.image} alt={member.name} className="team-photo" />
                ) : (
                  <div className="team-avatar">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </div>
                )}
                <h3>{member.name}</h3>
                <p className="team-role">{member.role}</p>
                <p className="team-exp">{member.experience} experience</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section values-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">What Drives Us</span>
            <h2>Our Core Values</h2>
            <p>The principles that guide every project we take on.</p>
          </div>
          <div className="values-grid">
            <div className="value-card">
              <div className="value-icon">&#9733;</div>
              <h3>Quality</h3>
              <p>We never compromise on materials, craftsmanship, or attention to detail in any project.</p>
            </div>
            <div className="value-card">
              <div className="value-icon">&#127807;</div>
              <h3>Sustainability</h3>
              <p>Eco-friendly practices that conserve water and protect Florida's natural ecosystems.</p>
            </div>
            <div className="value-card">
              <div className="value-icon">&#129309;</div>
              <h3>Integrity</h3>
              <p>Honest pricing, transparent communication, and reliable service every single time.</p>
            </div>
            <div className="value-card">
              <div className="value-icon">&#128161;</div>
              <h3>Innovation</h3>
              <p>Creative solutions using the latest techniques and plant varieties for lasting results.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Certifications / Credentials */}
      <section className="section credentials-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Credentials</span>
            <h2>Licensed &amp; Insured</h2>
            <p>Professional certifications you can trust.</p>
          </div>
          <div className="credentials-grid">
            <div className="credential-card">
              <div className="credential-icon">&#128220;</div>
              <h4>State Licensed</h4>
              <p>Fully licensed landscape contractor in the state of Florida</p>
            </div>
            <div className="credential-card">
              <div className="credential-icon">&#128737;</div>
              <h4>Fully Insured</h4>
              <p>Comprehensive liability and workers' compensation coverage</p>
            </div>
            <div className="credential-card">
              <div className="credential-icon">&#127793;</div>
              <h4>Certified Horticulturists</h4>
              <p>Team members hold FNGLA and ISA certifications</p>
            </div>
            <div className="credential-card">
              <div className="credential-icon">&#128167;</div>
              <h4>Water-Smart Partner</h4>
              <p>Certified in Florida-friendly irrigation and water conservation</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section cta-section">
        <div className="container">
          <h2>Want to Work With Us?</h2>
          <p>Whether you need a full landscape redesign or ongoing maintenance, we'd love to hear from you.</p>
          <div className="cta-actions">
            <Link to="/contact" className="btn btn-primary btn-lg">Get Free Consultation</Link>
            <a href="tel:3212312094" className="btn btn-outline btn-lg cta-phone-btn">Call (321) 231-2094</a>
          </div>
        </div>
      </section>
    </div>
  );
}
