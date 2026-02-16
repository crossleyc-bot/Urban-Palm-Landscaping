import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Header.css';

export default function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link';

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <span className="logo-icon">&#9752;</span>
          <span className="logo-text">Urban Palm</span>
        </Link>

        <nav className="main-nav">
          <Link to="/" className={isActive('/')}>Home</Link>
          <Link to="/services" className={isActive('/services')}>Services</Link>
          <Link to="/about" className={isActive('/about')}>About</Link>
          <Link to="/contact" className={isActive('/contact')}>Contact</Link>
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
    </header>
  );
}
