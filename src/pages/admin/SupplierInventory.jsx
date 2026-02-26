import { useState, useEffect, useMemo } from 'react';
import { apiGet, apiPost, apiPut, apiDelete } from '../../api';
import { useToast } from '../../components/ui/Toast';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import Pagination from '../../components/ui/Pagination';
import SortableHeader from '../../components/ui/SortableHeader';

const PAGE_SIZE = 15;
const emptyForm = { supplier_id: '', item_name: '', sku: '', category: '', unit: '', unit_cost: '', qty_available: '', reorder_point: '', notes: '' };
const categories = ['Plants', 'Trees', 'Sod', 'Mulch', 'Stone', 'Pavers', 'Soil', 'Irrigation', 'Lighting', 'Fertilizer', 'Tools', 'Other'];

export default function SupplierInventory() {
  const { addToast } = useToast();
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('item_name');
  const [sortDir, setSortDir] = useState('asc');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    Promise.all([apiGet('/inventory'), apiGet('/suppliers')])
      .then(([inv, sup]) => { setItems(inv); setSuppliers(sup); })
      .finally(() => setLoading(false));
  }, []);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
    setPage(1);
  };

  const filtered = useMemo(() => {
    let list = items;
    if (filterSupplier) list = list.filter(i => String(i.supplier_id) === filterSupplier);
    if (filterCategory) list = list.filter(i => i.category === filterCategory);
    return list;
  }, [items, filterSupplier, filterCategory]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal = a[sortField] ?? '';
      let bVal = b[sortField] ?? '';
      if (sortField === 'unit_cost' || sortField === 'qty_available') { aVal = Number(aVal) || 0; bVal = Number(bVal) || 0; }
      const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const supplierName = (id) => suppliers.find(s => s.id === id)?.name || '\u2014';

  const startEdit = (item) => {
    setAdding(false);
    setEditing(item.id);
    setForm({
      supplier_id: String(item.supplier_id), item_name: item.item_name, sku: item.sku || '',
      category: item.category || '', unit: item.unit || '', unit_cost: item.unit_cost ?? '',
      qty_available: item.qty_available ?? '', reorder_point: item.reorder_point ?? '', notes: item.notes || '',
    });
  };

  const startAdd = () => {
    setEditing(null);
    setAdding(true);
    setForm({ ...emptyForm, supplier_id: filterSupplier || '' });
  };

  const cancel = () => { setEditing(null); setAdding(false); setForm(emptyForm); };

  const payload = () => ({
    ...form,
    supplier_id: Number(form.supplier_id),
    unit_cost: form.unit_cost !== '' ? Number(form.unit_cost) : null,
    qty_available: form.qty_available !== '' ? Number(form.qty_available) : 0,
    reorder_point: form.reorder_point !== '' ? Number(form.reorder_point) : 0,
  });

  const saveEdit = async (id) => {
    if (!form.supplier_id || !form.item_name.trim()) return;
    setSaving(true);
    try {
      await apiPut(`/inventory/${id}`, payload());
      setItems(prev => prev.map(i => i.id === id ? { ...i, ...payload(), supplier_name: supplierName(Number(form.supplier_id)) } : i));
      setEditing(null);
      addToast('Item updated', 'success');
    } catch { addToast('Failed to update item', 'error'); }
    finally { setSaving(false); }
  };

  const saveNew = async () => {
    if (!form.supplier_id || !form.item_name.trim()) return;
    setSaving(true);
    try {
      const created = await apiPost('/inventory', payload());
      setItems(prev => [...prev, { ...created, supplier_name: supplierName(Number(form.supplier_id)) }]);
      setAdding(false);
      setForm(emptyForm);
      addToast('Item added', 'success');
    } catch { addToast('Failed to add item', 'error'); }
    finally { setSaving(false); }
  };

  const deleteItem = async (id) => {
    try {
      await apiDelete(`/inventory/${id}`);
      setItems(prev => prev.filter(i => i.id !== id));
      addToast('Item deleted', 'success');
    } catch { addToast('Failed to delete item', 'error'); }
  };

  const lowStock = items.filter(i => i.qty_available <= i.reorder_point && i.reorder_point > 0);

  if (loading) {
    return (
      <div>
        <div className="page-header"><h1>Supplier Inventory</h1><p>Track materials and products from your suppliers.</p></div>
        <div className="page-loading"><Spinner size={24} /> Loading inventory...</div>
      </div>
    );
  }

  const formRow = (onSave, saveLabel) => (
    <tr>
      <td>
        <select className="table-select" value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}>
          <option value="">Select...</option>
          {suppliers.filter(s => s.status === 'Active').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </td>
      <td><input className="table-input" value={form.item_name} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} placeholder="Item name" /></td>
      <td><input className="table-input" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="SKU" style={{ width: 90 }} /></td>
      <td>
        <select className="table-select" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
          <option value="">None</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </td>
      <td><input className="table-input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="ea / pallet" style={{ width: 80 }} /></td>
      <td><input className="table-input" type="number" min="0" step="0.01" value={form.unit_cost} onChange={e => setForm(f => ({ ...f, unit_cost: e.target.value }))} placeholder="0.00" style={{ width: 80 }} /></td>
      <td><input className="table-input" type="number" min="0" value={form.qty_available} onChange={e => setForm(f => ({ ...f, qty_available: e.target.value }))} placeholder="0" style={{ width: 65 }} /></td>
      <td><input className="table-input" type="number" min="0" value={form.reorder_point} onChange={e => setForm(f => ({ ...f, reorder_point: e.target.value }))} placeholder="0" style={{ width: 65 }} /></td>
      <td>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <button className="btn btn-primary btn-sm" onClick={onSave} disabled={saving || !form.supplier_id || !form.item_name.trim()}>{saveLabel}</button>
          <button className="btn btn-outline btn-sm" onClick={cancel}>Cancel</button>
        </div>
      </td>
    </tr>
  );

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Supplier Inventory</h1>
          <p>Track materials and products from your suppliers.</p>
        </div>
        {!adding && (
          <button className="btn btn-primary" onClick={startAdd}>+ Add Item</button>
        )}
      </div>

      <div className="stats-grid stagger-list">
        <div className="stat-card">
          <div className="stat-label">Total Items</div>
          <div className="stat-value">{items.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Suppliers</div>
          <div className="stat-value">{suppliers.filter(s => s.status === 'Active').length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Low Stock Alerts</div>
          <div className="stat-value" style={lowStock.length > 0 ? { color: '#dc2626' } : {}}>{lowStock.length}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Filter:</span>
        <select className="table-select" value={filterSupplier} onChange={e => { setFilterSupplier(e.target.value); setPage(1); }} style={{ width: 180 }}>
          <option value="">All Suppliers</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="table-select" value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }} style={{ width: 150 }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {(filterSupplier || filterCategory) && (
          <button className="btn btn-outline btn-sm" onClick={() => { setFilterSupplier(''); setFilterCategory(''); setPage(1); }}>Clear</button>
        )}
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <SortableHeader label="Supplier" field="supplier_name" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Item" field="item_name" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th>SKU</th>
                <SortableHeader label="Category" field="category" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th>Unit</th>
                <SortableHeader label="Cost" field="unit_cost" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Qty" field="qty_available" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th>Reorder</th>
                <th style={{ width: '140px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && !adding ? (
                <tr>
                  <td colSpan="9">
                    <EmptyState icon="&#128230;" title="No inventory items" message={suppliers.length === 0 ? 'Add a supplier first, then add inventory items.' : 'Add your first inventory item to get started.'} />
                  </td>
                </tr>
              ) : (
                <>
                  {paginated.map(item => (
                    <tr key={item.id} style={item.qty_available <= item.reorder_point && item.reorder_point > 0 ? { background: 'rgba(220, 38, 38, 0.05)' } : {}}>
                      {editing === item.id ? (
                        formRow(() => saveEdit(item.id), 'Save').props.children
                      ) : (
                        <>
                          <td style={{ fontWeight: 500 }}>{item.supplier_name || supplierName(item.supplier_id)}</td>
                          <td style={{ fontWeight: 600 }}>{item.item_name}</td>
                          <td style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{item.sku || '\u2014'}</td>
                          <td>{item.category ? <span className="badge badge-blue">{item.category}</span> : '\u2014'}</td>
                          <td>{item.unit || '\u2014'}</td>
                          <td style={{ fontWeight: 500 }}>{item.unit_cost != null ? `$${Number(item.unit_cost).toFixed(2)}` : '\u2014'}</td>
                          <td style={{ fontWeight: 600, color: item.qty_available <= item.reorder_point && item.reorder_point > 0 ? '#dc2626' : 'inherit' }}>
                            {item.qty_available ?? 0}
                          </td>
                          <td style={{ color: 'var(--color-text-muted)' }}>{item.reorder_point ?? 0}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button className="btn btn-outline btn-sm" onClick={() => startEdit(item)}>Edit</button>
                              <button className="btn btn-outline btn-sm" style={{ color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => deleteItem(item.id)}>Delete</button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
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
