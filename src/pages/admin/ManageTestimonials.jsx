import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api';
import { useToast } from '../../components/ui/Toast';
import Spinner from '../../components/ui/Spinner';

const emptyForm = { name: '', text: '', rating: 5 };

export default function ManageTestimonials() {
  const { addToast } = useToast();
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet('/testimonials').then(setTestimonials).finally(() => setLoading(false));
  }, []);

  const openNew = () => { setModal('new'); setForm({ ...emptyForm }); };
  const openEdit = (t) => { setModal(t); setForm({ name: t.name, text: t.text, rating: t.rating }); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.text.trim()) {
      addToast('Name and text are required', 'error');
      return;
    }
    setSaving(true);
    try {
      if (modal === 'new') {
        const created = await apiPost('/testimonials', form);
        setTestimonials(prev => [...prev, created]);
        addToast('Testimonial added', 'success');
      } else {
        const updated = await apiPut(`/testimonials/${modal.id}`, form);
        setTestimonials(prev => prev.map(t => t.id === modal.id ? updated : t));
        addToast('Testimonial updated', 'success');
      }
      setModal(null);
    } catch (err) {
      addToast(err.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t) => {
    if (!confirm(`Delete testimonial from "${t.name}"?`)) return;
    try {
      await apiDelete(`/testimonials/${t.id}`);
      setTestimonials(prev => prev.filter(x => x.id !== t.id));
      addToast('Testimonial deleted', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to delete', 'error');
    }
  };

  if (loading) {
    return (
      <div>
        <div className="page-header"><h1>Manage Testimonials</h1><p>Add, edit, or remove customer testimonials shown on the homepage.</p></div>
        <div className="page-loading"><Spinner size={24} /> Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Manage Testimonials</h1>
          <p>Add, edit, or remove customer testimonials shown on the homepage.</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>Add Testimonial</button>
      </div>

      {testimonials.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          No testimonials yet. Add one to get started.
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Testimonial</th>
                  <th>Rating</th>
                  <th style={{ width: 120 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {testimonials.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{t.name}</td>
                    <td style={{ fontSize: '0.85rem', maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.text}</td>
                    <td>{'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(t)}>Edit</button>
                        <button className="btn btn-outline btn-sm" style={{ color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => handleDelete(t)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3>{modal === 'new' ? 'Add Testimonial' : 'Edit Testimonial'}</h3>
              <button className="modal-close" onClick={() => setModal(null)}>&times;</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Customer Name *</label>
                <input className="table-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Smith" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Testimonial Text *</label>
                <textarea className="table-input" rows={4} value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} placeholder="What the customer said..." style={{ resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxWidth: 120 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Rating (1-5)</label>
                <select className="table-input" value={form.rating} onChange={e => setForm(f => ({ ...f, rating: Number(e.target.value) }))}>
                  {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} Star{n !== 1 ? 's' : ''}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : modal === 'new' ? 'Add' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
