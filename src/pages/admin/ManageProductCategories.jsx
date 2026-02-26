import { useState, useEffect, useRef } from 'react';
import { apiGet, apiPostForm, apiPutForm, apiDelete } from '../../api';
import { useToast } from '../../components/ui/Toast';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';

const emptyForm = { name: '', description: '' };

const thumbStyle = {
  width: 120, height: 80, objectFit: 'cover', borderRadius: 8,
  border: '1px solid var(--color-border)',
};
const thumbPlaceholder = {
  ...thumbStyle, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)',
  fontSize: '0.75rem', fontWeight: 500,
};

export default function ManageProductCategories() {
  const { addToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    apiGet('/product-categories').then(setCategories).finally(() => setLoading(false));
  }, []);

  const clearFile = () => {
    setImageFile(null);
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  };

  const pickImage = (f) => { setImageFile(f); setImagePreview(URL.createObjectURL(f)); };

  const startEdit = (cat) => {
    setAdding(false);
    setEditing(cat.id);
    setForm({ name: cat.name, description: cat.description || '' });
    setImageFile(null);
    setImagePreview(cat.image || null);
  };

  const startAdd = () => {
    setEditing(null); setAdding(true);
    setForm(emptyForm); clearFile();
  };

  const cancel = () => {
    setEditing(null); setAdding(false);
    setForm(emptyForm); clearFile();
  };

  const buildFormData = () => {
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('description', form.description);
    if (imageFile) fd.append('image', imageFile);
    return fd;
  };

  const saveEdit = async (id) => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const result = await apiPutForm(`/product-categories/${id}`, buildFormData());
      setCategories(prev => prev.map(c => c.id === id ? {
        ...c, ...form,
        image: result.image ?? c.image,
      } : c));
      setEditing(null); clearFile();
      addToast('Category updated successfully', 'success');
    } catch { addToast('Failed to update category', 'error'); }
    finally { setSaving(false); }
  };

  const saveNew = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const created = await apiPostForm('/product-categories', buildFormData());
      setCategories(prev => [...prev, { id: created.id, ...form, image: created.image }]);
      setAdding(false); setForm(emptyForm); clearFile();
      addToast('Category added successfully', 'success');
    } catch { addToast('Failed to add category', 'error'); }
    finally { setSaving(false); }
  };

  const deleteCategory = async (id) => {
    try {
      await apiDelete(`/product-categories/${id}`);
      setCategories(prev => prev.filter(c => c.id !== id));
      addToast('Category deleted', 'success');
    } catch { addToast('Failed to delete category', 'error'); }
  };

  if (loading) {
    return (
      <div>
        <div className="page-header"><h1>Product Categories</h1><p>Manage categories displayed on the Products page.</p></div>
        <div className="page-loading"><Spinner size={24} /> Loading categories...</div>
      </div>
    );
  }

  const renderForm = (onSave, saveLabel) => (
    <div className="card" style={{ marginBottom: '1rem', padding: '1.5rem' }}>
      <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>
        {saveLabel === 'Add' ? 'New Category' : 'Edit Category'}
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', gridColumn: 'span 2' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Name *</label>
          <input className="table-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Category name" />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.75rem' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Description</label>
        <textarea className="table-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe this category..." rows={2} style={{ resize: 'vertical' }} />
      </div>
      <div style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Category Image</label>
          {imagePreview
            ? <img src={imagePreview} alt="Category" style={thumbStyle} />
            : <div style={thumbPlaceholder}>No image</div>
          }
          <button type="button" className="btn btn-outline btn-sm" onClick={() => fileRef.current.click()} style={{ alignSelf: 'flex-start' }}>
            {imagePreview ? 'Change' : 'Upload'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if (f) pickImage(f); }} style={{ display: 'none' }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <button className="btn btn-primary" onClick={onSave} disabled={saving || !form.name.trim()}>{saveLabel}</button>
        <button className="btn btn-outline" onClick={cancel}>Cancel</button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Product Categories</h1>
          <p>Manage categories displayed on the Products page.</p>
        </div>
        {!adding && !editing && (
          <button className="btn btn-primary" onClick={startAdd}>+ Add Category</button>
        )}
      </div>

      {adding && renderForm(saveNew, 'Add')}
      {editing && renderForm(() => saveEdit(editing), 'Save')}

      {categories.length === 0 && !adding ? (
        <div className="card">
          <EmptyState icon="&#128193;" title="No categories yet" message="Add your first product category to get started." />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {categories.map(cat => (
            <div key={cat.id} className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                  {cat.image ? (
                    <img src={cat.image} alt={cat.name} style={{ width: 80, height: 56, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--color-border)', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 80, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-secondary)', borderRadius: 8, border: '1px solid var(--color-border)', flexShrink: 0, fontSize: '1.5rem' }}>
                      &#128193;
                    </div>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{cat.name}</div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem', lineHeight: 1.5 }}>{cat.description || 'No description'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => startEdit(cat)}>Edit</button>
                  <button className="btn btn-outline btn-sm" style={{ color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => deleteCategory(cat.id)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>Where categories appear</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
          Categories are displayed on the public Products page. Each product in the inventory can be assigned to a category.
          The Products page shows all categories with their images as the primary browsing experience.
        </p>
      </div>
    </div>
  );
}
