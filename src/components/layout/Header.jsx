import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Header.css';

export default function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link';

  return (
    <header className="header">
      <div className="header-topbar">
        <div className="header-topbar-inner">
          <span>Same Day Quotes &mdash; Fast, free estimates for your landscaping project</span>
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
          <Link to="/services" className={isActive('/services')} onClick={() => setMenuOpen(false)}>Services</Link>
          <Link to="/products" className={isActive('/products')} onClick={() => setMenuOpen(false)}>Products</Link>
          <Link to="/portfolio" className={isActive('/portfolio')} onClick={() => setMenuOpen(false)}>Portfolio</Link>
          <Link to="/about" className={isActive('/about')} onClick={() => setMenuOpen(false)}>About</Link>
          <Link to="/careers" className={isActive('/careers')} onClick={() => setMenuOpen(false)}>Careers</Link>
          <Link to="/contact" className={isActive('/contact')} onClick={() => setMenuOpen(false)}>Contact</Link>

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
                <Link to="/login" className="btn btn-outline" onClick={() => setMenuOpen(false)}>Log In</Link>
                <Link to="/portal" className="btn btn-primary" onClick={() => setMenuOpen(false)}>Customer Portal</Link>
              </>
            )}
          </div>
        </nav>

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
              <Link to="/login" className="btn btn-outline">Log In</Link>
              <Link to="/portal" className="btn btn-primary">Customer Portal</Link>
            </>
          )}
        </div>
      </div>
      {menuOpen && <div className="header-overlay" onClick={() => setMenuOpen(false)} />}
    </header>
  );
}
