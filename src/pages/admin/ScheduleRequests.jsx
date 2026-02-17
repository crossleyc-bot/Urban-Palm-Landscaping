import { useState, useEffect } from 'react';
import { apiGet } from '../../api';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/Skeleton';
import Pagination from '../../components/ui/Pagination';

const PAGE_SIZE = 10;

export default function ScheduleRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    apiGet('/schedule').then(setRequests).finally(() => setLoading(false));
  }, []);

  const totalPages = Math.ceil(requests.length / PAGE_SIZE);
  const paginated = requests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="page-header">
        <h1>Schedule Requests</h1>
        <p>View incoming service scheduling requests from customers.</p>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Service</th>
                <th>Date</th>
                <th>Time</th>
                <th>Frequency</th>
                <th>Address</th>
                <th>Notes</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTable rows={5} cols={8} />
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <EmptyState icon="&#128198;" title="No schedule requests yet" message="Schedule requests from customers will appear here." />
                  </td>
                </tr>
              ) : (
                paginated.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500 }}>{r.id}</td>
                    <td>{r.service}</td>
                    <td>{r.date}</td>
                    <td>{r.time || '\u2014'}</td>
                    <td>{r.frequency || '\u2014'}</td>
                    <td>{r.address}</td>
                    <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      title={r.notes}>{r.notes || '\u2014'}</td>
                    <td>{r.created_at ? new Date(r.created_at).toLocaleDateString() : '\u2014'}</td>
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
