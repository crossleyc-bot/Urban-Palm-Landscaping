import { useState, useEffect } from 'react';
import { apiGet } from '../../api';

export default function QuoteRequests() {
  const [quotes, setQuotes] = useState([]);

  useEffect(() => {
    apiGet('/quotes').then(setQuotes);
  }, []);

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
              {quotes.length > 0 ? quotes.map((q) => (
                <tr key={q.id}>
                  <td style={{ fontWeight: 500 }}>{q.id}</td>
                  <td>{q.service}</td>
                  <td>{q.property_type || '—'}</td>
                  <td>{q.timeline || '—'}</td>
                  <td>{q.budget || '—'}</td>
                  <td>{q.address}</td>
                  <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    title={q.details}>{q.details}</td>
                  <td>{q.created_at ? new Date(q.created_at).toLocaleDateString() : '—'}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                    No quote requests yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
