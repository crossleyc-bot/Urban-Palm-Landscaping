import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../../api';
import SEO from '../../components/SEO';
import './About.css';

export default function About() {
  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => {
    apiGet('/employees/featured').then(setTeamMembers);
  }, []);

  return (
    <div className="about-page">
      <SEO title="About Us" description="Learn our story: from word-of-mouth referrals to Central Florida's premier full-service landscaping company. Meet our certified team." path="/about" />
      <section className="page-hero">
        <div className="container">
          <span className="hero-badge">Central Florida &bull; Growing Every Day</span>
          <h1>About Urban Palm</h1>
          <p>What started with a pickup truck and a handshake is growing into Central Florida's go-to landscaping partner.</p>
        </div>
      </section>

      {/* Our Story */}
      <section className="section">
        <div className="container">
          <div className="about-story">
            <div className="about-story-content">
              <span className="section-tag">Our Story</span>
              <h2>From Referrals to Full Service</h2>
              <p>
                Urban Palm Landscaping started the way the best businesses do — with
                a neighbor who needed help. We began taking on small residential projects
                for homeowners in the area, one yard at a time. Every clean edge and
                healthy hedge led to another referral, and word spread quickly.
              </p>
              <p>
                As our client list grew, so did the scope of what people asked us to do.
                Small plantings turned into full garden designs. Garden design turned into
                hardscaping, irrigation, and material delivery. Before long, we realized we
                weren't just planting shrubs anymore — we were building outdoor spaces
                people loved coming home to.
              </p>
              <p>
                Today, Urban Palm is a full-service landscaping company serving
                residential and commercial properties across Central Florida. We've
                kept the same personal touch that earned us those early referrals,
                but now we bring professional design, expert installation, and
                reliable delivery to every project.
              </p>
              <div className="about-milestones">
                <div className="milestone">
                  <div className="milestone-icon">&#127793;</div>
                  <div className="milestone-text">Started with small residential projects through word-of-mouth referrals</div>
                </div>
                <div className="milestone">
                  <div className="milestone-icon">&#128200;</div>
                  <div className="milestone-text">Grew our services to include design, hardscaping, and irrigation</div>
                </div>
                <div className="milestone">
                  <div className="milestone-icon">&#127968;</div>
                  <div className="milestone-text">Expanded into commercial properties and HOA communities</div>
                </div>
                <div className="milestone">
                  <div className="milestone-icon">&#9733;</div>
                  <div className="milestone-text">Now a full-service landscaping partner for Central Florida</div>
                </div>
              </div>
            </div>
            <div className="about-highlights">
              <div className="about-highlight">
                <div className="about-highlight-icon">&#129309;</div>
                <h4>Referral Built</h4>
                <p>Most of our clients found us through someone we already helped</p>
              </div>
              <div className="about-highlight">
                <div className="about-highlight-icon">&#127807;</div>
                <h4>Full Service</h4>
                <p>Design, deliver, and install — all under one roof</p>
              </div>
              <div className="about-highlight">
                <div className="about-highlight-icon">&#128170;</div>
                <h4>Hands-On Team</h4>
                <p>Our crew takes pride in every property we touch</p>
              </div>
              <div className="about-highlight">
                <div className="about-highlight-icon">&#127774;</div>
                <h4>Florida Focused</h4>
                <p>We know Central Florida's climate, soil, and what thrives here</p>
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
          <p>Whether you need a full landscape redesign or professional installation, we'd love to hear from you.</p>
          <div className="cta-actions">
            <Link to="/contact" className="btn btn-primary btn-lg">Get Free Consultation</Link>
            <a href="tel:3212312094" className="btn btn-outline btn-lg cta-phone-btn">Call (321) 231-2094</a>
          </div>
        </div>
      </section>
    </div>
  );
}
