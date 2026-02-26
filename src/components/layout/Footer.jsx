import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-logo">
              <img src="/logo.png" alt="Urban Palm Landscaping" className="footer-logo-img" />
              Urban Palm
            </div>
            <p>Professional landscaping services that bring your outdoor vision to life.</p>
          </div>

          <div className="footer-links">
            <h4>Quick Links</h4>
            <Link to="/">Home</Link>
            <Link to="/services">Services</Link>
            <Link to="/portfolio">Portfolio</Link>
            <Link to="/about">About Us</Link>
            <Link to="/contact">Contact</Link>
          </div>

          <div className="footer-links">
            <h4>Services</h4>
            <Link to="/services">Delivery & Installation</Link>
            <Link to="/services">Landscape Design</Link>
            <Link to="/services">Hardscaping</Link>
            <Link to="/services">Irrigation</Link>
          </div>

          <div className="footer-links">
            <h4>Contact</h4>
            <p>25546 High Hampton Circle</p>
            <p>Sorrento, FL 32776</p>
            <p>(321) 231-2094</p>
            <p>info@urbanpalmlandscaping.com</p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2026 Urban Palm Landscaping. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
