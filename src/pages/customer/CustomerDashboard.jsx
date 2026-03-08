import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiGet, apiPut } from '../../api';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonCards, SkeletonTable } from '../../components/ui/Skeleton';

const jobStatusBadge = (status) => {
  const map = {
    'Completed': 'badge badge-green',
    'In Progress': 'badge badge-blue',
    'Scheduled': 'badge badge-yellow',
  };
  return map[status] || 'badge badge-gray';
};

const quoteStatusBadge = (status) => {
  const map = {
    'Pending': 'badge badge-yellow',
    'Replied': 'badge badge-blue',
    'Approved': 'badge badge-green',
    'Declined': 'badge badge-red',
    'Converted': 'badge badge-purple',
  };
  return map[status] || 'badge badge-gray';
};

const invoiceStatusBadge = (status) => {
  const map = {
    'Paid': 'badge badge-green',
    'Pending': 'badge badge-yellow',
    'Overdue': 'badge badge-red',
  };
  return map[status] || 'badge badge-gray';
};

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      Promise.all([
        apiGet(`/jobs?user_id=${user.id}`),
        apiGet(`/my-quotes?user_id=${user.id}`),
        apiGet(`/invoices?user_id=${user.id}`),
        apiGet(`/notifications?user_id=${user.id}`),
      ])
        .then(([j, q, i, n]) => { setJobs(j); setQuotes(q); setInvoices(i); setNotifications(n); })
        .finally(() => setLoading(false));
    }
  }, [user]);

  const activeJobs = jobs.filter(j => j.status !== 'Completed').length;
  const completedJobs = jobs.filter(j => j.status === 'Completed').length;
  const pendingInvoices = invoices.filter(i => i.status === 'Pending' || i.status === 'Overdue');
  const totalOwed = pendingInvoices.reduce((sum, i) => sum + (i.amount || 0), 0);

  return (
    <div>
      <div className="page-header">
        <h1>Welcome back, {user.name}</h1>
        <p>Here's an overview of your landscaping services.</p>
      </div>

      {loading ? (
        <SkeletonCards count={4} />
      ) : (
        <div className="stats-grid stagger-list">
          <div className="stat-card">
            <div className="stat-label">Active Jobs</div>
            <div className="stat-value">{activeJobs}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Completed</div>
            <div className="stat-value">{completedJobs}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pending Quotes</div>
            <div className="stat-value">{quotes.filter(q => q.status === 'Pending' || q.status === 'Replied').length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Balance Due</div>
            <div className="stat-value" style={totalOwed > 0 ? { color: '#d97706' } : {}}>
              ${totalOwed.toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Promotions & Notifications */}
      {!loading && notifications.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Notifications</h2>
            {notifications.some(n => !n.read) && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  apiPut('/notifications/read-all', { user_id: user.id }).then(() => {
                    setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
                  });
                }}
              >
                Mark All Read
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {notifications.slice(0, 5).map(n => (
              <div
                key={n.id}
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  alignItems: 'flex-start',
                  padding: '0.65rem 0.75rem',
                  borderRadius: 8,
                  background: n.read ? 'transparent' : 'rgba(22, 101, 52, 0.05)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>
                  {n.type === 'sale' ? '\u{1F3F7}' : n.type === 'promo' ? '\u{1F381}' : '\u{1F514}'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{n.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>{n.message}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                    {new Date(n.created_at + 'Z').toLocaleDateString()}
                  </div>
                </div>
                {n.link && (
                  <Link to={n.link} className="btn btn-outline btn-sm" style={{ flexShrink: 0 }}>View</Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Quotes */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>My Quotes</h2>
          <Link to="/portal/quotes" className="btn btn-secondary btn-sm">View All</Link>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Service</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTable rows={3} cols={4} />
              ) : quotes.length === 0 ? (
                <tr>
                  <td colSpan="4">
                    <EmptyState icon="&#9993;" title="No quotes yet" message="Request a quote to get started." />
                  </td>
                </tr>
              ) : (
                quotes.slice(0, 5).map((q) => (
                  <tr key={q.id}>
                    <td style={{ fontWeight: 500 }}>#{q.id}</td>
                    <td>{q.service}</td>
                    <td>{q.created_at ? new Date(q.created_at + 'Z').toLocaleDateString() : '\u2014'}</td>
                    <td><span className={quoteStatusBadge(q.status || 'Pending')}>{q.status || 'Pending'}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>My Jobs</h2>
          <Link to="/portal/jobs" className="btn btn-secondary btn-sm">View All</Link>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Job ID</th>
                <th>Service</th>
                <th>Date</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTable rows={3} cols={5} />
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <EmptyState icon="&#128188;" title="No jobs yet" message="Jobs will appear here once your quote is approved." />
                  </td>
                </tr>
              ) : (
                jobs.slice(0, 5).map((job) => (
                  <tr key={job.id}>
                    <td style={{ fontWeight: 500 }}>{job.id}</td>
                    <td>{job.service}</td>
                    <td>{job.date}</td>
                    <td><span className={jobStatusBadge(job.status)}>{job.status}</span></td>
                    <td>{job.amount ? `$${Number(job.amount).toLocaleString()}` : '\u2014'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>My Invoices</h2>
          <Link to="/portal/invoices" className="btn btn-secondary btn-sm">View All</Link>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTable rows={3} cols={4} />
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="4">
                    <EmptyState icon="&#128176;" title="No invoices yet" message="Invoices will appear here after job completion." />
                  </td>
                </tr>
              ) : (
                invoices.slice(0, 5).map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 500 }}>{inv.id}</td>
                    <td style={{ fontWeight: 500 }}>${inv.amount.toLocaleString()}</td>
                    <td>{inv.dueDate}</td>
                    <td><span className={invoiceStatusBadge(inv.status)}>{inv.status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link to="/portal/quote" className="btn btn-primary">Request a Quote</Link>
      </div>
    </div>
  );
}
