import { useState, useEffect, useMemo } from 'react';
import { apiGet, apiPut } from '../../api';
import { useToast } from '../../components/ui/Toast';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonCards, SkeletonTable } from '../../components/ui/Skeleton';
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

const INVOICE_STATUSES = ['Pending', 'Paid', 'Overdue'];
const PAGE_SIZE = 10;

export default function Invoices() {
  const { addToast } = useToast();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('id');
  const [sortDir, setSortDir] = useState('desc');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiGet('/invoices').then(setInvoices).finally(() => setLoading(false));
  }, []);

  const searchFiltered = invoices.filter(i => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (i.client || '').toLowerCase().includes(s) ||
      (i.id || '').toString().toLowerCase().includes(s) ||
      (i.status || '').toLowerCase().includes(s) ||
      String(i.amount || '').includes(s)
    );
  });

  const filtered = filter === 'All' ? searchFiltered : searchFiltered.filter(i => i.status === filter);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = a[sortField] ?? '';
      const bVal = b[sortField] ?? '';
      const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalRevenue = invoices.reduce((sum, i) => sum + i.amount, 0);
  const paidAmount = invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.amount, 0);
  const pendingAmount = invoices.filter(i => i.status === 'Pending').reduce((sum, i) => sum + i.amount, 0);
  const overdueAmount = invoices.filter(i => i.status === 'Overdue').reduce((sum, i) => sum + i.amount, 0);

  const startEdit = (inv) => {
    setEditing(inv.id);
    setForm({ client: inv.client, amount: inv.amount, date: inv.date, due_date: inv.dueDate, status: inv.status });
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm({});
  };

  const saveEdit = async (invId) => {
    setSaving(true);
    try {
      await apiPut(`/invoices/${invId}`, { ...form, amount: Number(form.amount) });
      setInvoices(prev => prev.map(i => i.id === invId ? { ...i, client: form.client, amount: Number(form.amount), date: form.date, dueDate: form.due_date, status: form.status } : i));
      setEditing(null);
      addToast('Invoice updated successfully', 'success');
    } catch {
      addToast('Failed to update invoice', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Invoices</h1>
        <p>Manage billing and track payments.</p>
      </div>

      {loading ? (
        <SkeletonCards count={4} />
      ) : (
        <div className="stats-grid stagger-list">
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
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['All', 'Paid', 'Pending', 'Overdue'].map(f => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => { setFilter(f); setPage(1); }}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="card">
        <div style={{ marginBottom: '1rem' }}>
          <input
            className="table-input"
            placeholder="Search invoices by client, amount, or status..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 400 }}
          />
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <SortableHeader label="Invoice" field="id" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Client" field="client" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Amount" field="amount" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Date" field="date" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Due Date" field="dueDate" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTable rows={5} cols={7} />
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <EmptyState icon="&#128176;" title="No invoices found" message={filter !== 'All' ? `No ${filter.toLowerCase()} invoices.` : 'Invoices will appear here.'} />
                  </td>
                </tr>
              ) : (
                paginated.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 500 }}>{inv.id}</td>
                    {editing === inv.id ? (
                      <>
                        <td><input className="table-input" value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} /></td>
                        <td><input className="table-input" type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={{ width: '80px' }} /></td>
                        <td><input className="table-input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></td>
                        <td><input className="table-input" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></td>
                        <td>
                          <select className="table-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                            {INVOICE_STATUSES.map(s => <option key={s}>{s}</option>)}
                          </select>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button className="btn btn-primary btn-sm" onClick={() => saveEdit(inv.id)} disabled={saving}>Save</button>
                            <button className="btn btn-outline btn-sm" onClick={cancelEdit}>Cancel</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>{inv.client}</td>
                        <td style={{ fontWeight: 500 }}>${inv.amount.toLocaleString()}</td>
                        <td>{inv.date}</td>
                        <td>{inv.dueDate}</td>
                        <td><span className={statusBadge(inv.status)}>{inv.status}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button className="btn btn-outline btn-sm" onClick={() => startEdit(inv)}>Edit</button>
                            <button className="btn btn-outline btn-sm" onClick={() => printDocument({
                              title: `Invoice ${inv.id}`,
                              subtitle: `Client: ${inv.client} \u2022 Issued ${inv.date}`,
                              fields: [
                                { label: 'Invoice #', value: inv.id },
                                { label: 'Client', value: inv.client },
                                { label: 'Amount', value: `$${inv.amount.toLocaleString()}` },
                                { label: 'Date Issued', value: inv.date },
                                { label: 'Due Date', value: inv.dueDate },
                                { label: 'Job', value: inv.job_id },
                                { label: 'Status', value: inv.status },
                              ],
                            })}>Print</button>
                          </div>
                        </td>
                      </>
                    )}
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
