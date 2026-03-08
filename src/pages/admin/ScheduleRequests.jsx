import { useState, useEffect, useMemo } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api';
import { useToast } from '../../components/ui/Toast';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/Skeleton';
import Pagination from '../../components/ui/Pagination';
import SortableHeader from '../../components/ui/SortableHeader';

const STATUSES = ['Pending', 'Confirmed', 'Declined', 'Converted'];

const statusBadge = (status) => {
  const map = {
    'Pending': 'badge badge-yellow',
    'Confirmed': 'badge badge-green',
    'Declined': 'badge badge-red',
    'Converted': 'badge badge-purple',
  };
  return map[status] || 'badge badge-gray';
};

const PAGE_SIZE = 10;

export default function ScheduleRequests() {
  const { addToast } = useToast();
  const [requests, setRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('All');
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  // Convert modal
  const [convertModal, setConvertModal] = useState(null);
  const [convertForm, setConvertForm] = useState({ assignee: '', amount: '' });

  useEffect(() => {
    Promise.all([apiGet('/schedule'), apiGet('/employees')])
      .then(([r, e]) => { setRequests(r); setEmployees(e.filter(emp => emp.status === 'Active')); })
      .finally(() => setLoading(false));
  }, []);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
    setPage(1);
  };

  const filtered = filter === 'All' ? requests : requests.filter(r => (r.status || 'Pending') === filter);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = a[sortField] ?? '';
      const bVal = b[sortField] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const updateStatus = async (id, newStatus) => {
    try {
      await apiPut(`/schedule/${id}`, { status: newStatus });
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
      addToast(`Request ${newStatus.toLowerCase()}`, 'success');
    } catch {
      addToast('Failed to update status', 'error');
    }
  };

  const openConvert = (req) => {
    setConvertModal(req);
    setConvertForm({ assignee: '', amount: '' });
  };

  const doConvert = async () => {
    if (!convertModal) return;
    const r = convertModal;
    try {
      await apiPost('/jobs', {
        client: r.user_name || 'Walk-in',
        service: r.service,
        assignee: convertForm.assignee || 'Unassigned',
        date: r.date,
        schedule_id: r.id,
        user_id: r.user_id,
        address: r.address,
        amount: convertForm.amount ? Number(convertForm.amount) : null,
      });
      setRequests(prev => prev.map(req => req.id === r.id ? { ...req, status: 'Converted' } : req));
      setConvertModal(null);
      addToast('Schedule request converted to job', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to convert', 'error');
    }
  };

  const deleteRequest = async (id) => {
    if (!confirm('Delete this schedule request?')) return;
    try {
      await apiDelete(`/schedule/${id}`);
      setRequests(prev => prev.filter(r => r.id !== id));
      addToast('Schedule request deleted', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to delete schedule request', 'error');
    }
  };

  const pendingCount = requests.filter(r => (r.status || 'Pending') === 'Pending').length;

  return (
    <div>
      <div className="page-header">
        <h1>Schedule Requests</h1>
        <p>View and manage incoming service scheduling requests from customers.</p>
      </div>

      {/* Stats */}
      <div className="stats-grid stagger-list" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">Total Requests</div>
          <div className="stat-value">{requests.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending</div>
          <div className="stat-value" style={pendingCount > 0 ? { color: '#d97706' } : {}}>{pendingCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Confirmed</div>
          <div className="stat-value" style={{ color: '#16a34a' }}>{requests.filter(r => r.status === 'Confirmed').length}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['All', ...STATUSES].map(f => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => { setFilter(f); setPage(1); }}
          >
            {f}{f !== 'All' && ` (${requests.filter(r => (r.status || 'Pending') === f).length})`}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: 50 }}>ID</th>
                <SortableHeader label="Service" field="service" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Date" field="date" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th>Time</th>
                <th>Frequency</th>
                <th>Address</th>
                <th>Notes</th>
                <SortableHeader label="Status" field="status" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Submitted" field="created_at" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTable rows={5} cols={10} />
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan="10">
                    <EmptyState icon="&#128198;" title="No schedule requests yet" message="Schedule requests from customers will appear here." />
                  </td>
                </tr>
              ) : (
                paginated.map((r) => {
                  const st = r.status || 'Pending';
                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 500 }}>#{r.id}</td>
                      <td>{r.service}</td>
                      <td>{r.date}</td>
                      <td>{r.time || '\u2014'}</td>
                      <td>{r.frequency || '\u2014'}</td>
                      <td style={{ maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.address}>{r.address}</td>
                      <td style={{ maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.notes}>{r.notes || '\u2014'}</td>
                      <td><span className={statusBadge(st)}>{st}</span></td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {r.created_at ? new Date(r.created_at).toLocaleDateString() : '\u2014'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          {st === 'Pending' && (
                            <>
                              <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(r.id, 'Confirmed')}>Confirm</button>
                              <button className="btn btn-outline btn-sm" style={{ color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => updateStatus(r.id, 'Declined')}>Decline</button>
                            </>
                          )}
                          {st === 'Confirmed' && (
                            <button className="btn btn-primary btn-sm" onClick={() => openConvert(r)}>Convert to Job</button>
                          )}
                          <button className="btn btn-outline btn-sm" style={{ color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => deleteRequest(r.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* Convert to Job modal */}
      {convertModal && (
        <div className="modal-overlay" onClick={() => setConvertModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3>Convert to Job</h3>
              <button className="modal-close" onClick={() => setConvertModal(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem', color: 'var(--color-text-muted)' }}>
                Create a job from schedule request #{convertModal.id} for <strong>{convertModal.service}</strong> on {convertModal.date}.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Assignee</label>
                  <select className="table-input" value={convertForm.assignee} onChange={e => setConvertForm(f => ({ ...f, assignee: e.target.value }))}>
                    <option value="">Unassigned</option>
                    {employees.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Amount ($)</label>
                  <input className="table-input" type="number" step="0.01" placeholder="Optional" value={convertForm.amount} onChange={e => setConvertForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setConvertModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={doConvert}>Create Job</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
