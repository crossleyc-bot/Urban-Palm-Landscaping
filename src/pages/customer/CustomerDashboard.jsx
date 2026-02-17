import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiGet } from '../../api';
import Spinner from '../../components/ui/Spinner';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonCards, SkeletonTable } from '../../components/ui/Skeleton';

const statusBadge = (status) => {
  const map = {
    'Completed': 'badge badge-green',
    'In Progress': 'badge badge-blue',
    'Scheduled': 'badge badge-yellow',
    'Pending Quote': 'badge badge-gray',
  };
  return map[status] || 'badge badge-gray';
};

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      apiGet(`/orders?user_id=${user.id}`)
        .then(setOrders)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const active = orders.filter(o => o.status !== 'Completed').length;
  const completed = orders.filter(o => o.status === 'Completed').length;

  return (
    <div>
      <div className="page-header">
        <h1>Welcome back, {user.name}</h1>
        <p>Here's an overview of your landscaping services.</p>
      </div>

      {loading ? (
        <SkeletonCards count={3} />
      ) : (
        <div className="stats-grid stagger-list">
          <div className="stat-card">
            <div className="stat-label">Active Orders</div>
            <div className="stat-value">{active}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Completed</div>
            <div className="stat-value">{completed}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Spent</div>
            <div className="stat-value">
              ${orders.reduce((sum, o) => sum + (o.amount || 0), 0).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Recent Orders</h2>
          <Link to="/portal/orders" className="btn btn-secondary btn-sm">View All</Link>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Service</th>
                <th>Date</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTable rows={3} cols={5} />
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <EmptyState icon="&#128203;" title="No orders yet" message="Request a quote or schedule a service to get started." />
                  </td>
                </tr>
              ) : (
                orders.slice(0, 5).map((order) => (
                  <tr key={order.id}>
                    <td style={{ fontWeight: 500 }}>{order.id}</td>
                    <td>{order.service}</td>
                    <td>{order.date}</td>
                    <td><span className={statusBadge(order.status)}>{order.status}</span></td>
                    <td>{order.amount ? `$${order.amount}` : '\u2014'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link to="/portal/quote" className="btn btn-primary">Request a Quote</Link>
        <Link to="/portal/schedule" className="btn btn-outline">Schedule Service</Link>
      </div>
    </div>
  );
}
