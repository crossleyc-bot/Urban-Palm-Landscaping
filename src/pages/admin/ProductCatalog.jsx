import { useState, useEffect, useMemo } from 'react';
import { apiGet } from '../../api';
import { useToast } from '../../components/ui/Toast';
import EmptyState from '../../components/ui/EmptyState';
import Spinner from '../../components/ui/Spinner';
import Pagination from '../../components/ui/Pagination';
import SortableHeader from '../../components/ui/SortableHeader';

const PAGE_SIZE = 15;

export default function ProductCatalog() {
  const { addToast } = useToast();
  const [inventory, setInventory] = useState([]);
  const [taxonomyLeaves, setTaxonomyLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('item_name');
  const [sortDir, setSortDir] = useState('asc');
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    Promise.all([
      apiGet('/inventory'),
      apiGet('/taxonomy/leaves'),
    ])
      .then(([inv, leaves]) => {
        setInventory(inv);
        setTaxonomyLeaves(leaves);
      })
      .finally(() => setLoading(false));
  }, []);

  // Only show items that are available AND have a category assigned (i.e. in the public catalog)
  const catalogItems = useMemo(() => {
    return inventory.filter(i => i.available === 1 && i.category_id != null);
  }, [inventory]);

  const categoryNames = useMemo(() => {
    const names = new Set();
    for (const item of catalogItems) {
      const leaf = taxonomyLeaves.find(l => l.id === item.category_id);
      if (leaf) names.add(leaf.name);
    }
    return [...names].sort();
  }, [catalogItems, taxonomyLeaves]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
    setPage(1);
  };

  const filtered = useMemo(() => {
    if (!filterCategory) return catalogItems;
    return catalogItems.filter(i => {
      const leaf = taxonomyLeaves.find(l => l.id === i.category_id);
      return leaf && leaf.name === filterCategory;
    });
  }, [catalogItems, filterCategory, taxonomyLeaves]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal = a[sortField] ?? '';
      let bVal = b[sortField] ?? '';
      if (['retail_cost', 'qty_available'].includes(sortField)) { aVal = Number(aVal) || 0; bVal = Number(bVal) || 0; }
      const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortField, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Stats
  const onSaleCount = catalogItems.filter(i => i.on_sale).length;
  const categoryCount = categoryNames.length;

  if (loading) {
    return (
      <div>
        <div className="page-header"><h1>Product Catalog</h1><p>Auto-generated from supplier inventory.</p></div>
        <div className="page-loading"><Spinner size={24} /> Loading catalog...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Product Catalog</h1>
          <p>Automatically built from supplier inventory. Items appear here when they are marked as available and assigned to a category.</p>
        </div>
      </div>

      <div className="stats-grid stagger-list">
        <div className="stat-card">
          <div className="stat-label">Catalog Items</div>
          <div className="stat-value">{catalogItems.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Categories</div>
          <div className="stat-value">{categoryCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">On Sale</div>
          <div className="stat-value" style={{ color: '#dc2626' }}>{onSaleCount}</div>
        </div>
      </div>

      {/* Filter */}
      <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Filter:</span>
        <select className="table-select" value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }} style={{ width: 180 }}>
          <option value="">All Categories</option>
          {categoryNames.map(n => <option key={n} value={n}>{n}</option>)}
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
                <SortableHeader label="Item" field="item_name" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Supplier" field="supplier_name" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th>Category</th>
                <th>Unit</th>
                <SortableHeader label="Retail Price" field="retail_cost" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Stock" field="qty_available" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th>Sale</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <EmptyState icon="&#128230;" title="No catalog items" message="Mark inventory items as available and assign them to a category to populate the catalog." />
                  </td>
                </tr>
              ) : (
                paginated.map(item => {
                  const leaf = taxonomyLeaves.find(l => l.id === item.category_id);
                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600 }}>{item.item_name}</td>
                      <td>{item.supplier_name || '\u2014'}</td>
                      <td>{leaf ? <span className="badge badge-blue">{leaf.name}</span> : '\u2014'}</td>
                      <td>{item.unit || '\u2014'}</td>
                      <td style={{ fontWeight: 500, color: 'var(--color-primary)' }}>
                        {item.retail_cost != null ? `$${Number(item.retail_cost).toFixed(2)}` : '\u2014'}
                      </td>
                      <td>{item.qty_available ?? 0}</td>
                      <td>
                        {item.on_sale ? (
                          <span className="badge badge-red" style={{ fontSize: '0.7rem' }}>
                            {item.sale_price != null ? `$${Number(item.sale_price).toFixed(2)}` : 'SALE'}
                          </span>
                        ) : '\u2014'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
