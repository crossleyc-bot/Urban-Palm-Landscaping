import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

export default function Sidebar({ items, title }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="sidebar-mobile-toggle" onClick={() => setOpen(true)}>
        <span>&#9776;</span> Menu
      </button>
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-title">{title}</div>
          <button className="sidebar-close" onClick={() => setOpen(false)}>&times;</button>
        </div>
        <nav className="sidebar-nav">
          {items.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
