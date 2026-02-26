import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api';
import { useToast } from '../../components/ui/Toast';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';

const emptyForm = { name: '', contact_name: '', email: '', phone: '', address: '', website: '', notes: '', status: 'Active' };

export default function ManageSuppliers() {
  const { addToast } = useToast();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    apiGet('/suppliers').then(setSuppliers).finally(() => setLoading(false));
  }, []);

  const startEdit = (s) => {
    setAdding(false);
    setEditing(s.id);
    setForm({
      name: s.name, contact_name: s.contact_name || '', email: s.email || '',
      phone: s.phone || '', address: s.address || '', website: s.website || '',
      notes: s.notes || '', status: s.status,
    });
  };

  const startAdd = () => {
    setEditing(null);
    setAdding(true);
    setForm(emptyForm);
  };

  const cancel = () => { setEditing(null); setAdding(false); setForm(emptyForm); };

  const saveEdit = async (id) => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await apiPut(`/suppliers/${id}`, form);
      setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...form } : s));
      setEditing(null);
      addToast('Supplier updated', 'success');
    } catch { addToast('Failed to update supplier', 'error'); }
    finally { setSaving(false); }
  };

  const saveNew = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const created = await apiPost('/suppliers', form);
      setSuppliers(prev => [...prev, { id: created.id, ...form }]);
      setAdding(false);
      setForm(emptyForm);
      addToast('Supplier added', 'success');
    } catch { addToast('Failed to add supplier', 'error'); }
    finally { setSaving(false); }
  };

  const deleteSupplier = async (id) => {
    try {
      await apiDelete(`/suppliers/${id}`);
      setSuppliers(prev => prev.filter(s => s.id !== id));
      addToast('Supplier deleted', 'success');
    } catch { addToast('Failed to delete supplier', 'error'); }
  };

  if (loading) {
    return (
      <div>
        <div className="page-header"><h1>Suppliers</h1><p>Manage your material and plant suppliers.</p></div>
        <div className="page-loading"><Spinner size={24} /> Loading suppliers...</div>
      </div>
    );
  }

  const Field = ({ label, field, placeholder, type }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>{label}</label>
      {type === 'textarea' ? (
        <textarea className="table-input" value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} placeholder={placeholder} rows={2} style={{ resize: 'vertical' }} />
      ) : (
        <input className="table-input" value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} placeholder={placeholder} />
      )}
    </div>
  );

  const renderForm = (onSave, label) => (
    <div className="card" style={{ marginBottom: '1rem', padding: '1.5rem' }}>
      <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>{label === 'Add' ? 'New Supplier' : 'Edit Supplier'}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
        <Field label="Company Name *" field="name" placeholder="ABC Nursery" />
        <Field label="Contact Person" field="contact_name" placeholder="John Smith" />
        <Field label="Email" field="email" placeholder="info@supplier.com" />
        <Field label="Phone" field="phone" placeholder="(555) 000-0000" />
        <Field label="Address" field="address" placeholder="123 Main St, Orlando, FL" />
        <Field label="Website" field="website" placeholder="https://supplier.com" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Status</label>
          <select className="table-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>
      </div>
      <div style={{ marginTop: '0.75rem' }}>
        <Field label="Notes" field="notes" placeholder="Payment terms, delivery schedule, etc." type="textarea" />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <button className="btn btn-primary" onClick={onSave} disabled={saving || !form.name.trim()}>{label}</button>
        <button className="btn btn-outline" onClick={cancel}>Cancel</button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Suppliers</h1>
          <p>Manage your material and plant suppliers.</p>
        </div>
        {!adding && !editing && (
          <button className="btn btn-primary" onClick={startAdd}>+ Add Supplier</button>
        )}
      </div>

      {adding && renderForm(saveNew, 'Add')}
      {editing && renderForm(() => saveEdit(editing), 'Save')}

      {suppliers.length === 0 && !adding ? (
        <div className="card">
          <EmptyState icon="&#128230;" title="No suppliers yet" message="Add your first supplier to get started." />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {suppliers.map(s => (
            <div key={s.id} className="card" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '1rem' }}>{s.name}</div>
                    {s.contact_name && <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{s.contact_name}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className={`badge ${s.status === 'Active' ? 'badge-green' : 'badge-yellow'}`}>{s.status}</span>
                  <button className="btn btn-outline btn-sm" onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                    {expanded === s.id ? 'Collapse' : 'Details'}
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => startEdit(s)}>Edit</button>
                  <button className="btn btn-outline btn-sm" style={{ color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => deleteSupplier(s.id)}>Delete</button>
                </div>
              </div>

              {expanded === s.id && (
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.875rem' }}>
                  <div><span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>Email:</span> {s.email || '\u2014'}</div>
                  <div><span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>Phone:</span> {s.phone || '\u2014'}</div>
                  <div><span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>Address:</span> {s.address || '\u2014'}</div>
                  <div><span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>Website:</span> {s.website ? <a href={s.website} target="_blank" rel="noreferrer">{s.website}</a> : '\u2014'}</div>
                  {s.notes && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>Notes:</span> {s.notes}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
