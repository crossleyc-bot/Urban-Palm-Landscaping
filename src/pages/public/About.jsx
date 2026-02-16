import { teamMembers } from '../../data/mockData';
import './About.css';

export default function About() {
  return (
    <div className="about-page">
      <section className="page-hero">
        <div className="container">
          <h1>About Urban Palm</h1>
          <p>Passionate about creating beautiful outdoor spaces since 2011.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="about-story">
            <div className="about-story-content">
              <h2>Our Story</h2>
              <p>
                Urban Palm Landscaping was founded with a simple mission: to transform
                ordinary outdoor spaces into extraordinary living environments. What
                started as a one-person lawn care operation has grown into a
                full-service landscaping company serving the greater Palm City area.
              </p>
              <p>
                Today, our team of skilled designers, horticulturists, and craftsmen
                work together to deliver exceptional results on every project. We
                combine creative design with sustainable practices to create landscapes
                that are both beautiful and environmentally responsible.
              </p>
            </div>
            <div className="about-stats">
              <div className="about-stat">
                <div className="about-stat-value">500+</div>
                <div className="about-stat-label">Projects Completed</div>
              </div>
              <div className="about-stat">
                <div className="about-stat-value">15+</div>
                <div className="about-stat-label">Years Experience</div>
              </div>
              <div className="about-stat">
                <div className="about-stat-value">98%</div>
                <div className="about-stat-label">Client Satisfaction</div>
              </div>
              <div className="about-stat">
                <div className="about-stat-value">50+</div>
                <div className="about-stat-label">Active Clients</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section team-section">
        <div className="container">
          <div className="section-header">
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

      <section className="section values-section">
        <div className="container">
          <div className="section-header">
            <h2>Our Values</h2>
          </div>
          <div className="values-grid">
            <div className="value-card">
              <h3>Quality</h3>
              <p>We never compromise on materials, craftsmanship, or attention to detail.</p>
            </div>
            <div className="value-card">
              <h3>Sustainability</h3>
              <p>Eco-friendly practices that protect our environment for future generations.</p>
            </div>
            <div className="value-card">
              <h3>Integrity</h3>
              <p>Honest pricing, transparent communication, and reliable service every time.</p>
            </div>
            <div className="value-card">
              <h3>Innovation</h3>
              <p>Creative solutions using the latest techniques and plant varieties.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
