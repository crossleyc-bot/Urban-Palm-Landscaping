import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api';
import { useToast } from '../../components/ui/Toast';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/Skeleton';
import Spinner from '../../components/ui/Spinner';

const emptyForm = { name: '', description: '', price: '', icon: '' };

export default function ManageServices() {
  const { addToast } = useToast();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet('/services').then(setServices).finally(() => setLoading(false));
  }, []);

  const startEdit = (svc) => {
    setAdding(false);
    setEditing(svc.id);
    setForm({ name: svc.name, description: svc.description || '', price: svc.price || '', icon: svc.icon || '' });
  };

  const startAdd = () => {
    setEditing(null);
    setAdding(true);
    setForm(emptyForm);
  };

  const cancel = () => {
    setEditing(null);
    setAdding(false);
    setForm(emptyForm);
  };

  const saveEdit = async (id) => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await apiPut(`/services/${id}`, form);
      setServices(prev => prev.map(s => s.id === id ? { ...s, ...form } : s));
      setEditing(null);
      addToast('Service updated successfully', 'success');
    } catch {
      addToast('Failed to update service', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveNew = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const created = await apiPost('/services', form);
      setServices(prev => [...prev, { id: created.id, ...form }]);
      setAdding(false);
      setForm(emptyForm);
      addToast('Service added successfully', 'success');
    } catch {
      addToast('Failed to add service', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteService = async (id) => {
    try {
      await apiDelete(`/services/${id}`);
      setServices(prev => prev.filter(s => s.id !== id));
      addToast('Service deleted', 'success');
    } catch {
      addToast('Failed to delete service', 'error');
    }
  };

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h1>Services</h1>
          <p>Manage the services displayed across the website.</p>
        </div>
        <div className="page-loading"><Spinner size={24} /> Loading services...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Services</h1>
          <p>Manage the services displayed across the website.</p>
        </div>
        {!adding && (
          <button className="btn btn-primary" onClick={startAdd}>+ Add Service</button>
        )}
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: '50px' }}>Icon</th>
                <th>Name</th>
                <th>Description</th>
                <th>Price</th>
                <th style={{ width: '140px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.length === 0 && !adding ? (
                <tr>
                  <td colSpan="5">
                    <EmptyState icon="&#127793;" title="No services yet" message="Add your first service to get started." />
                  </td>
                </tr>
              ) : (
                <>
                  {services.map((svc) => (
                    <tr key={svc.id}>
                      {editing === svc.id ? (
                        <>
                          <td><input className="table-input" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="🌿" style={{ width: '50px', textAlign: 'center' }} /></td>
                          <td><input className="table-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Service name" /></td>
                          <td><input className="table-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" /></td>
                          <td><input className="table-input" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="From $100" style={{ width: '110px' }} /></td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button className="btn btn-primary btn-sm" onClick={() => saveEdit(svc.id)} disabled={saving}>Save</button>
                              <button className="btn btn-outline btn-sm" onClick={cancel}>Cancel</button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td style={{ fontSize: '1.5rem', textAlign: 'center' }}>{svc.icon || '\u2014'}</td>
                          <td style={{ fontWeight: 600 }}>{svc.name}</td>
                          <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', maxWidth: '300px' }}>{svc.description || '\u2014'}</td>
                          <td style={{ fontWeight: 500, color: 'var(--color-primary)' }}>{svc.price || '\u2014'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button className="btn btn-outline btn-sm" onClick={() => startEdit(svc)}>Edit</button>
                              <button className="btn btn-outline btn-sm" style={{ color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => deleteService(svc.id)}>Delete</button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}

                  {adding && (
                    <tr>
                      <td><input className="table-input" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="🌿" style={{ width: '50px', textAlign: 'center' }} /></td>
                      <td><input className="table-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Service name" /></td>
                      <td><input className="table-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" /></td>
                      <td><input className="table-input" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="From $100" style={{ width: '110px' }} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button className="btn btn-primary btn-sm" onClick={saveNew} disabled={saving || !form.name.trim()}>Add</button>
                          <button className="btn btn-outline btn-sm" onClick={cancel}>Cancel</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>Where services appear</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
          Changes to this table are reflected automatically across the website: the Services page,
          Home page preview, Contact form dropdown, customer Quote Request form, and Schedule Service form.
        </p>
      </div>
    </div>
  );
}
