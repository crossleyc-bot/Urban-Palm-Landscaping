import { useState, useEffect, useRef } from 'react';
import { apiGet, apiPost, apiPut, apiDelete, apiPostForm } from '../../api';
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
  const [importing, setImporting] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const fileRef = useRef();

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

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const result = await apiPostForm('/suppliers/import', fd);
      addToast(`Imported ${result.imported} supplier${result.imported !== 1 ? 's' : ''}${result.skipped ? ` (${result.skipped} skipped)` : ''}`, 'success');
      const updated = await apiGet('/suppliers');
      setSuppliers(updated);
    } catch (err) {
      addToast(err.message || 'Import failed', 'error');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDeleteAll = async () => {
    try {
      await apiDelete('/suppliers');
      setSuppliers([]);
      setConfirmDeleteAll(false);
      addToast('All suppliers removed', 'success');
    } catch { addToast('Failed to remove suppliers', 'error'); }
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
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={startAdd}>+ Add Supplier</button>
            <button className="btn btn-outline" onClick={() => fileRef.current?.click()} disabled={importing}>
              {importing ? 'Importing...' : 'Import CSV/Excel'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleImport}
              style={{ display: 'none' }}
            />
            {suppliers.length > 0 && (
              <button
                className="btn btn-outline"
                style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                onClick={() => setConfirmDeleteAll(true)}
              >
                Remove All
              </button>
            )}
          </div>
        )}
      </div>

      {/* Delete All Confirmation */}
      {confirmDeleteAll && (
        <div className="card" style={{ marginBottom: '1rem', padding: '1.25rem', border: '1px solid #fca5a5', background: 'rgba(220, 38, 38, 0.04)' }}>
          <div style={{ fontWeight: 600, color: '#dc2626', marginBottom: '0.5rem' }}>Remove All Suppliers?</div>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            This will permanently delete all {suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''} and their associated inventory items. This action cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary" style={{ background: '#dc2626', borderColor: '#dc2626' }} onClick={handleDeleteAll}>
              Yes, Remove All
            </button>
            <button className="btn btn-outline" onClick={() => setConfirmDeleteAll(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Import Instructions */}
      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Bulk Import</div>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
          Upload a CSV or Excel file with columns: <strong>name</strong> (required), contact_name, email, phone, address, website, notes, status.
          Column headers are flexible (e.g., "Company Name", "Contact Person", "Phone Number" all work).
        </p>
      </div>

      {adding && renderForm(saveNew, 'Add')}
      {editing && renderForm(() => saveEdit(editing), 'Save')}

      {suppliers.length === 0 && !adding ? (
        <div className="card">
          <EmptyState icon="&#128230;" title="No suppliers yet" message="Add your first supplier or import from a CSV/Excel file." />
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
