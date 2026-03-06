import { useState, useEffect, useRef } from 'react';
import { apiGet, apiPostForm, apiPutForm, apiDelete } from '../../api';
import { useToast } from '../../components/ui/Toast';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';

const emptyForm = { title: '', type: 'article', url: '', description: '', published: '1', sort_order: 0 };

const typeOptions = [
  { value: 'article', label: 'Article' },
  { value: 'video', label: 'Video' },
  { value: 'guide', label: 'Guide' },
  { value: 'tip', label: 'Tip' },
];

const typeColor = { article: '#2563eb', video: '#dc2626', guide: '#059669', tip: '#d97706' };

function getEmbedUrl(url) {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  return null;
}

export default function ManageResources() {
  const { addToast } = useToast();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [thumbFile, setThumbFile] = useState(null);
  const [thumbPreview, setThumbPreview] = useState(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    apiGet('/resources').then(setResources).finally(() => setLoading(false));
  }, []);

  const clearFiles = () => {
    setThumbFile(null);
    if (thumbPreview?.startsWith('blob:')) URL.revokeObjectURL(thumbPreview);
    setThumbPreview(null);
  };

  const startAdd = () => {
    setEditing(null);
    setAdding(true);
    setForm({ ...emptyForm, sort_order: resources.length });
    clearFiles();
  };

  const startEdit = (r) => {
    setAdding(false);
    setEditing(r.id);
    setForm({
      title: r.title,
      type: r.type || 'article',
      url: r.url || '',
      description: r.description || '',
      published: String(r.published ?? 1),
      sort_order: r.sort_order ?? 0,
    });
    setThumbFile(null);
    setThumbPreview(r.thumbnail || null);
  };

  const cancel = () => {
    setEditing(null);
    setAdding(false);
    setForm(emptyForm);
    clearFiles();
  };

  const buildFormData = () => {
    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('type', form.type);
    fd.append('url', form.url);
    fd.append('description', form.description);
    fd.append('published', form.published);
    fd.append('sort_order', form.sort_order);
    if (thumbFile) fd.append('thumbnail', thumbFile);
    return fd;
  };

  const saveNew = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const created = await apiPostForm('/resources', buildFormData());
      setResources(prev => [...prev, created]);
      setAdding(false);
      setForm(emptyForm);
      clearFiles();
      addToast('Resource added', 'success');
    } catch { addToast('Failed to add resource', 'error'); }
    finally { setSaving(false); }
  };

  const saveEdit = async (id) => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const updated = await apiPutForm(`/resources/${id}`, buildFormData());
      setResources(prev => prev.map(r => r.id === id ? { ...r, ...updated } : r));
      setEditing(null);
      clearFiles();
      addToast('Resource updated', 'success');
    } catch { addToast('Failed to update resource', 'error'); }
    finally { setSaving(false); }
  };

  const deleteResource = async (id) => {
    if (!confirm('Delete this resource?')) return;
    try {
      await apiDelete(`/resources/${id}`);
      setResources(prev => prev.filter(r => r.id !== id));
      addToast('Resource deleted', 'success');
    } catch { addToast('Failed to delete resource', 'error'); }
  };

  const togglePublished = async (r) => {
    const newPub = r.published ? 0 : 1;
    try {
      const fd = new FormData();
      fd.append('title', r.title);
      fd.append('type', r.type);
      fd.append('url', r.url || '');
      fd.append('description', r.description || '');
      fd.append('published', String(newPub));
      fd.append('sort_order', r.sort_order ?? 0);
      await apiPutForm(`/resources/${r.id}`, fd);
      setResources(prev => prev.map(x => x.id === r.id ? { ...x, published: newPub } : x));
      addToast(newPub ? 'Resource published' : 'Resource unpublished', 'success');
    } catch { addToast('Failed to update resource', 'error'); }
  };

  const labelStyle = { fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' };
  const fieldGap = { display: 'flex', flexDirection: 'column', gap: '0.25rem' };

  if (loading) {
    return (
      <div>
        <div className="page-header"><h1>Resources</h1><p>Manage videos and articles for customers.</p></div>
        <div className="page-loading"><Spinner size={24} /> Loading resources...</div>
      </div>
    );
  }

  const renderForm = (onSave, saveLabel) => (
    <div className="card" style={{ marginBottom: '1rem', padding: '1.5rem' }}>
      <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>
        {saveLabel === 'Add' ? 'New Resource' : 'Edit Resource'}
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 80px', gap: '0.75rem' }}>
        <div style={fieldGap}>
          <label style={labelStyle}>Title *</label>
          <input className="table-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Resource title" />
        </div>
        <div style={fieldGap}>
          <label style={labelStyle}>Type</label>
          <select className="table-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
            {typeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div style={fieldGap}>
          <label style={labelStyle}>Order</label>
          <input className="table-input" type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))} />
        </div>
      </div>
      <div style={{ ...fieldGap, marginTop: '0.75rem' }}>
        <label style={labelStyle}>URL (YouTube, Vimeo, or article link)</label>
        <input className="table-input" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." style={{ maxWidth: 600 }} />
      </div>
      {form.url && getEmbedUrl(form.url) && (
        <div style={{ marginTop: '0.5rem', maxWidth: 400, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
          <div style={{ position: 'relative', paddingBottom: '56.25%' }}>
            <iframe
              src={getEmbedUrl(form.url)}
              title="Preview"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
      <div style={{ ...fieldGap, marginTop: '0.75rem' }}>
        <label style={labelStyle}>Description</label>
        <textarea className="table-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description..." rows={3} style={{ resize: 'vertical', maxWidth: 600 }} />
      </div>
      <div style={{ marginTop: '0.75rem' }}>
        <label style={{ ...labelStyle, display: 'block', marginBottom: '0.4rem' }}>Thumbnail</label>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {thumbPreview && (
            <img src={thumbPreview} alt="" style={{ width: 120, height: 68, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--color-border)' }} />
          )}
          <button className="btn btn-outline btn-sm" type="button" onClick={() => fileRef.current?.click()}>
            {thumbPreview ? 'Change' : 'Upload'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={e => {
            const f = e.target.files[0];
            if (f) { setThumbFile(f); setThumbPreview(URL.createObjectURL(f)); }
          }} style={{ display: 'none' }} />
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.85rem' }}>
          <input type="checkbox" checked={form.published === '1'} onChange={e => setForm(f => ({ ...f, published: e.target.checked ? '1' : '0' }))} />
          Published
        </label>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <button className="btn btn-primary" onClick={onSave} disabled={saving || !form.title.trim()}>{saving ? 'Saving...' : saveLabel}</button>
        <button className="btn btn-outline" onClick={cancel}>Cancel</button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Resources</h1>
          <p>Manage videos, articles, guides, and tips for customers.</p>
        </div>
        {!adding && !editing && (
          <button className="btn btn-primary" onClick={startAdd}>+ Add Resource</button>
        )}
      </div>

      {adding && renderForm(saveNew, 'Add')}
      {editing && renderForm(() => saveEdit(editing), 'Save')}

      {resources.length === 0 && !adding ? (
        <div className="card">
          <EmptyState icon="&#128218;" title="No resources yet" message="Add videos, articles, and guides for your customers." />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {resources.map(r => (
            <div
              key={r.id}
              className="card"
              style={{
                padding: '1rem 1.25rem',
                display: 'flex',
                gap: '1rem',
                alignItems: 'center',
                opacity: r.published ? 1 : 0.6,
              }}
            >
              {/* Thumbnail */}
              <div style={{
                width: 100, height: 56, borderRadius: 6, overflow: 'hidden', flexShrink: 0,
                border: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {r.thumbnail ? (
                  <img src={r.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '1.5rem' }}>{r.type === 'video' ? '\uD83C\uDFA5' : '\uD83D\uDCDD'}</span>
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.title}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase',
                    color: typeColor[r.type] || '#666', background: `${typeColor[r.type] || '#666'}15`,
                    padding: '0.15rem 0.5rem', borderRadius: 4,
                  }}>
                    {r.type}
                  </span>
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: 'var(--color-primary)', textDecoration: 'none' }}>
                      {r.url.length > 50 ? r.url.slice(0, 50) + '...' : r.url}
                    </a>
                  )}
                </div>
              </div>

              {/* Order */}
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                #{(r.sort_order ?? 0) + 1}
              </span>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                <button
                  className={`btn btn-sm ${r.published ? 'btn-outline' : 'btn-secondary'}`}
                  onClick={() => togglePublished(r)}
                  style={{ minWidth: 32 }}
                >
                  {r.published ? 'On' : 'Off'}
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => startEdit(r)}>Edit</button>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                  onClick={() => deleteResource(r.id)}
                >
                  Del
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
