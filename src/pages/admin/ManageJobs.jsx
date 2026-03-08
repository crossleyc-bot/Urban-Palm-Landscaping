import { useState, useEffect, useMemo } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api';
import { useToast } from '../../components/ui/Toast';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/Skeleton';
import Pagination from '../../components/ui/Pagination';
import SortableHeader from '../../components/ui/SortableHeader';

const statusBadge = (status) => {
  const map = {
    'Completed': 'badge badge-green',
    'In Progress': 'badge badge-blue',
    'Scheduled': 'badge badge-yellow',
  };
  return map[status] || 'badge badge-gray';
};

const PAGE_SIZE = 10;

export default function ManageJobs() {
  const { addToast } = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('id');
  const [sortDir, setSortDir] = useState('asc');
  const [search, setSearch] = useState('');

  // Invoice generation modal
  const [invoiceModal, setInvoiceModal] = useState(null);
  const [invoiceForm, setInvoiceForm] = useState({ amount: '', due_date: '' });
  const [invoiceSaving, setInvoiceSaving] = useState(false);

  useEffect(() => {
    apiGet('/jobs').then(setJobs).finally(() => setLoading(false));
  }, []);

  const searchFiltered = jobs.filter(j => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (j.client || '').toLowerCase().includes(s) ||
      (j.service || '').toLowerCase().includes(s) ||
      (j.assignee || '').toLowerCase().includes(s) ||
      (j.status || '').toLowerCase().includes(s)
    );
  });

  const filtered = filter === 'All' ? searchFiltered : searchFiltered.filter(j => j.status === filter);

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

  const updateStatus = async (id, newStatus) => {
    try {
      await apiPut(`/jobs/${id}/status`, { status: newStatus });
      setJobs(jobs.map(j => j.id === id ? { ...j, status: newStatus } : j));
      addToast(`Job marked as ${newStatus}`, 'success');
    } catch {
      addToast('Failed to update job status', 'error');
    }
  };

  const deleteJob = async (jobId) => {
    if (!confirm('Delete this job?')) return;
    try {
      await apiDelete(`/jobs/${jobId}`);
      setJobs(prev => prev.filter(j => j.id !== jobId));
      addToast('Job deleted', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to delete job', 'error');
    }
  };

  const openInvoiceModal = (job) => {
    setInvoiceModal(job);
    const dueDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    setInvoiceForm({ amount: job.amount || '', due_date: dueDate });
  };

  const generateInvoice = async () => {
    if (!invoiceModal) return;
    setInvoiceSaving(true);
    try {
      await apiPost('/invoices', {
        client: invoiceModal.client,
        amount: Number(invoiceForm.amount),
        job_id: invoiceModal.id,
        user_id: invoiceModal.user_id,
        due_date: invoiceForm.due_date,
      });
      setInvoiceModal(null);
      addToast('Invoice generated successfully', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to generate invoice', 'error');
    } finally {
      setInvoiceSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Manage Jobs</h1>
        <p>View and manage all landscaping jobs.</p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['All', 'Scheduled', 'In Progress', 'Completed'].map(f => (
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
            placeholder="Search jobs by client, service, or status..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 400 }}
          />
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <SortableHeader label="Job ID" field="id" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Client" field="client" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Service" field="service" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Assignee" field="assignee" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Date" field="date" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th>Amount</th>
                <th>Status</th>
                <th>Source</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTable rows={5} cols={9} />
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan="9">
                    <EmptyState icon="&#128188;" title="No jobs found" message={filter !== 'All' ? `No ${filter.toLowerCase()} jobs.` : 'Jobs will appear here once created.'} />
                  </td>
                </tr>
              ) : (
                paginated.map((job) => (
                  <tr key={job.id}>
                    <td style={{ fontWeight: 500 }}>{job.id}</td>
                    <td>{job.client}</td>
                    <td>{job.service}</td>
                    <td>{job.assignee}</td>
                    <td>{job.date}</td>
                    <td>{job.amount ? `$${Number(job.amount).toLocaleString()}` : '\u2014'}</td>
                    <td><span className={statusBadge(job.status)}>{job.status}</span></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      {job.quote_id ? `Quote #${job.quote_id}` : job.schedule_id ? `Schedule #${job.schedule_id}` : '\u2014'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {job.status === 'Scheduled' && (
                          <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(job.id, 'In Progress')}>
                            Start
                          </button>
                        )}
                        {job.status === 'In Progress' && (
                          <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(job.id, 'Completed')}>
                            Complete
                          </button>
                        )}
                        {job.status === 'Completed' && (
                          <button className="btn btn-primary btn-sm" onClick={() => openInvoiceModal(job)}>
                            Invoice
                          </button>
                        )}
                        <button className="btn btn-outline btn-sm" style={{ color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => deleteJob(job.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* Generate Invoice modal */}
      {invoiceModal && (
        <div className="modal-overlay" onClick={() => setInvoiceModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3>Generate Invoice for {invoiceModal.id}</h3>
              <button className="modal-close" onClick={() => setInvoiceModal(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem', color: 'var(--color-text-muted)' }}>
                Create an invoice for <strong>{invoiceModal.client}</strong> &mdash; {invoiceModal.service}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Amount ($) *</label>
                  <input className="table-input" type="number" step="0.01" value={invoiceForm.amount} onChange={e => setInvoiceForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Due Date *</label>
                  <input className="table-input" type="date" value={invoiceForm.due_date} onChange={e => setInvoiceForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setInvoiceModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={generateInvoice} disabled={invoiceSaving || !invoiceForm.amount || !invoiceForm.due_date}>
                {invoiceSaving ? 'Creating...' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
