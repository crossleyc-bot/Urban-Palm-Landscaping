import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiGet } from '../../api';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/Skeleton';
import Pagination from '../../components/ui/Pagination';
import SortableHeader from '../../components/ui/SortableHeader';

const statusBadge = (status) => {
  const map = {
    'Paid': 'badge badge-green',
    'Pending': 'badge badge-yellow',
    'Cancelled': 'badge badge-red',
  };
  return map[status] || 'badge badge-gray';
};

const PAGE_SIZE = 10;

export default function MyOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [orderItems, setOrderItems] = useState({});
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    if (user) {
      apiGet(`/orders?user_id=${user.id}`)
        .then(setOrders)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
    setPage(1);
  };

  const toggleExpand = async (orderId) => {
    if (expandedId === orderId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(orderId);
    if (!orderItems[orderId]) {
      try {
        const data = await apiGet(`/orders/${orderId}`);
        setOrderItems(prev => ({ ...prev, [orderId]: data.items || [] }));
      } catch {
        setOrderItems(prev => ({ ...prev, [orderId]: [] }));
      }
    }
  };

  const sorted = useMemo(() => {
    return [...orders].sort((a, b) => {
      const aVal = a[sortField] ?? '';
      const bVal = b[sortField] ?? '';
      const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [orders, sortField, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalSpent = orders.filter(o => o.status === 'Paid').reduce((sum, o) => sum + o.total, 0);

  return (
    <div>
      <div className="page-header">
        <h1>My Orders</h1>
        <p>View your product orders and order history.</p>
      </div>

      {!loading && orders.length > 0 && (
        <div className="stats-grid stagger-list" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-label">Total Orders</div>
            <div className="stat-value">{orders.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Spent</div>
            <div className="stat-value" style={{ color: '#16a34a' }}>${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pending</div>
            <div className="stat-value">{orders.filter(o => o.status === 'Pending').length}</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <SortableHeader label="Order" field="id" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Date" field="created_at" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Total" field="total" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th>Status</th>
                <th style={{ width: 100 }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTable rows={5} cols={5} />
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <EmptyState
                      icon="&#128722;"
                      title="No orders yet"
                      message="Browse our products and place your first order."
                      action={<Link to="/products" className="btn btn-primary btn-sm">Browse Products</Link>}
                    />
                  </td>
                </tr>
              ) : (
                paginated.map(order => (
                  <>
                    <tr key={order.id}>
                      <td style={{ fontWeight: 500 }}>#{order.id}</td>
                      <td>{order.created_at ? new Date(order.created_at + 'Z').toLocaleDateString() : '\u2014'}</td>
                      <td style={{ fontWeight: 500 }}>${Number(order.total).toFixed(2)}</td>
                      <td><span className={statusBadge(order.status)}>{order.status}</span></td>
                      <td>
                        <button className="btn btn-outline btn-sm" onClick={() => toggleExpand(order.id)}>
                          {expandedId === order.id ? 'Hide' : 'View'}
                        </button>
                      </td>
                    </tr>
                    {expandedId === order.id && (
                      <tr key={`${order.id}-items`}>
                        <td colSpan="5" style={{ padding: '0.75rem 1rem', background: 'var(--color-bg-secondary)' }}>
                          <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 600 }}>Order Items</div>
                          {(orderItems[order.id] || []).length === 0 ? (
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Loading...</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                              {orderItems[order.id].map(item => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                  <span>{item.item_name} x{item.quantity}</span>
                                  <span style={{ fontWeight: 500 }}>${(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                              ))}
                              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.35rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span>Subtotal: ${Number(order.subtotal).toFixed(2)}</span>
                                <span>Tax: ${Number(order.tax).toFixed(2)}</span>
                                <span style={{ fontWeight: 700 }}>Total: ${Number(order.total).toFixed(2)}</span>
                              </div>
                              {order.transaction_id && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                                  Transaction: {order.transaction_id}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
