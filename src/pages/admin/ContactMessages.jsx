import { useState, useEffect } from 'react';
import { apiGet } from '../../api';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/Skeleton';
import Pagination from '../../components/ui/Pagination';

const PAGE_SIZE = 10;

export default function ContactMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    apiGet('/contact').then(setMessages).finally(() => setLoading(false));
  }, []);

  const totalPages = Math.ceil(messages.length / PAGE_SIZE);
  const paginated = messages.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div>
      <div className="page-header">
        <h1>Contact Messages</h1>
        <p>View messages submitted through the public contact form.</p>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Service</th>
                <th>Message</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTable rows={5} cols={7} />
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <EmptyState icon="&#128172;" title="No contact messages yet" message="Messages from the contact form will appear here." />
                  </td>
                </tr>
              ) : (
                paginated.map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 500 }}>{m.id}</td>
                    <td>{m.name}</td>
                    <td>{m.email}</td>
                    <td>{m.phone || '\u2014'}</td>
                    <td>{m.service || '\u2014'}</td>
                    <td style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      title={m.message}>{m.message}</td>
                    <td>{m.created_at ? new Date(m.created_at).toLocaleDateString() : '\u2014'}</td>
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
