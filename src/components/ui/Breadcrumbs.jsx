import { Link, useLocation } from 'react-router-dom';

const labelMap = {
  portal: 'Portal',
  admin: 'Admin',
  quote: 'Request Quote',
  schedule: 'Schedule Service',
  orders: 'Order History',
  jobs: 'Manage Jobs',
  employees: 'Employees',
  invoices: 'Invoices',
  quotes: 'Quote Requests',
  'schedule-requests': 'Schedule Requests',
  messages: 'Messages',
  'job-openings': 'Job Openings',
};

export default function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length <= 1) return null;

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {segments.map((seg, i) => {
        const path = '/' + segments.slice(0, i + 1).join('/');
        const label = labelMap[seg] || seg.charAt(0).toUpperCase() + seg.slice(1);
        const isLast = i === segments.length - 1;

        return (
          <span key={path} className="breadcrumb-item">
            {i > 0 && <span className="breadcrumb-sep">/</span>}
            {isLast ? (
              <span className="breadcrumb-current">{label}</span>
            ) : (
              <Link to={path} className="breadcrumb-link">{label}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
