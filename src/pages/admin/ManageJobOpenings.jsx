import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api';
import { useToast } from '../../components/ui/Toast';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';

const statuses = ['Open', 'Closed', 'Draft'];
const types = ['Full-time', 'Part-time', 'Seasonal', 'Contract'];
const departments = ['Operations', 'Design', 'Installation', 'Maintenance', 'Irrigation', 'Hardscaping', 'Administration'];

const emptyForm = { title: '', department: '', type: 'Full-time', location: 'Orlando, FL', description: '', requirements: '', status: 'Open' };

const statusBadge = (status) => {
  const map = { Open: 'badge badge-green', Closed: 'badge badge-gray', Draft: 'badge badge-yellow' };
  return map[status] || 'badge badge-gray';
};

export default function ManageJobOpenings() {
  const { addToast } = useToast();
  const [openings, setOpenings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet('/job-openings').then(setOpenings).finally(() => setLoading(false));
  }, []);

  const startEdit = (item) => {
    setAdding(false);
    setEditing(item.id);
    setForm({
      title: item.title, department: item.department || '', type: item.type || 'Full-time',
      location: item.location || '', description: item.description || '', requirements: item.requirements || '',
      status: item.status || 'Open',
    });
  };

  const startAdd = () => { setEditing(null); setAdding(true); setForm(emptyForm); };
  const cancel = () => { setEditing(null); setAdding(false); setForm(emptyForm); };

  const saveNew = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const created = await apiPost('/job-openings', form);
      setOpenings(prev => [created, ...prev]);
      setAdding(false);
      setForm(emptyForm);
      addToast('Job opening created', 'success');
    } catch { addToast('Failed to create job opening', 'error'); }
    finally { setSaving(false); }
  };

  const saveEdit = async (id) => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await apiPut(`/job-openings/${id}`, form);
      setOpenings(prev => prev.map(o => o.id === id ? { ...o, ...form } : o));
      setEditing(null);
      addToast('Job opening updated', 'success');
    } catch { addToast('Failed to update job opening', 'error'); }
    finally { setSaving(false); }
  };

  const deleteOpening = async (id) => {
    try {
      await apiDelete(`/job-openings/${id}`);
      setOpenings(prev => prev.filter(o => o.id !== id));
      addToast('Job opening deleted', 'success');
    } catch { addToast('Failed to delete', 'error'); }
  };

  if (loading) {
    return (
      <div>
        <div className="page-header"><h1>Job Openings</h1><p>Manage career listings on your website.</p></div>
        <div className="page-loading"><Spinner size={24} /> Loading...</div>
      </div>
    );
  }

  const formCard = (onSave, saveLabel) => (
    <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Title *</label>
          <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Landscape Technician" />
        </div>
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Department</label>
          <select className="input" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
            <option value="">Select...</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Type</label>
          <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Location</label>
          <input className="input" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Orlando, FL" />
        </div>
        <div>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Status</label>
          <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginTop: '1rem' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Description</label>
        <textarea className="input" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the role and responsibilities..." />
      </div>
      <div style={{ marginTop: '1rem' }}>
        <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Requirements</label>
        <textarea className="input" rows={3} value={form.requirements} onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))} placeholder="List qualifications, one per line..." />
      </div>
      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
        <button className="btn btn-primary" onClick={onSave} disabled={saving || !form.title.trim()}>{saveLabel}</button>
        <button className="btn btn-outline" onClick={cancel}>Cancel</button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Job Openings</h1>
          <p>Manage career listings on your website.</p>
        </div>
        {!adding && <button className="btn btn-primary" onClick={startAdd}>+ Add Opening</button>}
      </div>

      <div className="stats-grid stagger-list">
        <div className="stat-card">
          <div className="stat-label">Total Listings</div>
          <div className="stat-value">{openings.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Open Positions</div>
          <div className="stat-value">{openings.filter(o => o.status === 'Open').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Closed</div>
          <div className="stat-value">{openings.filter(o => o.status === 'Closed').length}</div>
        </div>
      </div>

      {adding && formCard(saveNew, 'Create')}
      {editing && formCard(() => saveEdit(editing), 'Save')}

      {openings.length === 0 && !adding ? (
        <EmptyState icon="&#128188;" title="No job openings" message="Create your first job listing to display on the Careers page." />
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Department</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th style={{ width: '160px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {openings.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600 }}>{o.title}</td>
                    <td>{o.department || '\u2014'}</td>
                    <td><span className="badge badge-blue">{o.type}</span></td>
                    <td>{o.location}</td>
                    <td><span className={statusBadge(o.status)}>{o.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => startEdit(o)}>Edit</button>
                        <button className="btn btn-outline btn-sm" style={{ color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => deleteOpening(o.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
