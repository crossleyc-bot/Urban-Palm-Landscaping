import { useState, useEffect, useMemo } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api';
import { useToast } from '../../components/ui/Toast';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';

export default function ManageRelatedItems() {
  const { addToast } = useToast();
  const [relations, setRelations] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editLabel, setEditLabel] = useState('');

  // Form state
  const [sourceKey, setSourceKey] = useState('');
  const [relatedKey, setRelatedKey] = useState('');
  const [label, setLabel] = useState('');

  useEffect(() => {
    Promise.all([apiGet('/related-items'), apiGet('/inventory')])
      .then(([rels, inv]) => { setRelations(rels); setInventory(inv); })
      .catch(() => addToast('Failed to load data', 'error'))
      .finally(() => setLoading(false));
  }, []);

  // Build unique item list (item_name + category_id + category_name) from available inventory
  const catalogItems = useMemo(() => {
    const map = new Map();
    for (const item of inventory) {
      if (!item.available || !item.category_id) continue;
      const key = `${item.item_name}|${item.category_id}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          item_name: item.item_name,
          category_id: item.category_id,
          category_name: item.category || '',
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.item_name.localeCompare(b.item_name));
  }, [inventory]);

  const handleAdd = async () => {
    if (!sourceKey || !relatedKey) return;
    if (sourceKey === relatedKey) {
      addToast('Source and related item cannot be the same', 'warning');
      return;
    }
    const source = catalogItems.find(i => i.key === sourceKey);
    const related = catalogItems.find(i => i.key === relatedKey);
    if (!source || !related) return;

    try {
      const created = await apiPost('/related-items', {
        source_item_name: source.item_name,
        source_category_id: source.category_id,
        related_item_name: related.item_name,
        related_category_id: related.category_id,
        label: label.trim() || null,
      });
      setRelations(prev => [...prev, created]);
      setSourceKey('');
      setRelatedKey('');
      setLabel('');
      setAdding(false);
      addToast('Related item added', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to add', 'error');
    }
  };

  const handleUpdateLabel = async (id) => {
    try {
      const updated = await apiPut(`/related-items/${id}`, { label: editLabel.trim() || null });
      setRelations(prev => prev.map(r => r.id === id ? updated : r));
      setEditingId(null);
      addToast('Label updated', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this related item recommendation?')) return;
    try {
      await apiDelete(`/related-items/${id}`);
      setRelations(prev => prev.filter(r => r.id !== id));
      addToast('Removed', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to delete', 'error');
    }
  };

  if (loading) {
    return (
      <div>
        <div className="page-header"><h1>Related Items</h1><p>Configure product cross-sell recommendations.</p></div>
        <div className="page-loading"><Spinner size={24} /> Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Related Items</h1>
          <p>Configure cross-sell recommendations shown to customers. When a customer has a source item in their cart, the related item will be suggested.</p>
        </div>
        {!adding && (
          <button className="btn btn-primary" onClick={() => setAdding(true)}>+ Add Recommendation</button>
        )}
      </div>

      <div className="stats-grid stagger-list">
        <div className="stat-card">
          <div className="stat-label">Total Recommendations</div>
          <div className="stat-value">{relations.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Source Items</div>
          <div className="stat-value">{new Set(relations.map(r => `${r.source_item_name}|${r.source_category_id}`)).size}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Catalog Items</div>
          <div className="stat-value">{catalogItems.length}</div>
        </div>
      </div>

      {adding && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>New Recommendation</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Source Item (when this is in cart...)</label>
              <select className="table-select" value={sourceKey} onChange={e => setSourceKey(e.target.value)} style={{ width: '100%' }}>
                <option value="">Select item...</option>
                {catalogItems.map(i => (
                  <option key={i.key} value={i.key}>{i.item_name} ({i.category_name})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Related Item (...recommend this)</label>
              <select className="table-select" value={relatedKey} onChange={e => setRelatedKey(e.target.value)} style={{ width: '100%' }}>
                <option value="">Select item...</option>
                {catalogItems.map(i => (
                  <option key={i.key} value={i.key}>{i.item_name} ({i.category_name})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.25rem' }}>Label (optional)</label>
              <input className="table-input" value={label} onChange={e => setLabel(e.target.value)} placeholder='e.g. "Goes great with"' style={{ width: '100%' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary btn-sm" onClick={handleAdd} disabled={!sourceKey || !relatedKey}>Add</button>
            <button className="btn btn-outline btn-sm" onClick={() => { setAdding(false); setSourceKey(''); setRelatedKey(''); setLabel(''); }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Source Item</th>
                <th>Source Category</th>
                <th style={{ textAlign: 'center', width: 40 }}></th>
                <th>Related Item</th>
                <th>Related Category</th>
                <th>Label</th>
                <th style={{ width: 140 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {relations.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <EmptyState
                      icon="&#128279;"
                      title="No recommendations yet"
                      message="Add related item recommendations so customers discover complementary products."
                    />
                  </td>
                </tr>
              ) : (
                relations.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.source_item_name}</td>
                    <td><span className="badge badge-blue">{r.source_category_name || r.source_category_id}</span></td>
                    <td style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>&rarr;</td>
                    <td style={{ fontWeight: 600 }}>{r.related_item_name}</td>
                    <td><span className="badge badge-green">{r.related_category_name || r.related_category_id}</span></td>
                    <td>
                      {editingId === r.id ? (
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <input className="table-input" value={editLabel} onChange={e => setEditLabel(e.target.value)} placeholder="Label" style={{ width: 140 }} />
                          <button className="btn btn-primary btn-sm" onClick={() => handleUpdateLabel(r.id)}>Save</button>
                          <button className="btn btn-outline btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                        </div>
                      ) : (
                        <span style={{ color: r.label ? 'inherit' : 'var(--color-text-muted)', fontStyle: r.label ? 'normal' : 'italic' }}>
                          {r.label || 'None'}
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => { setEditingId(r.id); setEditLabel(r.label || ''); }}>Edit</button>
                        <button className="btn btn-outline btn-sm" style={{ color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => handleDelete(r.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
