import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-logo">
              <span>&#9752;</span> Urban Palm
            </div>
            <p>Professional landscaping services that bring your outdoor vision to life.</p>
          </div>

          <div className="footer-links">
            <h4>Quick Links</h4>
            <Link to="/">Home</Link>
            <Link to="/services">Services</Link>
            <Link to="/about">About Us</Link>
            <Link to="/contact">Contact</Link>
          </div>

          <div className="footer-links">
            <h4>Services</h4>
            <Link to="/services">Lawn Maintenance</Link>
            <Link to="/services">Landscape Design</Link>
            <Link to="/services">Hardscaping</Link>
            <Link to="/services">Irrigation</Link>
          </div>

          <div className="footer-links">
            <h4>Contact</h4>
            <p>123 Garden Ave, Suite 100</p>
            <p>Palm City, FL 34990</p>
            <p>(555) 123-4567</p>
            <p>info@urbanpalm.com</p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2026 Urban Palm Landscaping. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
