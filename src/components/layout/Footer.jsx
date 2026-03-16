import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import { apiGet } from '../../api';
import './Footer.css';

export default function Footer() {
  const { settings } = useSiteSettings();
  const [services, setServices] = useState([]);

  useEffect(() => {
    apiGet('/services').then(setServices).catch(() => {});
  }, []);

  const address1 = settings.contact_address_1 || '25546 High Hampton Circle';
  const address2 = settings.contact_address_2 || 'Sorrento, FL 32776';
  const phone = settings.contact_phone || '(321) 231-2094';
  const email = settings.contact_email || settings.ses_from_email || 'sales@urbanpalmlandscaping.com';
  const facebook = settings.social_facebook || '';
  const instagram = settings.social_instagram || '';
  const youtube = settings.social_youtube || '';
  const hasSocial = facebook || instagram || youtube;

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
            {services.length > 0 ? services.map(s => (
              <Link key={s.id} to={`/services/${s.slug}`}>{s.name}</Link>
            )) : (
              <>
                <Link to="/services">Delivery & Installation</Link>
                <Link to="/services">Landscape Design</Link>
              </>
            )}
          </div>

          <div className="footer-links">
            <h4>Contact</h4>
            <p>{address1}</p>
            <p>{address2}</p>
            <p><a href={`tel:${phone.replace(/\D/g, '')}`}>{phone}</a></p>
            <p><a href={`mailto:${email}`}>{email}</a></p>
          </div>
        </div>

        {hasSocial && (
          <div className="footer-social">
            {facebook && <a href={facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">Facebook</a>}
            {instagram && <a href={instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">Instagram</a>}
            {youtube && <a href={youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube">YouTube</a>}
          </div>
        )}

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Urban Palm Landscaping. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
