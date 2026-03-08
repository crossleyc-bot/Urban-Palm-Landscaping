import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiGet, apiPut } from '../../api';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/Skeleton';
import Pagination from '../../components/ui/Pagination';
import SortableHeader from '../../components/ui/SortableHeader';
import printDocument from '../../utils/printDocument';

const statusBadge = (status) => {
  const map = {
    'Pending': 'badge badge-yellow',
    'Replied': 'badge badge-blue',
    'Approved': 'badge badge-green',
    'Declined': 'badge badge-red',
    'Converted': 'badge badge-purple',
  };
  return map[status] || 'badge badge-gray';
};

const PAGE_SIZE = 10;

export default function MyQuotes() {
  const { user } = useAuth();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [selected, setSelected] = useState(null);
  const [responding, setResponding] = useState(false);

  const respondToQuote = async (quote, newStatus) => {
    setResponding(true);
    try {
      const updated = await apiPut(`/quotes/${quote.id}/respond`, { status: newStatus });
      setQuotes(prev => prev.map(q => q.id === quote.id ? updated : q));
      setSelected(updated);
    } catch { /* silently fail */ }
    finally { setResponding(false); }
  };

  useEffect(() => {
    if (user) {
      apiGet('/my-quotes')
        .then(setQuotes)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
    setPage(1);
  };

  const sorted = useMemo(() => {
    return [...quotes].sort((a, b) => {
      const aVal = a[sortField] ?? '';
      const bVal = b[sortField] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [quotes, sortField, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="page-header">
        <h1>My Quotes</h1>
        <p>Track the status of your quote requests.</p>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <SortableHeader label="Service" field="service" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th>Address</th>
                <th>Budget</th>
                <SortableHeader label="Status" field="status" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Submitted" field="created_at" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTable rows={5} cols={7} />
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <EmptyState icon="&#9993;" title="No quotes yet" message="Request a quote to get started." />
                  </td>
                </tr>
              ) : (
                paginated.map((q) => (
                  <tr key={q.id}>
                    <td style={{ fontWeight: 500 }}>#{q.id}</td>
                    <td>{q.service}</td>
                    <td style={{ maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={q.address}>{q.address}</td>
                    <td>{q.budget || '\u2014'}</td>
                    <td><span className={statusBadge(q.status || 'Pending')}>{q.status || 'Pending'}</span></td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {q.created_at ? new Date(q.created_at + 'Z').toLocaleDateString() : '\u2014'}
                    </td>
                    <td>
                      <button className="btn btn-outline btn-sm" onClick={() => setSelected(q)}>View</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* View modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3>Quote #{selected.id}</h3>
              <button className="modal-close" onClick={() => setSelected(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="quote-detail-grid">
                <div><strong>Service:</strong> {selected.service}</div>
                <div><strong>Property:</strong> {selected.property_type || '\u2014'}</div>
                <div><strong>Timeline:</strong> {selected.timeline || '\u2014'}</div>
                <div><strong>Budget:</strong> {selected.budget || '\u2014'}</div>
                <div style={{ gridColumn: '1 / -1' }}><strong>Address:</strong> {selected.address}</div>
                <div style={{ gridColumn: '1 / -1' }}><strong>Details:</strong><br /><span style={{ whiteSpace: 'pre-wrap' }}>{selected.details}</span></div>
              </div>
              <div style={{ margin: '1rem 0', padding: '0.75rem', background: 'var(--color-bg-secondary)', borderRadius: 8, display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div><strong>Status:</strong> <span className={statusBadge(selected.status || 'Pending')}>{selected.status || 'Pending'}</span></div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Submitted {selected.created_at ? new Date(selected.created_at + 'Z').toLocaleString() : '\u2014'}</div>
              </div>
              {selected.admin_reply && (
                <div style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 8 }}>
                  <strong style={{ fontSize: '0.85rem' }}>Response from Urban Palm:</strong>
                  <p style={{ marginTop: '0.35rem', whiteSpace: 'pre-wrap', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>{selected.admin_reply}</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setSelected(null)}>Close</button>
              {selected.status === 'Replied' && (
                <>
                  <button className="btn btn-outline" style={{ color: '#dc2626', borderColor: '#fca5a5' }} disabled={responding} onClick={() => respondToQuote(selected, 'Declined')}>
                    {responding ? 'Saving...' : 'Decline'}
                  </button>
                  <button className="btn btn-primary" disabled={responding} onClick={() => respondToQuote(selected, 'Approved')}>
                    {responding ? 'Saving...' : 'Approve Quote'}
                  </button>
                </>
              )}
              <button className="btn btn-outline" onClick={() => printDocument({
                title: `Quote #${selected.id}`,
                subtitle: `Submitted ${selected.created_at ? new Date(selected.created_at + 'Z').toLocaleDateString() : '\u2014'}`,
                fields: [
                  { label: 'Service', value: selected.service },
                  { label: 'Property Type', value: selected.property_type },
                  { label: 'Timeline', value: selected.timeline },
                  { label: 'Budget', value: selected.budget },
                  { label: 'Address', value: selected.address },
                  { label: 'Details', value: selected.details },
                  { label: 'Status', value: selected.status || 'Pending' },
                ],
                note: selected.admin_reply ? `Response from Urban Palm:\n${selected.admin_reply}` : undefined,
              })}>Print PDF</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
