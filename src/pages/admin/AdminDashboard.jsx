import { Link } from 'react-router-dom';
import { mockJobs, mockEmployees, mockInvoices } from '../../data/mockData';

export default function AdminDashboard() {
  const activeJobs = mockJobs.filter(j => j.status !== 'Completed').length;
  const activeEmployees = mockEmployees.filter(e => e.status === 'Active').length;
  const pendingInvoices = mockInvoices.filter(i => i.status === 'Pending').length;
  const revenue = mockInvoices
    .filter(i => i.status === 'Paid')
    .reduce((sum, i) => sum + i.amount, 0);

  return (
    <div>
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p>Overview of your landscaping business operations.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Active Jobs</div>
          <div className="stat-value">{activeJobs}</div>
          <div className="stat-sub">This week</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Active Crew</div>
          <div className="stat-value">{activeEmployees}</div>
          <div className="stat-sub">{mockEmployees.length} total</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending Invoices</div>
          <div className="stat-value">{pendingInvoices}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Revenue (Paid)</div>
          <div className="stat-value">${revenue.toLocaleString()}</div>
          <div className="stat-sub">This month</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Upcoming Jobs</h2>
            <Link to="/admin/jobs" className="btn btn-secondary btn-sm">View All</Link>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Service</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {mockJobs.filter(j => j.status !== 'Completed').slice(0, 3).map(job => (
                  <tr key={job.id}>
                    <td>{job.client}</td>
                    <td>{job.service}</td>
                    <td>{job.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Recent Invoices</h2>
            <Link to="/admin/invoices" className="btn btn-secondary btn-sm">View All</Link>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {mockInvoices.slice(0, 3).map(inv => (
                  <tr key={inv.id}>
                    <td>{inv.client}</td>
                    <td>${inv.amount}</td>
                    <td>
                      <span className={`badge ${inv.status === 'Paid' ? 'badge-green' : inv.status === 'Overdue' ? 'badge-red' : 'badge-yellow'}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
