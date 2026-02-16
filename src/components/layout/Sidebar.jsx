import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

export default function Sidebar({ items, title }) {
  const location = useLocation();

  return (
    <aside className="sidebar">
      <div className="sidebar-title">{title}</div>
      <nav className="sidebar-nav">
        {items.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="sidebar-icon">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
