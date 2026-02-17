import { useState, useEffect } from 'react';
import { apiGet } from '../../api';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/Skeleton';
import Pagination from '../../components/ui/Pagination';

const PAGE_SIZE = 10;

export default function QuoteRequests() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    apiGet('/quotes').then(setQuotes).finally(() => setLoading(false));
  }, []);

  const totalPages = Math.ceil(quotes.length / PAGE_SIZE);
  const paginated = quotes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="page-header">
        <h1>Quote Requests</h1>
        <p>View incoming quote requests from customers.</p>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Service</th>
                <th>Property</th>
                <th>Timeline</th>
                <th>Budget</th>
                <th>Address</th>
                <th>Details</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTable rows={5} cols={8} />
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <EmptyState icon="&#9993;" title="No quote requests yet" message="Quote requests from customers will appear here." />
                  </td>
                </tr>
              ) : (
                paginated.map((q) => (
                  <tr key={q.id}>
                    <td style={{ fontWeight: 500 }}>{q.id}</td>
                    <td>{q.service}</td>
                    <td>{q.property_type || '\u2014'}</td>
                    <td>{q.timeline || '\u2014'}</td>
                    <td>{q.budget || '\u2014'}</td>
                    <td>{q.address}</td>
                    <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      title={q.details}>{q.details}</td>
                    <td>{q.created_at ? new Date(q.created_at).toLocaleDateString() : '\u2014'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
