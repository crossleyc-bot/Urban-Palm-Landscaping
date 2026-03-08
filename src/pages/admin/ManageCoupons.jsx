import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api';
import { useToast } from '../../components/ui/Toast';
import Spinner from '../../components/ui/Spinner';

const emptyForm = { code: '', type: 'percentage', value: '', min_order: '', max_uses: '', active: true, expires_at: '' };

export default function ManageCoupons() {
  const { addToast } = useToast();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet('/coupons').then(setCoupons).finally(() => setLoading(false));
  }, []);

  const openNew = () => { setForm(emptyForm); setModal('new'); };
  const openEdit = (c) => {
    setForm({
      code: c.code,
      type: c.type,
      value: c.value,
      min_order: c.min_order || '',
      max_uses: c.max_uses || '',
      active: !!c.active,
      expires_at: c.expires_at ? c.expires_at.split('T')[0] : '',
    });
    setModal(c);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.value) {
      addToast('Code and value are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        value: parseFloat(form.value),
        min_order: form.min_order ? parseFloat(form.min_order) : 0,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        expires_at: form.expires_at || null,
      };
      if (modal === 'new') {
        const created = await apiPost('/coupons', payload);
        setCoupons(prev => [created, ...prev]);
        addToast('Coupon created', 'success');
      } else {
        const updated = await apiPut(`/coupons/${modal.id}`, payload);
        setCoupons(prev => prev.map(c => c.id === modal.id ? updated : c));
        addToast('Coupon updated', 'success');
      }
      setModal(null);
    } catch (err) {
      addToast(err.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this coupon?')) return;
    try {
      await apiDelete(`/coupons/${id}`);
      setCoupons(prev => prev.filter(c => c.id !== id));
      addToast('Coupon deleted', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to delete', 'error');
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}><Spinner /></div>;

  const fieldStyle = { display: 'flex', flexDirection: 'column', gap: '0.25rem' };
  const labelStyle = { fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Coupons</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Manage discount codes for customers.</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ New Coupon</button>
      </div>

      {coupons.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>No coupons yet.</p>
          <button className="btn btn-primary" onClick={openNew}>Create Your First Coupon</button>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'auto' }}>
          <table className="admin-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Min Order</th>
                <th>Uses</th>
                <th>Expires</th>
                <th>Status</th>
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map(c => (
                <tr key={c.id}>
                  <td><code style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.code}</code></td>
                  <td>{c.type === 'percentage' ? `${c.value}%` : `$${c.value.toFixed(2)}`}</td>
                  <td>{c.min_order > 0 ? `$${c.min_order.toFixed(2)}` : '—'}</td>
                  <td>{c.uses_count}{c.max_uses ? ` / ${c.max_uses}` : ''}</td>
                  <td>{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : '—'}</td>
                  <td>
                    <span style={{
                      fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem',
                      borderRadius: 9999,
                      background: c.active ? '#f0fdf4' : '#fef2f2',
                      color: c.active ? '#16a34a' : '#dc2626',
                    }}>
                      {c.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(c)}>Edit</button>
                      <button className="btn btn-outline btn-sm" style={{ color: '#dc2626', borderColor: '#dc2626' }} onClick={() => handleDelete(c.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }} onClick={() => setModal(null)}>
          <div className="card" style={{ maxWidth: 480, width: '100%', padding: '1.5rem' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem' }}>
              {modal === 'new' ? 'New Coupon' : 'Edit Coupon'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Coupon Code</label>
                <input className="table-input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="e.g. SPRING20" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Type</label>
                  <select className="table-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount ($)</option>
                  </select>
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Value</label>
                  <input className="table-input" type="number" min="0" step="0.01" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder={form.type === 'percentage' ? 'e.g. 20' : 'e.g. 10.00'} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Minimum Order ($)</label>
                  <input className="table-input" type="number" min="0" step="0.01" value={form.min_order} onChange={e => setForm(f => ({ ...f, min_order: e.target.value }))} placeholder="0 = no minimum" />
                </div>
                <div style={fieldStyle}>
                  <label style={labelStyle}>Max Uses</label>
                  <input className="table-input" type="number" min="0" step="1" value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))} placeholder="Unlimited" />
                </div>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Expiration Date</label>
                <input className="table-input" type="date" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Active</span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : modal === 'new' ? 'Create Coupon' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
