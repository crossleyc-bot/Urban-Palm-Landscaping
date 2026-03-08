import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useSiteSettings } from '../../context/SiteSettingsContext';
import './Header.css';

export default function Header() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const { isPageVisible } = useSiteSettings();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link';

  return (
    <header className="header">
      <div className="header-topbar">
        <div className="header-topbar-inner">
          <span>Same Day Quotes &mdash; Fast, free estimates for your landscaping project</span>
          <span className="topbar-divider"></span>
          <a href="tel:3212312094" className="topbar-phone">&#9742; (321) 231-2094</a>
          <Link to="/portal/quote" className="btn btn-primary btn-sm">Get a Quote</Link>
        </div>
      </div>
      <div className="header-container">
        <Link to="/" className="logo">
          <img src="/logo.png" alt="Urban Palm Landscaping" className="logo-img" />
        </Link>

        <button
          className="hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
        >
          {menuOpen ? '\u2715' : '\u2630'}
        </button>

        <nav className={`main-nav ${menuOpen ? 'main-nav-open' : ''}`}>
          <Link to="/" className={isActive('/')} onClick={() => setMenuOpen(false)}>Home</Link>
          {[
            { path: '/services', label: 'Services' },
            { path: '/products', label: 'Products' },
            { path: '/portfolio', label: 'Portfolio' },
            { path: '/resources', label: 'Resources' },
            { path: '/about', label: 'About' },
            { path: '/careers', label: 'Careers' },
            { path: '/contact', label: 'Contact' },
          ].filter(link => isPageVisible(link.path)).map(link => (
            <Link key={link.path} to={link.path} className={isActive(link.path)} onClick={() => setMenuOpen(false)}>
              {link.label}
            </Link>
          ))}

          <div className="nav-actions-mobile">
            {user ? (
              <>
                <Link
                  to={user.role === 'admin' ? '/admin' : '/portal'}
                  className="btn btn-secondary"
                  onClick={() => setMenuOpen(false)}
                >
                  {user.role === 'admin' ? 'Admin Panel' : 'My Portal'}
                </Link>
                <button onClick={() => { logout(); setMenuOpen(false); }} className="btn btn-outline">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-primary" onClick={() => setMenuOpen(false)}>Sign In</Link>
              </>
            )}
          </div>
        </nav>

        <Link to="/cart" className="header-cart" aria-label="Shopping cart">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          {itemCount > 0 && <span className="header-cart-badge">{itemCount}</span>}
        </Link>

        <div className="header-actions">
          {user ? (
            <>
              <Link
                to={user.role === 'admin' ? '/admin' : '/portal'}
                className="btn btn-secondary"
              >
                {user.role === 'admin' ? 'Admin Panel' : 'My Portal'}
              </Link>
              <button onClick={logout} className="btn btn-outline">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-primary">Sign In</Link>
            </>
          )}
        </div>
      </div>
      {menuOpen && <div className="header-overlay" onClick={() => setMenuOpen(false)} />}
    </header>
  );
}
