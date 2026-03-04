import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api';
import { useToast } from '../../components/ui/Toast';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/Skeleton';
import Pagination from '../../components/ui/Pagination';
import SortableHeader from '../../components/ui/SortableHeader';

const QUOTE_STATUSES = ['Pending', 'Replied', 'Approved', 'Declined', 'Converted'];
const PROPERTY_TYPES = ['Residential - Small Yard', 'Residential - Large Yard', 'Commercial - Small', 'Commercial - Large'];
const TIMELINES = ['As soon as possible', 'Within 1-2 weeks', 'Within a month', 'Flexible'];
const BUDGETS = ['Under $500', '$500 - $1,000', '$1,000 - $5,000', '$5,000+'];

const statusBadge = (status) => {
  const map = {
    'Pending': 'badge badge-yellow',
    'Replied': 'badge badge-blue',
    'Approved': 'badge badge-green',
    'Declined': 'badge badge-red',
    'Converted': 'badge badge-purple',
  };
  return map[status] || 'badge badge-gray';
};

const PAGE_SIZE = 10;

const emptyForm = {
  service: '', property_type: '', timeline: '', budget: '',
  details: '', address: '', status: 'Pending', admin_reply: '',
};

export default function QuoteRequests() {
  const { addToast } = useToast();
  const [quotes, setQuotes] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('All');
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  // Modal state
  const [selected, setSelected] = useState(null);    // viewing quote
  const [editing, setEditing] = useState(false);      // edit mode on
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    Promise.all([apiGet('/quotes'), apiGet('/services'), apiGet('/employees')])
      .then(([q, s, e]) => { setQuotes(q); setServices(s); setEmployees(e.filter(emp => emp.status === 'Active')); })
      .finally(() => setLoading(false));
  }, []);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
    setPage(1);
  };

  const filtered = filter === 'All' ? quotes : quotes.filter(q => (q.status || 'Pending') === filter);

  const sorted = [...filtered].sort((a, b) => {
    let aVal = a[sortField] ?? '';
    let bVal = b[sortField] ?? '';
    const cmp = String(aVal).localeCompare(String(bVal));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openView = (quote) => {
    setSelected(quote);
    setEditing(false);
    setForm({
      service: quote.service || '',
      property_type: quote.property_type || '',
      timeline: quote.timeline || '',
      budget: quote.budget || '',
      details: quote.details || '',
      address: quote.address || '',
      status: quote.status || 'Pending',
      admin_reply: quote.admin_reply || '',
    });
  };

  const closeModal = () => {
    setSelected(null);
    setEditing(false);
    setForm(emptyForm);
    setConfirmDelete(null);
  };

  const startEdit = () => setEditing(true);
  const cancelEdit = () => {
    setEditing(false);
    if (selected) {
      setForm({
        service: selected.service || '',
        property_type: selected.property_type || '',
        timeline: selected.timeline || '',
        budget: selected.budget || '',
        details: selected.details || '',
        address: selected.address || '',
        status: selected.status || 'Pending',
        admin_reply: selected.admin_reply || '',
      });
    }
  };

  const saveEdit = async () => {
    if (!form.service.trim() || !form.details.trim() || !form.address.trim()) {
      addToast('Service, details, and address are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const updated = await apiPut(`/quotes/${selected.id}`, form);
      setQuotes(prev => prev.map(q => q.id === selected.id ? updated : q));
      setSelected(updated);
      setEditing(false);
      addToast('Quote request updated', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update', 'error');
    } finally { setSaving(false); }
  };

  const doDelete = async (id) => {
    try {
      await apiDelete(`/quotes/${id}`);
      setQuotes(prev => prev.filter(q => q.id !== id));
      closeModal();
      addToast('Quote request deleted', 'success');
    } catch {
      addToast('Failed to delete', 'error');
    }
  };

  const [convertModal, setConvertModal] = useState(null);
  const [convertForm, setConvertForm] = useState({ assignee: '', date: '', amount: '' });

  const openConvert = (quote) => {
    setConvertModal(quote);
    setConvertForm({ assignee: '', date: new Date().toISOString().split('T')[0], amount: '' });
  };

  const doConvert = async () => {
    if (!convertModal) return;
    const q = convertModal;
    try {
      await apiPost('/jobs', {
        client: q.user_name || 'Walk-in',
        service: q.service,
        assignee: convertForm.assignee || 'Unassigned',
        date: convertForm.date,
        quote_id: q.id,
        user_id: q.user_id,
        address: q.address,
        amount: convertForm.amount ? Number(convertForm.amount) : null,
      });
      setQuotes(prev => prev.map(qt => qt.id === q.id ? { ...qt, status: 'Converted' } : qt));
      setConvertModal(null);
      closeModal();
      addToast('Quote converted to job successfully', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to convert to job', 'error');
    }
  };

  // Quick status change from the table
  const quickStatusChange = async (quote, newStatus) => {
    try {
      const payload = {
        service: quote.service, property_type: quote.property_type,
        timeline: quote.timeline, budget: quote.budget,
        details: quote.details, address: quote.address,
        status: newStatus, admin_reply: quote.admin_reply,
      };
      const updated = await apiPut(`/quotes/${quote.id}`, payload);
      setQuotes(prev => prev.map(q => q.id === quote.id ? updated : q));
    } catch {
      addToast('Failed to update status', 'error');
    }
  };

  const pendingCount = quotes.filter(q => (q.status || 'Pending') === 'Pending').length;

  return (
    <div>
      <div className="page-header">
        <h1>Quote Requests</h1>
        <p>View and respond to incoming quote requests from customers.</p>
      </div>

      {/* Stats */}
      <div className="stats-grid stagger-list" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">Total Requests</div>
          <div className="stat-value">{quotes.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Pending</div>
          <div className="stat-value" style={pendingCount > 0 ? { color: '#d97706' } : {}}>{pendingCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Approved</div>
          <div className="stat-value" style={{ color: 'var(--color-primary)' }}>{quotes.filter(q => q.status === 'Approved').length}</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['All', ...QUOTE_STATUSES].map(f => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => { setFilter(f); setPage(1); }}
          >
            {f}{f !== 'All' && ` (${quotes.filter(q => (q.status || 'Pending') === f).length})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: 50 }}>ID</th>
                <SortableHeader label="Service" field="service" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th>Property</th>
                <th>Budget</th>
                <SortableHeader label="Address" field="address" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th>Details</th>
                <SortableHeader label="Status" field="status" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Date" field="created_at" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTable rows={5} cols={9} />
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan="9">
                    <EmptyState icon="&#9993;" title="No quote requests yet" message="Quote requests from customers will appear here." />
                  </td>
                </tr>
              ) : (
                paginated.map((q) => (
                  <tr key={q.id}>
                    <td style={{ fontWeight: 500 }}>#{q.id}</td>
                    <td style={{ fontWeight: 500 }}>{q.service}</td>
                    <td>{q.property_type || '\u2014'}</td>
                    <td>{q.budget || '\u2014'}</td>
                    <td style={{ maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={q.address}>{q.address}</td>
                    <td style={{ maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={q.details}>{q.details}</td>
                    <td>
                      <select
                        className="table-select"
                        value={q.status || 'Pending'}
                        onChange={e => quickStatusChange(q, e.target.value)}
                        style={{ width: 100 }}
                      >
                        {QUOTE_STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {q.created_at ? new Date(q.created_at + 'Z').toLocaleDateString() : '\u2014'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openView(q)}>View</button>
                        <button className="btn btn-outline btn-sm" style={{ color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => setConfirmDelete(q)}>Delete</button>
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

      {/* Delete confirmation */}
      {confirmDelete && !selected && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3>Delete Quote #{confirmDelete.id}?</h3>
              <button className="modal-close" onClick={() => setConfirmDelete(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <p>This will permanently delete the quote request from <strong>{confirmDelete.service}</strong>. This cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-primary" style={{ background: '#dc2626', borderColor: '#dc2626' }} onClick={() => { doDelete(confirmDelete.id); setConfirmDelete(null); }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* View / Edit modal */}
      {selected && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3>Quote Request #{selected.id}</h3>
              <button className="modal-close" onClick={closeModal}>&times;</button>
            </div>
            <div className="modal-body">
              {!editing ? (
                /* ── View mode ── */
                <>
                  <div className="quote-detail-grid">
                    <div><strong>Service:</strong> {selected.service}</div>
                    <div><strong>Property:</strong> {selected.property_type || '\u2014'}</div>
                    <div><strong>Timeline:</strong> {selected.timeline || '\u2014'}</div>
                    <div><strong>Budget:</strong> {selected.budget || '\u2014'}</div>
                    <div style={{ gridColumn: '1 / -1' }}><strong>Address:</strong> {selected.address}</div>
                    <div style={{ gridColumn: '1 / -1' }}><strong>Details:</strong><br /><span style={{ whiteSpace: 'pre-wrap' }}>{selected.details}</span></div>
                  </div>
                  <div style={{ margin: '1rem 0', padding: '0.75rem', background: 'var(--color-bg-secondary)', borderRadius: 8, display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div><strong>Status:</strong> <span className={statusBadge(selected.status || 'Pending')}>{selected.status || 'Pending'}</span></div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Submitted {selected.created_at ? new Date(selected.created_at + 'Z').toLocaleString() : '\u2014'}</div>
                  </div>
                  {selected.admin_reply && (
                    <div style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 8, marginBottom: '0.5rem' }}>
                      <strong style={{ fontSize: '0.85rem' }}>Admin Reply:</strong>
                      <p style={{ marginTop: '0.35rem', whiteSpace: 'pre-wrap', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>{selected.admin_reply}</p>
                    </div>
                  )}
                </>
              ) : (
                /* ── Edit mode ── */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Service *</label>
                      <select
                        className="table-input"
                        value={form.service}
                        onChange={e => setForm(f => ({ ...f, service: e.target.value }))}
                      >
                        <option value="">Select...</option>
                        {services.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        {/* Keep current value if it's not in the services list */}
                        {form.service && !services.find(s => s.name === form.service) && (
                          <option value={form.service}>{form.service}</option>
                        )}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Property Type</label>
                      <select
                        className="table-input"
                        value={form.property_type}
                        onChange={e => setForm(f => ({ ...f, property_type: e.target.value }))}
                      >
                        <option value="">None</option>
                        {PROPERTY_TYPES.map(p => <option key={p}>{p}</option>)}
                        {form.property_type && !PROPERTY_TYPES.includes(form.property_type) && (
                          <option value={form.property_type}>{form.property_type}</option>
                        )}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Timeline</label>
                      <select
                        className="table-input"
                        value={form.timeline}
                        onChange={e => setForm(f => ({ ...f, timeline: e.target.value }))}
                      >
                        <option value="">None</option>
                        {TIMELINES.map(t => <option key={t}>{t}</option>)}
                        {form.timeline && !TIMELINES.includes(form.timeline) && (
                          <option value={form.timeline}>{form.timeline}</option>
                        )}
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Budget</label>
                      <select
                        className="table-input"
                        value={form.budget}
                        onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                      >
                        <option value="">None</option>
                        {BUDGETS.map(b => <option key={b}>{b}</option>)}
                        {form.budget && !BUDGETS.includes(form.budget) && (
                          <option value={form.budget}>{form.budget}</option>
                        )}
                      </select>
                    </div>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Address *</label>
                    <input
                      className="table-input"
                      value={form.address}
                      onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                      placeholder="Property address"
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Details *</label>
                    <textarea
                      className="table-input"
                      value={form.details}
                      onChange={e => setForm(f => ({ ...f, details: e.target.value }))}
                      rows={4}
                      placeholder="Project details..."
                      style={{ resize: 'vertical', fontFamily: 'inherit' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Status</label>
                      <select
                        className="table-input"
                        value={form.status}
                        onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                      >
                        {QUOTE_STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Admin Reply</label>
                    <textarea
                      className="table-input"
                      value={form.admin_reply}
                      onChange={e => setForm(f => ({ ...f, admin_reply: e.target.value }))}
                      rows={3}
                      placeholder="Reply to the customer..."
                      style={{ resize: 'vertical', fontFamily: 'inherit' }}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              {!editing ? (
                <>
                  <button className="btn btn-outline" onClick={closeModal}>Close</button>
                  {(selected.status === 'Approved' || selected.status === 'Replied') && selected.status !== 'Converted' && (
                    <button className="btn btn-secondary" onClick={() => openConvert(selected)}>Convert to Job</button>
                  )}
                  <button className="btn btn-primary" onClick={startEdit}>Edit</button>
                </>
              ) : (
                <>
                  <button className="btn btn-outline" onClick={cancelEdit}>Cancel</button>
                  <button
                    className="btn btn-primary"
                    onClick={saveEdit}
                    disabled={saving || !form.service.trim() || !form.details.trim() || !form.address.trim()}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Convert to Job modal */}
      {convertModal && (
        <div className="modal-overlay" onClick={() => setConvertModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>Convert Quote #{convertModal.id} to Job</h3>
              <button className="modal-close" onClick={() => setConvertModal(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem', color: 'var(--color-text-muted)' }}>
                Create a job from this quote for <strong>{convertModal.service}</strong> at {convertModal.address}.
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
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Scheduled Date *</label>
                  <input className="table-input" type="date" value={convertForm.date} onChange={e => setConvertForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Amount ($)</label>
                  <input className="table-input" type="number" step="0.01" placeholder="Optional" value={convertForm.amount} onChange={e => setConvertForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setConvertModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={doConvert} disabled={!convertForm.date}>Create Job</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
