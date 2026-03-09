import { useState, useEffect, useMemo } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api';
import { useToast } from '../../components/ui/Toast';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import Pagination from '../../components/ui/Pagination';
import SortableHeader from '../../components/ui/SortableHeader';

const PAGE_SIZE = 15;
const emptyForm = { name: '', description: '', unit: '', retail_price: '', category_id: '', on_sale: '0', sale_price: '', available: '0' };
const emptySourceForm = { supplier_id: '', inventory_id: '', unit_cost: '', priority: '0' };

export default function ProductCatalog() {
  const { addToast } = useToast();
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [taxonomyLeaves, setTaxonomyLeaves] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [filterCategory, setFilterCategory] = useState('');

  // Sources management
  const [sourcesFor, setSourcesFor] = useState(null); // product id
  const [sources, setSources] = useState([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [addingSource, setAddingSource] = useState(false);
  const [sourceForm, setSourceForm] = useState(emptySourceForm);
  const [savingSource, setSavingSource] = useState(false);

  useEffect(() => {
    Promise.all([
      apiGet('/catalog'),
      apiGet('/suppliers'),
      apiGet('/taxonomy/leaves'),
      apiGet('/inventory'),
    ])
      .then(([prods, sups, leaves, inv]) => {
        setProducts(prods);
        setSuppliers(sups);
        setTaxonomyLeaves(leaves);
        setInventoryItems(inv);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
    setPage(1);
  };

  const filtered = useMemo(() => {
    if (!filterCategory) return products;
    return products.filter(p => p.category_name === filterCategory);
  }, [products, filterCategory]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal = a[sortField] ?? '';
      let bVal = b[sortField] ?? '';
      if (['retail_price'].includes(sortField)) { aVal = Number(aVal) || 0; bVal = Number(bVal) || 0; }
      const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const startEdit = (item) => {
    setAdding(false);
    setEditing(item.id);
    setForm({
      name: item.name,
      description: item.description || '',
      unit: item.unit || '',
      retail_price: item.retail_price ?? '',
      category_id: item.category_id != null ? String(item.category_id) : '',
      on_sale: String(item.on_sale ?? 0),
      sale_price: item.sale_price ?? '',
      available: String(item.available ?? 0),
    });
  };

  const startAdd = () => {
    setEditing(null);
    setAdding(true);
    setForm(emptyForm);
  };

  const cancel = () => { setEditing(null); setAdding(false); setForm(emptyForm); };

  const buildPayload = () => ({
    name: form.name,
    description: form.description,
    unit: form.unit,
    retail_price: form.retail_price,
    category_id: form.category_id,
    on_sale: form.on_sale,
    sale_price: form.sale_price,
    available: form.available,
  });

  const saveEdit = async (id) => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const updated = await apiPut(`/catalog/${id}`, buildPayload());
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updated, category_name: taxonomyLeaves.find(l => String(l.id) === form.category_id)?.name || null } : p));
      setEditing(null);
      addToast('Product updated', 'success');
    } catch (err) { addToast(err.message || 'Failed to update', 'error'); }
    finally { setSaving(false); }
  };

  const saveNew = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const created = await apiPost('/catalog', buildPayload());
      setProducts(prev => [...prev, { ...created, category_name: taxonomyLeaves.find(l => String(l.id) === form.category_id)?.name || null }]);
      setAdding(false);
      setForm(emptyForm);
      addToast('Product created', 'success');
    } catch (err) { addToast(err.message || 'Failed to create', 'error'); }
    finally { setSaving(false); }
  };

  const deleteProduct = async (id) => {
    if (!confirm('Delete this catalog product? This will also remove all supplier sources.')) return;
    try {
      await apiDelete(`/catalog/${id}`);
      setProducts(prev => prev.filter(p => p.id !== id));
      if (sourcesFor === id) setSourcesFor(null);
      addToast('Product deleted', 'success');
    } catch (err) { addToast(err.message || 'Failed to delete', 'error'); }
  };

  // Sources
  const openSources = async (productId) => {
    if (sourcesFor === productId) { setSourcesFor(null); return; }
    setSourcesFor(productId);
    setLoadingSources(true);
    setAddingSource(false);
    try {
      const data = await apiGet(`/catalog/${productId}/sources`);
      setSources(data);
    } catch { setSources([]); }
    finally { setLoadingSources(false); }
  };

  const filteredInventory = useMemo(() => {
    if (!sourceForm.supplier_id) return [];
    return inventoryItems.filter(i => String(i.supplier_id) === sourceForm.supplier_id);
  }, [inventoryItems, sourceForm.supplier_id]);

  const addSource = async () => {
    if (!sourceForm.supplier_id) return;
    setSavingSource(true);
    try {
      const created = await apiPost(`/catalog/${sourcesFor}/sources`, {
        supplier_id: Number(sourceForm.supplier_id),
        inventory_id: sourceForm.inventory_id || null,
        unit_cost: sourceForm.unit_cost || null,
        priority: Number(sourceForm.priority) || 0,
      });
      setSources(prev => [...prev, created]);
      setAddingSource(false);
      setSourceForm(emptySourceForm);
      addToast('Source added', 'success');
    } catch (err) { addToast(err.message || 'Failed to add source', 'error'); }
    finally { setSavingSource(false); }
  };

  const deleteSource = async (sourceId) => {
    try {
      await apiDelete(`/catalog/sources/${sourceId}`);
      setSources(prev => prev.filter(s => s.id !== sourceId));
      addToast('Source removed', 'success');
    } catch (err) { addToast(err.message || 'Failed to remove source', 'error'); }
  };

  if (loading) {
    return (
      <div>
        <div className="page-header"><h1>Product Catalog</h1><p>Customer-facing products sourced from multiple suppliers.</p></div>
        <div className="page-loading"><Spinner size={24} /> Loading catalog...</div>
      </div>
    );
  }

  const sourceCountMap = {};
  for (const p of products) {
    sourceCountMap[p.id] = p.source_supplier_ids ? p.source_supplier_ids.split(',').length : 0;
  }

  const formRow = (onSave, saveLabel) => (
    <tr>
      <td><input className="table-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Product name" /></td>
      <td><input className="table-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" style={{ width: 160 }} /></td>
      <td>
        <select className="table-select" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} style={{ width: 140 }}>
          <option value="">Select...</option>
          {taxonomyLeaves.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </td>
      <td><input className="table-input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="ea / pallet" style={{ width: 80 }} /></td>
      <td><input className="table-input" type="number" min="0" step="0.01" value={form.retail_price} onChange={e => setForm(f => ({ ...f, retail_price: e.target.value }))} placeholder="0.00" style={{ width: 80 }} /></td>
      <td>
        <select className="table-select" value={form.available} onChange={e => setForm(f => ({ ...f, available: e.target.value }))} style={{ width: 70 }}>
          <option value="0">No</option>
          <option value="1">Yes</option>
        </select>
      </td>
      <td>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <select className="table-select" value={form.on_sale} onChange={e => setForm(f => ({ ...f, on_sale: e.target.value }))} style={{ width: 60 }}>
            <option value="0">No</option>
            <option value="1">Yes</option>
          </select>
          {form.on_sale === '1' && (
            <input className="table-input" type="number" min="0" step="0.01" value={form.sale_price} onChange={e => setForm(f => ({ ...f, sale_price: e.target.value }))} placeholder="$" style={{ width: 60 }} />
          )}
        </div>
      </td>
      <td></td>
      <td>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button className="btn btn-primary btn-sm" onClick={onSave} disabled={saving || !form.name.trim()}>{saveLabel}</button>
          <button className="btn btn-outline btn-sm" onClick={cancel}>Cancel</button>
        </div>
      </td>
    </tr>
  );

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Product Catalog</h1>
          <p>Customer-facing products. Each product can be sourced from multiple suppliers.</p>
        </div>
        {!adding && (
          <button className="btn btn-primary" onClick={startAdd}>+ Add Product</button>
        )}
      </div>

      <div className="stats-grid stagger-list">
        <div className="stat-card">
          <div className="stat-label">Catalog Products</div>
          <div className="stat-value">{products.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Available</div>
          <div className="stat-value">{products.filter(p => p.available).length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">On Sale</div>
          <div className="stat-value" style={{ color: '#dc2626' }}>{products.filter(p => p.on_sale).length}</div>
        </div>
      </div>

      {/* Filter */}
      <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Filter:</span>
        <select className="table-select" value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }} style={{ width: 180 }}>
          <option value="">All Categories</option>
          {taxonomyLeaves.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
        </select>
        {filterCategory && (
          <button className="btn btn-outline btn-sm" onClick={() => { setFilterCategory(''); setPage(1); }}>Clear</button>
        )}
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <SortableHeader label="Product" field="name" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th>Description</th>
                <SortableHeader label="Category" field="category_name" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th>Unit</th>
                <SortableHeader label="Retail" field="retail_price" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Available" field="available" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th>Sale</th>
                <th>Sources</th>
                <th style={{ width: '180px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && !adding ? (
                <tr>
                  <td colSpan="9">
                    <EmptyState icon="&#128230;" title="No catalog products" message="Create your first catalog product to get started." />
                  </td>
                </tr>
              ) : (
                <>
                  {paginated.map(item => (
                    <>
                      <tr key={item.id}>
                        {editing === item.id ? (
                          formRow(() => saveEdit(item.id), 'Save').props.children
                        ) : (
                          <>
                            <td style={{ fontWeight: 600 }}>{item.name}</td>
                            <td style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description || '\u2014'}</td>
                            <td>{item.category_name ? <span className="badge badge-blue">{item.category_name}</span> : '\u2014'}</td>
                            <td>{item.unit || '\u2014'}</td>
                            <td style={{ fontWeight: 500, color: 'var(--color-primary)' }}>{item.retail_price != null ? `$${Number(item.retail_price).toFixed(2)}` : '\u2014'}</td>
                            <td>
                              <span className={`badge ${item.available ? 'badge-green' : 'badge-yellow'}`}>
                                {item.available ? 'Yes' : 'No'}
                              </span>
                            </td>
                            <td>
                              {item.on_sale ? (
                                <span className="badge badge-red" style={{ fontSize: '0.7rem' }}>
                                  {item.sale_price != null ? `$${Number(item.sale_price).toFixed(2)}` : 'SALE'}
                                </span>
                              ) : '\u2014'}
                            </td>
                            <td>
                              <button
                                className={`btn btn-sm ${sourcesFor === item.id ? 'btn-primary' : 'btn-outline'}`}
                                onClick={() => openSources(item.id)}
                                style={{ fontSize: '0.75rem' }}
                              >
                                {sourceCountMap[item.id] || 0} supplier{sourceCountMap[item.id] !== 1 ? 's' : ''}
                              </button>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.25rem' }}>
                                <button className="btn btn-outline btn-sm" onClick={() => startEdit(item)}>Edit</button>
                                <button className="btn btn-outline btn-sm" style={{ color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => deleteProduct(item.id)}>Delete</button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                      {sourcesFor === item.id && (
                        <tr key={`sources-${item.id}`}>
                          <td colSpan="9" style={{ background: 'var(--color-bg-secondary)', padding: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Supplier Sources for "{item.name}"</h4>
                              <button className="btn btn-primary btn-sm" onClick={() => { setAddingSource(true); setSourceForm(emptySourceForm); }}>+ Add Source</button>
                            </div>
                            {loadingSources ? (
                              <div style={{ textAlign: 'center', padding: '1rem' }}><Spinner size={18} /> Loading sources...</div>
                            ) : (
                              <table style={{ width: '100%', fontSize: '0.85rem' }}>
                                <thead>
                                  <tr>
                                    <th>Supplier</th>
                                    <th>Inventory Item</th>
                                    <th>Unit Cost</th>
                                    <th>Stock</th>
                                    <th>Priority</th>
                                    <th>Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sources.length === 0 && !addingSource && (
                                    <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '0.75rem' }}>No sources yet. Add a supplier source.</td></tr>
                                  )}
                                  {sources.map(src => (
                                    <tr key={src.id}>
                                      <td style={{ fontWeight: 500 }}>{src.supplier_name}</td>
                                      <td>{src.inventory_item_name || '\u2014'}{src.sku ? ` (${src.sku})` : ''}</td>
                                      <td style={{ fontWeight: 500 }}>{src.unit_cost != null ? `$${Number(src.unit_cost).toFixed(2)}` : '\u2014'}</td>
                                      <td>{src.qty_available ?? '\u2014'}</td>
                                      <td>{src.priority}</td>
                                      <td>
                                        <button className="btn btn-outline btn-sm" style={{ color: '#dc2626', borderColor: '#fca5a5', fontSize: '0.75rem' }} onClick={() => deleteSource(src.id)}>Remove</button>
                                      </td>
                                    </tr>
                                  ))}
                                  {addingSource && (
                                    <tr>
                                      <td>
                                        <select className="table-select" value={sourceForm.supplier_id} onChange={e => setSourceForm(f => ({ ...f, supplier_id: e.target.value, inventory_id: '' }))}>
                                          <option value="">Select supplier...</option>
                                          {suppliers.filter(s => s.status === 'Active').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                      </td>
                                      <td>
                                        <select className="table-select" value={sourceForm.inventory_id} onChange={e => {
                                          const invId = e.target.value;
                                          const inv = inventoryItems.find(i => String(i.id) === invId);
                                          setSourceForm(f => ({ ...f, inventory_id: invId, unit_cost: inv ? String(inv.unit_cost) : f.unit_cost }));
                                        }}>
                                          <option value="">Link inventory (optional)...</option>
                                          {filteredInventory.map(i => <option key={i.id} value={i.id}>{i.item_name}{i.sku ? ` (${i.sku})` : ''}</option>)}
                                        </select>
                                      </td>
                                      <td><input className="table-input" type="number" min="0" step="0.01" value={sourceForm.unit_cost} onChange={e => setSourceForm(f => ({ ...f, unit_cost: e.target.value }))} placeholder="0.00" style={{ width: 80 }} /></td>
                                      <td>\u2014</td>
                                      <td><input className="table-input" type="number" min="0" value={sourceForm.priority} onChange={e => setSourceForm(f => ({ ...f, priority: e.target.value }))} placeholder="0" style={{ width: 50 }} /></td>
                                      <td>
                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                          <button className="btn btn-primary btn-sm" onClick={addSource} disabled={savingSource || !sourceForm.supplier_id} style={{ fontSize: '0.75rem' }}>Add</button>
                                          <button className="btn btn-outline btn-sm" onClick={() => setAddingSource(false)} style={{ fontSize: '0.75rem' }}>Cancel</button>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            )}
                            {sources.length > 0 && (
                              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                Lowest priority number = preferred source. Stock is deducted from the highest-priority source first when orders are placed.
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                  {adding && formRow(saveNew, 'Add')}
                </>
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
