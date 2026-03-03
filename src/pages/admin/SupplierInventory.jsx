import { useState, useEffect, useMemo, useRef } from 'react';
import { apiGet, apiPost, apiPut, apiPostForm, apiDelete } from '../../api';
import { useToast } from '../../components/ui/Toast';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import Pagination from '../../components/ui/Pagination';
import SortableHeader from '../../components/ui/SortableHeader';

const PAGE_SIZE = 15;
const emptyForm = { supplier_id: '', item_name: '', sku: '', category: '', category_id: '', unit: '', unit_cost: '', retail_cost: '', qty_available: '', reorder_point: '', notes: '', available: '0' };

export default function SupplierInventory() {
  const { addToast } = useToast();
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [taxonomyLeaves, setTaxonomyLeaves] = useState([]);
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
  const [importing, setImporting] = useState(false);
  const csvRef = useRef();

  useEffect(() => {
    Promise.all([apiGet('/inventory'), apiGet('/suppliers'), apiGet('/taxonomy/leaves')])
      .then(([inv, sup, leaves]) => { setItems(inv); setSuppliers(sup); setTaxonomyLeaves(leaves); })
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
      if (['unit_cost', 'retail_cost', 'qty_available'].includes(sortField)) { aVal = Number(aVal) || 0; bVal = Number(bVal) || 0; }
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
      category: item.category || '', category_id: item.category_id != null ? String(item.category_id) : '',
      unit: item.unit || '', unit_cost: item.unit_cost ?? '',
      retail_cost: item.retail_cost ?? '', qty_available: item.qty_available ?? '', reorder_point: item.reorder_point ?? '', notes: item.notes || '',
      available: String(item.available ?? 0),
    });
  };

  const startAdd = () => {
    setEditing(null);
    setAdding(true);
    setForm({ ...emptyForm, supplier_id: filterSupplier || '' });
  };

  const cancel = () => { setEditing(null); setAdding(false); setForm(emptyForm); };

  const buildPayload = () => ({
    supplier_id: form.supplier_id,
    item_name: form.item_name,
    sku: form.sku,
    category: form.category,
    category_id: form.category_id,
    unit: form.unit,
    unit_cost: form.unit_cost,
    retail_cost: form.retail_cost,
    qty_available: form.qty_available,
    reorder_point: form.reorder_point,
    notes: form.notes,
    available: form.available,
  });

  const saveEdit = async (id) => {
    if (!form.supplier_id || !form.item_name.trim()) return;
    setSaving(true);
    try {
      await apiPut(`/inventory/${id}`, buildPayload());
      const wholesale = form.unit_cost !== '' ? Number(form.unit_cost) : null;
      const retail = form.retail_cost !== '' ? Number(form.retail_cost) : (wholesale != null ? +(wholesale * 1.5).toFixed(2) : null);
      setItems(prev => prev.map(i => i.id === id ? {
        ...i, ...form,
        supplier_id: Number(form.supplier_id),
        category_id: form.category_id ? Number(form.category_id) : null,
        unit_cost: wholesale,
        retail_cost: retail,
        qty_available: form.qty_available !== '' ? Number(form.qty_available) : 0,
        reorder_point: form.reorder_point !== '' ? Number(form.reorder_point) : 0,
        supplier_name: supplierName(Number(form.supplier_id)),
        available: Number(form.available),
      } : i));
      setEditing(null);
      addToast('Item updated', 'success');
    } catch (err) { addToast(err.message || 'Failed to update item', 'error'); }
    finally { setSaving(false); }
  };

  const saveNew = async () => {
    if (!form.supplier_id || !form.item_name.trim()) return;
    setSaving(true);
    try {
      const created = await apiPost('/inventory', buildPayload());
      setItems(prev => [...prev, { ...created, supplier_name: supplierName(Number(form.supplier_id)) }]);
      setAdding(false);
      setForm(emptyForm);
      addToast('Item added', 'success');
    } catch (err) { addToast(err.message || 'Failed to add item', 'error'); }
    finally { setSaving(false); }
  };

  const deleteItem = async (id) => {
    try {
      await apiDelete(`/inventory/${id}`);
      setItems(prev => prev.filter(i => i.id !== id));
      addToast('Item deleted', 'success');
    } catch { addToast('Failed to delete item', 'error'); }
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const result = await apiPostForm('/inventory/import', fd);
      let msg = `Imported ${result.imported} item${result.imported !== 1 ? 's' : ''}`;
      if (result.skipped) msg += ` (${result.skipped} skipped)`;
      addToast(msg, 'success');
      if (result.skippedReasons?.length) {
        addToast(`Skipped: ${result.skippedReasons.join('; ')}`, 'warning');
      }
      const updated = await apiGet('/inventory');
      setItems(updated);
    } catch (err) {
      addToast(err.message || 'Import failed', 'error');
    } finally {
      setImporting(false);
      if (csvRef.current) csvRef.current.value = '';
    }
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
        <select className="table-select" value={form.category_id} onChange={e => {
          const id = e.target.value;
          const leaf = taxonomyLeaves.find(l => String(l.id) === id);
          setForm(f => ({ ...f, category_id: id, category: leaf ? leaf.name : '' }));
        }} style={{ width: 140 }}>
          <option value="">Select...</option>
          {taxonomyLeaves.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </td>
      <td><input className="table-input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="ea / pallet" style={{ width: 80 }} /></td>
      <td><input className="table-input" type="number" min="0" step="0.01" value={form.unit_cost} onChange={e => {
        const val = e.target.value;
        setForm(f => {
          const updated = { ...f, unit_cost: val };
          if (f.retail_cost === '' || (f.unit_cost !== '' && f.retail_cost === String((Number(f.unit_cost) * 1.5).toFixed(2)))) {
            updated.retail_cost = val !== '' ? String((Number(val) * 1.5).toFixed(2)) : '';
          }
          return updated;
        });
      }} placeholder="0.00" style={{ width: 80 }} /></td>
      <td><input className="table-input" type="number" min="0" step="0.01" value={form.retail_cost} onChange={e => setForm(f => ({ ...f, retail_cost: e.target.value }))} placeholder="auto" style={{ width: 80 }} /></td>
      <td><input className="table-input" type="number" min="0" value={form.qty_available} onChange={e => setForm(f => ({ ...f, qty_available: e.target.value }))} placeholder="0" style={{ width: 65 }} /></td>
      <td><input className="table-input" type="number" min="0" value={form.reorder_point} onChange={e => setForm(f => ({ ...f, reorder_point: e.target.value }))} placeholder="0" style={{ width: 65 }} /></td>
      <td>
        <select className="table-select" value={form.available} onChange={e => setForm(f => ({ ...f, available: e.target.value }))} style={{ width: 70 }}>
          <option value="0">No</option>
          <option value="1">Yes</option>
        </select>
      </td>
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
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={startAdd}>+ Add Item</button>
            <button className="btn btn-outline" onClick={() => csvRef.current?.click()} disabled={importing}>
              {importing ? 'Importing...' : 'Import CSV'}
            </button>
            <input ref={csvRef} type="file" accept=".csv" onChange={handleImportCSV} style={{ display: 'none' }} />
          </div>
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
        <select className="table-select" value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }} style={{ width: 180 }}>
          <option value="">All Categories</option>
          {taxonomyLeaves.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
        </select>
        {(filterSupplier || filterCategory) && (
          <button className="btn btn-outline btn-sm" onClick={() => { setFilterSupplier(''); setFilterCategory(''); setPage(1); }}>Clear</button>
        )}
      </div>

      {/* Import Instructions */}
      <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>CSV Import</div>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
          Upload a CSV file with columns: <strong>supplier_name</strong> (required — must match an existing supplier), <strong>item_name</strong> (required), sku, category, unit, unit_cost, retail_cost, qty_available, reorder_point, notes.
          Column headers are flexible (e.g., "Supplier", "Item", "Wholesale", "Qty", "Reorder" all work). Rows with unrecognized supplier names will be skipped.
        </p>
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
                <SortableHeader label="Wholesale" field="unit_cost" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Retail" field="retail_cost" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Qty" field="qty_available" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th>Reorder</th>
                <SortableHeader label="Available" field="available" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th style={{ width: '140px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && !adding ? (
                <tr>
                  <td colSpan="11">
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
                          <td style={{ fontWeight: 500, color: 'var(--color-primary)' }}>{item.retail_cost != null ? `$${Number(item.retail_cost).toFixed(2)}` : '\u2014'}</td>
                          <td style={{ fontWeight: 600, color: item.qty_available <= item.reorder_point && item.reorder_point > 0 ? '#dc2626' : 'inherit' }}>
                            {item.qty_available ?? 0}
                          </td>
                          <td style={{ color: 'var(--color-text-muted)' }}>{item.reorder_point ?? 0}</td>
                          <td>
                            <span className={`badge ${item.available ? 'badge-green' : 'badge-yellow'}`}>
                              {item.available ? 'Yes' : 'No'}
                            </span>
                          </td>
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
