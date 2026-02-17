import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiGet } from '../../api';

const statusBadge = (status) => {
  const map = {
    'Completed': 'badge badge-green',
    'In Progress': 'badge badge-blue',
    'Scheduled': 'badge badge-yellow',
    'Pending Quote': 'badge badge-gray',
  };
  return map[status] || 'badge badge-gray';
};

export default function OrderHistory() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (user) {
      apiGet(`/orders?user_id=${user.id}`).then(setOrders);
    }
  }, [user]);

  return (
    <div>
      <div className="page-header">
        <h1>Order History</h1>
        <p>View all your past and current service orders.</p>
      </div>

      <div className="card">
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
              {orders.map((order) => (
                <tr key={order.id}>
                  <td style={{ fontWeight: 500 }}>{order.id}</td>
                  <td>{order.service}</td>
                  <td>{order.date}</td>
                  <td><span className={statusBadge(order.status)}>{order.status}</span></td>
                  <td>{order.amount ? `$${order.amount}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
