import { useState, useEffect, useRef } from 'react';
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
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notifRef = useRef(null);

  // Fetch unread notification count for logged-in customers
  useEffect(() => {
    if (!user || user.role === 'admin') return;
    const authHeaders = user?.token ? { Authorization: `Bearer ${user.token}` } : {};
    const fetchCount = () => {
      fetch('/api/notifications/unread-count', { headers: authHeaders })
        .then(r => r.ok ? r.json() : { count: 0 })
        .then(d => setUnreadCount(d.count))
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  // Load notifications when bell is clicked
  const toggleNotifications = () => {
    if (!notifOpen && user) {
      const authHeaders = user?.token ? { Authorization: `Bearer ${user.token}` } : {};
      fetch('/api/notifications', { headers: authHeaders })
        .then(r => r.ok ? r.json() : [])
        .then(setNotifications)
        .catch(() => {});
    }
    setNotifOpen(prev => !prev);
  };

  // Close dropdown on outside click
  useEffect(() => {
    if (!notifOpen) return;
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [notifOpen]);

  const markAllRead = () => {
    if (!user) return;
    const authHeaders = user?.token ? { Authorization: `Bearer ${user.token}` } : {};
    fetch('/api/notifications/read-all', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({}),
    }).then(() => {
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
    }).catch(() => {});
  };

  const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link';

  return (
    <header className="header">
      <div className="header-topbar">
        <div className="header-topbar-inner">
          <span>Same Day Quotes &mdash; Fast, free estimates for your landscaping project</span>
          <span className="topbar-divider"></span>
          <a href="tel:3212312094" className="topbar-phone">&#9742; (321) 231-2094</a>
          <Link to="/quote" className="btn btn-primary btn-sm">Get a Quote</Link>
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

        {user && user.role !== 'admin' && (
          <div className="header-notif-wrapper" ref={notifRef}>
            <button className="header-notif-bell" onClick={toggleNotifications} aria-label="Notifications">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {unreadCount > 0 && <span className="header-notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
            {notifOpen && (
              <div className="header-notif-dropdown">
                <div className="notif-dropdown-header">
                  <strong>Notifications</strong>
                  {unreadCount > 0 && (
                    <button className="notif-mark-read" onClick={markAllRead}>Mark all read</button>
                  )}
                </div>
                <div className="notif-dropdown-list">
                  {notifications.length === 0 ? (
                    <div className="notif-empty">No notifications yet</div>
                  ) : (
                    notifications.slice(0, 10).map(n => (
                      <div key={n.id} className={`notif-item ${n.read ? '' : 'notif-unread'}`}>
                        <div className="notif-item-icon">
                          {n.type === 'sale' ? '\u{1F3F7}' : n.type === 'promo' ? '\u{1F381}' : '\u{1F514}'}
                        </div>
                        <div className="notif-item-content">
                          <div className="notif-item-title">{n.title}</div>
                          <div className="notif-item-msg">{n.message}</div>
                          <div className="notif-item-time">
                            {new Date(n.created_at + 'Z').toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {notifications.length > 0 && (
                  <Link to="/portal" className="notif-dropdown-footer" onClick={() => setNotifOpen(false)}>
                    View all in portal
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

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
            <Link to="/login" className="header-signin" aria-label="Sign In" title="Sign In">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </Link>
          )}
        </div>
      </div>
      {menuOpen && <div className="header-overlay" onClick={() => setMenuOpen(false)} />}
    </header>
  );
}
