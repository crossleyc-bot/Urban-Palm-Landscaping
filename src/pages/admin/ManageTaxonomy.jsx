import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet, apiPostForm, apiPutForm, apiDelete } from '../../api';
import { useToast } from '../../components/ui/Toast';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';

const emptyForm = { name: '', description: '', parent_id: null };

function buildTree(nodes) {
  const map = {};
  const roots = [];
  for (const n of nodes) map[n.id] = { ...n, children: [] };
  for (const n of nodes) {
    if (n.parent_id && map[n.parent_id]) {
      map[n.parent_id].children.push(map[n.id]);
    } else {
      roots.push(map[n.id]);
    }
  }
  return roots;
}

function countDescendants(node) {
  let count = node.children.length;
  for (const child of node.children) count += countDescendants(child);
  return count;
}

function flattenTree(tree) {
  const result = [];
  const walk = (nodes) => { for (const n of nodes) { result.push(n); walk(n.children); } };
  walk(tree);
  return result;
}

function TaxonomyNode({
  node, depth, expanded, onToggle, onEdit, onAdd, onDelete, editingId,
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded[node.id];
  const desc = countDescendants(node);
  const isLeaf = !hasChildren;

  return (
    <>
      <div
        className="card"
        style={{
          padding: '0.75rem 1rem',
          marginLeft: depth * 28,
          borderLeft: depth > 0 ? '3px solid var(--color-primary)' : undefined,
          opacity: editingId && editingId !== node.id ? 0.6 : 1,
          transition: 'opacity 0.15s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Expand / collapse toggle */}
          <button
            onClick={() => onToggle(node.id)}
            style={{
              width: 24, height: 24, padding: 0, border: 'none', borderRadius: 4,
              background: hasChildren ? 'var(--color-bg-secondary)' : 'transparent',
              cursor: hasChildren ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8rem', color: 'var(--color-text-muted)',
            }}
            disabled={!hasChildren}
            title={hasChildren ? (isExpanded ? 'Collapse' : 'Expand') : ''}
          >
            {hasChildren ? (isExpanded ? '\u25BC' : '\u25B6') : '\u2022'}
          </button>

          {/* Image thumbnail for leaf nodes */}
          {isLeaf && node.image && (
            <img src={node.image} alt="" style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--color-border)', flexShrink: 0 }} />
          )}

          {/* Name & description */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{node.name}</span>
            {node.description && (
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                &mdash; {node.description}
              </span>
            )}
          </div>

          {/* Badge */}
          {desc > 0 && (
            <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>{desc} sub-{desc === 1 ? 'item' : 'items'}</span>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
            <button className="btn btn-outline btn-sm" onClick={() => onAdd(node.id)} title="Add child">+ Child</button>
            <button className="btn btn-outline btn-sm" onClick={() => onEdit(node)}>Edit</button>
            <button
              className="btn btn-outline btn-sm"
              style={{ color: '#dc2626', borderColor: '#fca5a5' }}
              onClick={() => onDelete(node)}
              title={desc > 0 ? `Delete with ${desc} sub-item(s)` : 'Delete'}
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Render children when expanded */}
      {isExpanded && node.children.map(child => (
        <TaxonomyNode
          key={child.id}
          node={child}
          depth={depth + 1}
          expanded={expanded}
          onToggle={onToggle}
          onEdit={onEdit}
          onAdd={onAdd}
          onDelete={onDelete}
          editingId={editingId}
        />
      ))}
    </>
  );
}

export default function ManageTaxonomy() {
  const { addToast } = useToast();
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);   // node id or null
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [search, setSearch] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const fileRef = useRef();

  const load = useCallback(() => {
    apiGet('/taxonomy').then(data => {
      setNodes(data);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const tree = buildTree(nodes);

  // auto-expand all on first load
  useEffect(() => {
    if (nodes.length > 0 && Object.keys(expanded).length === 0) {
      const exp = {};
      for (const n of nodes) if (nodes.some(c => c.parent_id === n.id)) exp[n.id] = true;
      setExpanded(exp);
    }
  }, [nodes]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const expandAll = () => {
    const exp = {};
    for (const n of nodes) if (nodes.some(c => c.parent_id === n.id)) exp[n.id] = true;
    setExpanded(exp);
  };

  const collapseAll = () => setExpanded({});

  const cancel = () => { setEditing(null); setAdding(false); setForm(emptyForm); setImageFile(null); };

  const startAdd = (parentId = null) => {
    setEditing(null);
    setAdding(true);
    setForm({ name: '', description: '', parent_id: parentId });
    setImageFile(null);
    if (parentId) setExpanded(prev => ({ ...prev, [parentId]: true }));
  };

  const startEdit = (node) => {
    setAdding(false);
    setEditing(node.id);
    setForm({ name: node.name, description: node.description || '', parent_id: node.parent_id });
    setImageFile(null);
  };

  const buildFormData = () => {
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('description', form.description);
    if (form.parent_id != null) fd.append('parent_id', form.parent_id);
    if (imageFile) fd.append('image', imageFile);
    return fd;
  };

  const saveNew = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const created = await apiPostForm('/taxonomy', buildFormData());
      setNodes(prev => [...prev, created]);
      if (created.parent_id) setExpanded(prev => ({ ...prev, [created.parent_id]: true }));
      setAdding(false);
      setForm(emptyForm);
      setImageFile(null);
      addToast('Item added', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to add', 'error');
    } finally { setSaving(false); }
  };

  const saveEdit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const updated = await apiPutForm(`/taxonomy/${editing}`, buildFormData());
      setNodes(prev => prev.map(n => n.id === editing ? updated : n));
      setEditing(null);
      setForm(emptyForm);
      setImageFile(null);
      addToast('Item updated', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update', 'error');
    } finally { setSaving(false); }
  };

  const doDelete = async (node) => {
    try {
      await apiDelete(`/taxonomy/${node.id}`);
      // Remove this node and all descendants
      const idsToRemove = new Set();
      const collect = (id) => {
        idsToRemove.add(id);
        nodes.filter(n => n.parent_id === id).forEach(n => collect(n.id));
      };
      collect(node.id);
      setNodes(prev => prev.filter(n => !idsToRemove.has(n.id)));
      setConfirmDelete(null);
      addToast('Deleted', 'success');
    } catch {
      addToast('Failed to delete', 'error');
    }
  };

  // Parent selector options (flat list, indented by depth)
  const parentOptions = (() => {
    const flat = flattenTree(tree);
    const depths = {};
    const calcDepth = (id) => {
      if (depths[id] !== undefined) return depths[id];
      const node = nodes.find(n => n.id === id);
      if (!node || !node.parent_id) { depths[id] = 0; return 0; }
      depths[id] = calcDepth(node.parent_id) + 1;
      return depths[id];
    };
    for (const n of nodes) calcDepth(n.id);
    // exclude the editing node and its descendants
    const excluded = new Set();
    if (editing) {
      const collect = (id) => {
        excluded.add(id);
        nodes.filter(n => n.parent_id === id).forEach(n => collect(n.id));
      };
      collect(editing);
    }
    return flat.filter(n => !excluded.has(n.id)).map(n => ({
      id: n.id,
      label: '\u00A0\u00A0'.repeat(depths[n.id] || 0) + n.name,
    }));
  })();

  // Check if the current form target is (or will be) a leaf node
  const isFormLeaf = (() => {
    if (adding) return true; // new nodes start as leaves
    if (!editing) return false;
    return !nodes.some(n => n.parent_id === editing);
  })();

  // For editing, get existing image
  const editingImage = editing ? nodes.find(n => n.id === editing)?.image : null;

  // Search filtering
  const filteredTree = (() => {
    if (!search.trim()) return tree;
    const q = search.toLowerCase();
    const matchIds = new Set();
    for (const n of nodes) {
      if (n.name.toLowerCase().includes(q) || (n.description || '').toLowerCase().includes(q)) {
        // Include this node and all ancestors
        let current = n;
        while (current) {
          matchIds.add(current.id);
          current = current.parent_id ? nodes.find(x => x.id === current.parent_id) : null;
        }
      }
    }
    const filterNodes = (treeNodes) => {
      return treeNodes
        .filter(n => matchIds.has(n.id))
        .map(n => ({ ...n, children: filterNodes(n.children) }));
    };
    return filterNodes(tree);
  })();

  const totalCount = nodes.length;
  const topLevelCount = nodes.filter(n => !n.parent_id).length;

  if (loading) {
    return (
      <div>
        <div className="page-header"><h1>Taxonomy</h1><p>Classify landscape products and services into a browsable hierarchy.</p></div>
        <div className="page-loading"><Spinner size={24} /> Loading taxonomy...</div>
      </div>
    );
  }

  const renderForm = (onSave, saveLabel) => (
    <div className="card" style={{ marginBottom: '1rem', padding: '1.5rem' }}>
      <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>
        {saveLabel === 'Add' ? 'New Taxonomy Item' : 'Edit Taxonomy Item'}
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', maxWidth: 600 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Name *</label>
          <input
            className="table-input"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Palm Trees"
            autoFocus
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Parent</label>
          <select
            className="table-input"
            value={form.parent_id ?? ''}
            onChange={e => setForm(f => ({ ...f, parent_id: e.target.value ? Number(e.target.value) : null }))}
          >
            <option value="">None (top-level)</option>
            {parentOptions.map(o => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.75rem', maxWidth: 600 }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Description</label>
        <textarea
          className="table-input"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Short description of this category..."
          rows={2}
          style={{ resize: 'vertical' }}
        />
      </div>
      {/* Image upload — shown for leaf nodes */}
      {isFormLeaf && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.75rem', maxWidth: 600 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Category Image</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {(imageFile || editingImage) && (
              <img
                src={imageFile ? URL.createObjectURL(imageFile) : editingImage}
                alt=""
                style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--color-border)' }}
              />
            )}
            <button type="button" className="btn btn-outline btn-sm" onClick={() => fileRef.current?.click()}>
              {imageFile ? 'Change Image' : editingImage ? 'Replace Image' : 'Upload Image'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setImageFile(e.target.files[0] || null)} />
            {imageFile && (
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{imageFile.name}</span>
            )}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <button className="btn btn-primary" onClick={onSave} disabled={saving || !form.name.trim()}>
          {saving ? 'Saving...' : saveLabel}
        </button>
        <button className="btn btn-outline" onClick={cancel}>Cancel</button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Taxonomy</h1>
          <p>Classify landscape products and services into a browsable hierarchy.</p>
        </div>
        {!adding && !editing && (
          <button className="btn btn-primary" onClick={() => startAdd(null)}>+ Add Category</button>
        )}
      </div>

      {/* Stats */}
      {totalCount > 0 && (
        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-label">Total Items</div>
            <div className="stat-value">{totalCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Top-Level Categories</div>
            <div className="stat-value">{topLevelCount}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Sub-Categories</div>
            <div className="stat-value">{totalCount - topLevelCount}</div>
          </div>
        </div>
      )}

      {/* Form */}
      {adding && renderForm(saveNew, 'Add')}
      {editing && renderForm(saveEdit, 'Save')}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem', borderColor: '#fca5a5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.9rem' }}>
              Delete <strong>{confirmDelete.name}</strong>
              {countDescendants(confirmDelete) > 0
                ? ` and its ${countDescendants(confirmDelete)} sub-item(s)?`
                : '?'}
              {' '}This cannot be undone.
            </span>
            <button
              className="btn btn-primary btn-sm"
              style={{ background: '#dc2626', borderColor: '#dc2626' }}
              onClick={() => doDelete(confirmDelete)}
            >
              Confirm Delete
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => setConfirmDelete(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Toolbar */}
      {totalCount > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="table-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search taxonomy..."
            style={{ maxWidth: 260 }}
          />
          <button className="btn btn-outline btn-sm" onClick={expandAll}>Expand All</button>
          <button className="btn btn-outline btn-sm" onClick={collapseAll}>Collapse All</button>
        </div>
      )}

      {/* Tree */}
      {totalCount === 0 && !adding ? (
        <div className="card">
          <EmptyState icon="&#128466;" title="No taxonomy items yet" message="Add your first category to start building the landscape taxonomy." />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filteredTree.map(node => (
            <TaxonomyNode
              key={node.id}
              node={node}
              depth={0}
              expanded={expanded}
              onToggle={toggle}
              onEdit={startEdit}
              onAdd={startAdd}
              onDelete={(n) => setConfirmDelete(n)}
              editingId={editing}
            />
          ))}
          {search && filteredTree.length === 0 && (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No items match "{search}"
            </div>
          )}
        </div>
      )}

      {/* Info card */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>About the Taxonomy</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
          The taxonomy organizes landscape products and services into a hierarchical tree.
          Top-level categories represent major domains (e.g. Plants &amp; Greenery, Hardscape Materials),
          while sub-categories provide finer classification (e.g. Trees &gt; Palm Trees).
          Leaf-level categories can have an associated image that appears on the public products page.
          Deleting a parent will also remove all of its children.
        </p>
      </div>
    </div>
  );
}
