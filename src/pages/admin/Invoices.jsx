import { mockInvoices } from '../../data/mockData';
import { useState } from 'react';

const statusBadge = (status) => {
  const map = {
    'Paid': 'badge badge-green',
    'Pending': 'badge badge-yellow',
    'Overdue': 'badge badge-red',
  };
  return map[status] || 'badge badge-gray';
};

export default function Invoices() {
  const [filter, setFilter] = useState('All');

  const filtered = filter === 'All' ? mockInvoices : mockInvoices.filter(i => i.status === filter);

  const totalRevenue = mockInvoices.reduce((sum, i) => sum + i.amount, 0);
  const paidAmount = mockInvoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.amount, 0);
  const pendingAmount = mockInvoices.filter(i => i.status === 'Pending').reduce((sum, i) => sum + i.amount, 0);
  const overdueAmount = mockInvoices.filter(i => i.status === 'Overdue').reduce((sum, i) => sum + i.amount, 0);

  return (
    <div>
      <div className="page-header">
        <h1>Invoices</h1>
        <p>Manage billing and track payments.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Billed</div>
          <div className="stat-value">${totalRevenue.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Paid</div>
          <div className="stat-value" style={{ color: '#16a34a' }}>${paidAmount.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending</div>
          <div className="stat-value" style={{ color: '#d97706' }}>${pendingAmount.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Overdue</div>
          <div className="stat-value" style={{ color: '#dc2626' }}>${overdueAmount.toLocaleString()}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {['All', 'Paid', 'Pending', 'Overdue'].map(f => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Client</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id}>
                  <td style={{ fontWeight: 500 }}>{inv.id}</td>
                  <td>{inv.client}</td>
                  <td style={{ fontWeight: 500 }}>${inv.amount.toLocaleString()}</td>
                  <td>{inv.date}</td>
                  <td>{inv.dueDate}</td>
                  <td><span className={statusBadge(inv.status)}>{inv.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
