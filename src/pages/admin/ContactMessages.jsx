import { useState, useEffect } from 'react';
import { apiGet } from '../../api';

export default function ContactMessages() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    apiGet('/contact').then(setMessages);
  }, []);

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
              {messages.length > 0 ? messages.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 500 }}>{m.id}</td>
                  <td>{m.name}</td>
                  <td>{m.email}</td>
                  <td>{m.phone || '—'}</td>
                  <td>{m.service || '—'}</td>
                  <td style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    title={m.message}>{m.message}</td>
                  <td>{m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                    No contact messages yet.
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
