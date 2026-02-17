import { useState, useEffect } from 'react';
import { apiGet } from '../../api';

export default function ScheduleRequests() {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    apiGet('/schedule').then(setRequests);
  }, []);

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
              {requests.length > 0 ? requests.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 500 }}>{r.id}</td>
                  <td>{r.service}</td>
                  <td>{r.date}</td>
                  <td>{r.time || '—'}</td>
                  <td>{r.frequency || '—'}</td>
                  <td>{r.address}</td>
                  <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    title={r.notes}>{r.notes || '—'}</td>
                  <td>{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                    No schedule requests yet.
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
