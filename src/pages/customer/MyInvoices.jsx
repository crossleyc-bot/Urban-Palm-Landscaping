import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiGet } from '../../api';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/Skeleton';
import Pagination from '../../components/ui/Pagination';
import SortableHeader from '../../components/ui/SortableHeader';
import printDocument from '../../utils/printDocument';

const statusBadge = (status) => {
  const map = {
    'Paid': 'badge badge-green',
    'Pending': 'badge badge-yellow',
    'Overdue': 'badge badge-red',
  };
  return map[status] || 'badge badge-gray';
};

const PAGE_SIZE = 10;

export default function MyInvoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('dueDate');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    if (user) {
      apiGet(`/invoices?user_id=${user.id}`)
        .then(setInvoices)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
    setPage(1);
  };

  const sorted = useMemo(() => {
    return [...invoices].sort((a, b) => {
      const aVal = a[sortField] ?? '';
      const bVal = b[sortField] ?? '';
      const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [invoices, sortField, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalOwed = invoices.filter(i => i.status !== 'Paid').reduce((sum, i) => sum + i.amount, 0);
  const totalPaid = invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.amount, 0);

  return (
    <div>
      <div className="page-header">
        <h1>My Invoices</h1>
        <p>View your invoices and payment status.</p>
      </div>

      {!loading && invoices.length > 0 && (
        <div className="stats-grid stagger-list" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-label">Total Invoices</div>
            <div className="stat-value">{invoices.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Amount Paid</div>
            <div className="stat-value" style={{ color: '#16a34a' }}>${totalPaid.toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Balance Due</div>
            <div className="stat-value" style={totalOwed > 0 ? { color: '#d97706' } : {}}>${totalOwed.toLocaleString()}</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <SortableHeader label="Invoice" field="id" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Amount" field="amount" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Date" field="date" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Due Date" field="dueDate" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th>Job</th>
                <th>Status</th>
                <th style={{ width: 80 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTable rows={5} cols={7} />
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <EmptyState icon="&#128176;" title="No invoices yet" message="Invoices will appear here after your job is completed." />
                  </td>
                </tr>
              ) : (
                paginated.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 500 }}>{inv.id}</td>
                    <td style={{ fontWeight: 500 }}>${inv.amount.toLocaleString()}</td>
                    <td>{inv.date}</td>
                    <td>{inv.dueDate}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{inv.job_id || '\u2014'}</td>
                    <td><span className={statusBadge(inv.status)}>{inv.status}</span></td>
                    <td>
                      <button className="btn btn-outline btn-sm" onClick={() => printDocument({
                        title: `Invoice ${inv.id}`,
                        subtitle: `Issued ${inv.date}`,
                        fields: [
                          { label: 'Invoice #', value: inv.id },
                          { label: 'Amount', value: `$${inv.amount.toLocaleString()}` },
                          { label: 'Date Issued', value: inv.date },
                          { label: 'Due Date', value: inv.dueDate },
                          { label: 'Job', value: inv.job_id },
                          { label: 'Status', value: inv.status },
                        ],
                      })}>Print</button>
                    </td>
                  </tr>
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
