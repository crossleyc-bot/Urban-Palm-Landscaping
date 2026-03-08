import { useState, useEffect, useRef } from 'react';
import { apiGet, apiPostForm, apiPutForm, apiDelete } from '../../api';
import { useToast } from '../../components/ui/Toast';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';

const emptyForm = { name: '', description: '', price: '', icon: '', on_sale: '0', sale_label: '' };

const thumbStyle = {
  width: 120, height: 80, objectFit: 'cover', borderRadius: 8,
  border: '1px solid var(--color-border)',
};
const thumbPlaceholder = {
  ...thumbStyle, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)',
  fontSize: '0.75rem', fontWeight: 500,
};

function PhotoUpload({ label, preview, onPick }) {
  const ref = useRef();
  const handleChange = (e) => { const f = e.target.files[0]; if (f) onPick(f); };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>{label}</label>
      {preview
        ? <img src={preview} alt={label} style={thumbStyle} />
        : <div style={thumbPlaceholder}>No photo</div>
      }
      <button type="button" className="btn btn-outline btn-sm" onClick={() => ref.current.click()} style={{ alignSelf: 'flex-start' }}>
        {preview ? 'Change' : 'Upload'}
      </button>
      <input ref={ref} type="file" accept="image/*" onChange={handleChange} style={{ display: 'none' }} />
    </div>
  );
}

function ImagePairUploader({ serviceId, onUploaded }) {
  const { addToast } = useToast();
  const [beforeFile, setBeforeFile] = useState(null);
  const [afterFile, setAfterFile] = useState(null);
  const [beforePreview, setBeforePreview] = useState(null);
  const [afterPreview, setAfterPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  const clearFiles = () => {
    setBeforeFile(null); setAfterFile(null);
    if (beforePreview?.startsWith('blob:')) URL.revokeObjectURL(beforePreview);
    if (afterPreview?.startsWith('blob:')) URL.revokeObjectURL(afterPreview);
    setBeforePreview(null); setAfterPreview(null);
  };

  const pickBefore = (f) => { setBeforeFile(f); setBeforePreview(URL.createObjectURL(f)); };
  const pickAfter = (f) => { setAfterFile(f); setAfterPreview(URL.createObjectURL(f)); };

  const handleUpload = async () => {
    if (!beforeFile && !afterFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      if (beforeFile) fd.append('image_before', beforeFile);
      if (afterFile) fd.append('image_after', afterFile);
      const created = await apiPostForm(`/services/${serviceId}/images`, fd);
      onUploaded(created);
      clearFiles();
      addToast('Images uploaded', 'success');
    } catch { addToast('Failed to upload images', 'error'); }
    finally { setUploading(false); }
  };

  return (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap', padding: '0.75rem', background: 'var(--color-bg-secondary)', borderRadius: 8 }}>
      <PhotoUpload label="Before" preview={beforePreview} onPick={pickBefore} />
      <PhotoUpload label="After" preview={afterPreview} onPick={pickAfter} />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button className="btn btn-primary btn-sm" onClick={handleUpload} disabled={uploading || (!beforeFile && !afterFile)}>
          {uploading ? 'Uploading...' : 'Add Pair'}
        </button>
        {(beforeFile || afterFile) && (
          <button className="btn btn-outline btn-sm" onClick={clearFiles}>Clear</button>
        )}
      </div>
    </div>
  );
}

export default function ManageServices() {
  const { addToast } = useToast();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [beforeFile, setBeforeFile] = useState(null);
  const [afterFile, setAfterFile] = useState(null);
  const [beforePreview, setBeforePreview] = useState(null);
  const [afterPreview, setAfterPreview] = useState(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet('/services').then(setServices).finally(() => setLoading(false));
  }, []);

  const clearFiles = () => {
    setBeforeFile(null); setAfterFile(null);
    if (beforePreview?.startsWith('blob:')) URL.revokeObjectURL(beforePreview);
    if (afterPreview?.startsWith('blob:')) URL.revokeObjectURL(afterPreview);
    setBeforePreview(null); setAfterPreview(null);
  };

  const pickBefore = (f) => { setBeforeFile(f); setBeforePreview(URL.createObjectURL(f)); };
  const pickAfter = (f) => { setAfterFile(f); setAfterPreview(URL.createObjectURL(f)); };

  const startEdit = (svc) => {
    setAdding(false);
    setEditing(svc.id);
    setForm({ name: svc.name, description: svc.description || '', price: svc.price || '', icon: svc.icon || '', on_sale: String(svc.on_sale ?? 0), sale_label: svc.sale_label || '' });
    setBeforeFile(null); setAfterFile(null);
    setBeforePreview(svc.image_before || null);
    setAfterPreview(svc.image_after || null);
  };

  const startAdd = () => {
    setEditing(null); setAdding(true);
    setForm(emptyForm); clearFiles();
  };

  const cancel = () => {
    setEditing(null); setAdding(false);
    setForm(emptyForm); clearFiles();
  };

  const buildFormData = () => {
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('description', form.description);
    fd.append('price', form.price);
    fd.append('icon', form.icon);
    fd.append('on_sale', form.on_sale);
    fd.append('sale_label', form.sale_label);
    if (beforeFile) fd.append('image_before', beforeFile);
    if (afterFile) fd.append('image_after', afterFile);
    return fd;
  };

  const saveEdit = async (id) => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const result = await apiPutForm(`/services/${id}`, buildFormData());
      setServices(prev => prev.map(s => s.id === id ? {
        ...s, ...form,
        image_before: result.image_before ?? s.image_before,
        image_after: result.image_after ?? s.image_after,
      } : s));
      setEditing(null); clearFiles();
      addToast('Service updated successfully', 'success');
    } catch { addToast('Failed to update service', 'error'); }
    finally { setSaving(false); }
  };

  const saveNew = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const created = await apiPostForm('/services', buildFormData());
      setServices(prev => [...prev, { id: created.id, ...form, image_before: created.image_before, image_after: created.image_after, images: [] }]);
      setAdding(false); setForm(emptyForm); clearFiles();
      addToast('Service added successfully', 'success');
    } catch { addToast('Failed to add service', 'error'); }
    finally { setSaving(false); }
  };

  const deleteService = async (id) => {
    if (!confirm('Delete this service?')) return;
    try {
      await apiDelete(`/services/${id}`);
      setServices(prev => prev.filter(s => s.id !== id));
      addToast('Service deleted', 'success');
    } catch (err) { addToast(err.message || 'Failed to delete service', 'error'); }
  };

  const handleImageUploaded = (serviceId, newImage) => {
    setServices(prev => prev.map(s => s.id === serviceId
      ? { ...s, images: [...(s.images || []), newImage] }
      : s
    ));
  };

  const deleteImage = async (serviceId, imageId) => {
    try {
      await apiDelete(`/service-images/${imageId}`);
      setServices(prev => prev.map(s => s.id === serviceId
        ? { ...s, images: (s.images || []).filter(i => i.id !== imageId) }
        : s
      ));
      addToast('Image pair deleted', 'success');
    } catch { addToast('Failed to delete image', 'error'); }
  };

  if (loading) {
    return (
      <div>
        <div className="page-header"><h1>Services</h1><p>Manage the services displayed across the website.</p></div>
        <div className="page-loading"><Spinner size={24} /> Loading services...</div>
      </div>
    );
  }

  const renderForm = (onSave, saveLabel) => (
    <div className="card" style={{ marginBottom: '1rem', padding: '1.5rem' }}>
      <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>
        {saveLabel === 'Add' ? 'New Service' : 'Edit Service'}
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Icon</label>
          <input className="table-input" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="\uD83C\uDF3F" style={{ width: 60, textAlign: 'center', fontSize: '1.25rem' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', gridColumn: 'span 2' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Name *</label>
          <input className="table-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Service name" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Price</label>
          <input className="table-input" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="From $100" />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.75rem' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Description</label>
        <textarea className="table-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the service..." rows={3} style={{ resize: 'vertical' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem' }}>
          <input type="checkbox" checked={form.on_sale === '1'} onChange={e => setForm(f => ({ ...f, on_sale: e.target.checked ? '1' : '0' }))} />
          On Sale
        </label>
        {form.on_sale === '1' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Sale Label</label>
            <input className="table-input" value={form.sale_label} onChange={e => setForm(f => ({ ...f, sale_label: e.target.value }))} placeholder="e.g. 20% Off, Spring Special" style={{ width: 200 }} />
          </div>
        )}
      </div>
      <div style={{ marginTop: '1rem' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.5rem' }}>Primary Before &amp; After</label>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <PhotoUpload label="Before Photo" preview={beforePreview} onPick={pickBefore} />
          <PhotoUpload label="After Photo" preview={afterPreview} onPick={pickAfter} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <button className="btn btn-primary" onClick={onSave} disabled={saving || !form.name.trim()}>{saveLabel}</button>
        <button className="btn btn-outline" onClick={cancel}>Cancel</button>
      </div>
    </div>
  );

  const allImages = (svc) => {
    const pairs = [];
    if (svc.image_before || svc.image_after) {
      pairs.push({ id: 'primary', image_before: svc.image_before, image_after: svc.image_after, primary: true });
    }
    for (const img of (svc.images || [])) {
      pairs.push(img);
    }
    return pairs;
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Services</h1>
          <p>Manage the services displayed across the website.</p>
        </div>
        {!adding && !editing && (
          <button className="btn btn-primary" onClick={startAdd}>+ Add Service</button>
        )}
      </div>

      {adding && renderForm(saveNew, 'Add')}
      {editing && renderForm(() => saveEdit(editing), 'Save')}

      {services.length === 0 && !adding ? (
        <div className="card">
          <EmptyState icon="&#127793;" title="No services yet" message="Add your first service to get started." />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {services.map(svc => {
            const imagePairs = allImages(svc);
            return (
              <div key={svc.id} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '2rem', flexShrink: 0 }}>{svc.icon || '\u2014'}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{svc.name}</div>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem', lineHeight: 1.5 }}>{svc.description || 'No description'}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <span style={{ fontWeight: 500, color: 'var(--color-primary)', fontSize: '0.9rem' }}>{svc.price || '\u2014'}</span>
                        {svc.on_sale ? (
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#dc2626', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: 4 }}>
                            {svc.sale_label || 'SALE'}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => startEdit(svc)}>Edit</button>
                    <button className="btn btn-outline btn-sm" style={{ color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => deleteService(svc.id)}>Delete</button>
                  </div>
                </div>

                {/* Before/After Image Pairs */}
                {imagePairs.length > 0 && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                      Before &amp; After Photos ({imagePairs.length})
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      {imagePairs.map(pair => (
                        <div key={pair.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', padding: '0.5rem', background: 'var(--color-bg-secondary)', borderRadius: 8, position: 'relative' }}>
                          {pair.image_before && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Before</span>
                              <img src={pair.image_before} alt="Before" style={thumbStyle} />
                            </div>
                          )}
                          {pair.image_after && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>After</span>
                              <img src={pair.image_after} alt="After" style={thumbStyle} />
                            </div>
                          )}
                          {!pair.primary && (
                            <button
                              onClick={() => deleteImage(svc.id, pair.id)}
                              style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(220,38,38,0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                              title="Remove this pair"
                            >
                              &times;
                            </button>
                          )}
                          {pair.primary && (
                            <span style={{ position: 'absolute', top: 4, right: 6, fontSize: '0.55rem', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase' }}>Primary</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add more images */}
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                    Add Before &amp; After Pair
                  </div>
                  <ImagePairUploader serviceId={svc.id} onUploaded={(img) => handleImageUploaded(svc.id, img)} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>Where services appear</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
          Changes are reflected automatically across the website: the Services page,
          Portfolio page (all before/after images), Home page preview, Contact form dropdown,
          customer Quote Request form, and Schedule Service form.
        </p>
      </div>
    </div>
  );
}
