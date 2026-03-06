import { Link } from 'react-router-dom';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import './Footer.css';

export default function Footer() {
  const { settings } = useSiteSettings();

  const address1 = settings.contact_address_1 || '25546 High Hampton Circle';
  const address2 = settings.contact_address_2 || 'Sorrento, FL 32776';
  const phone = settings.contact_phone || '(321) 231-2094';
  const email = settings.contact_email || 'info@urbanpalmlandscaping.com';

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-logo">
              <img src="/logo.png" alt="Urban Palm Landscaping" className="footer-logo-img" loading="lazy" />
              Urban Palm
            </div>
            <p>Professional landscaping services that bring your outdoor vision to life.</p>
          </div>

          <div className="footer-links">
            <h4>Quick Links</h4>
            <Link to="/">Home</Link>
            <Link to="/services">Services</Link>
            <Link to="/portfolio">Portfolio</Link>
            <Link to="/products">Products</Link>
            <Link to="/about">About Us</Link>
            <Link to="/careers">Careers</Link>
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
            <p>{address1}</p>
            <p>{address2}</p>
            <p><a href={`tel:${phone.replace(/\D/g, '')}`}>{phone}</a></p>
            <p><a href={`mailto:${email}`}>{email}</a></p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Urban Palm Landscaping. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
