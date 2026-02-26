import { useState, useEffect } from 'react';
import { apiGet, apiPut } from '../../api';
import { useToast } from '../../components/ui/Toast';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/Skeleton';
import Pagination from '../../components/ui/Pagination';

const QUOTE_STATUSES = ['Pending', 'Replied', 'Approved', 'Declined'];

const statusBadge = (status) => {
  const map = {
    'Pending': 'badge badge-yellow',
    'Replied': 'badge badge-blue',
    'Approved': 'badge badge-green',
    'Declined': 'badge badge-red',
  };
  return map[status] || 'badge badge-gray';
};

const PAGE_SIZE = 10;

export default function QuoteRequests() {
  const { addToast } = useToast();
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyForm, setReplyForm] = useState({ admin_reply: '', status: 'Replied' });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    apiGet('/quotes').then(setQuotes).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'All' ? quotes : quotes.filter(q => (q.status || 'Pending') === filter);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openReply = (quote) => {
    setReplyingTo(quote);
    setReplyForm({ admin_reply: quote.admin_reply || '', status: quote.status || 'Replied' });
  };

  const closeReply = () => {
    setReplyingTo(null);
    setReplyForm({ admin_reply: '', status: 'Replied' });
  };

  const submitReply = async () => {
    if (!replyForm.admin_reply.trim()) return;
    setSaving(true);
    try {
      await apiPut(`/quotes/${replyingTo.id}/reply`, replyForm);
      setQuotes(prev => prev.map(q => q.id === replyingTo.id ? { ...q, admin_reply: replyForm.admin_reply, status: replyForm.status } : q));
      closeReply();
      addToast('Reply sent successfully', 'success');
    } catch {
      addToast('Failed to send reply', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Quote Requests</h1>
        <p>View and respond to incoming quote requests from customers.</p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['All', ...QUOTE_STATUSES].map(f => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => { setFilter(f); setPage(1); }}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Service</th>
                <th>Property</th>
                <th>Budget</th>
                <th>Address</th>
                <th>Details</th>
                <th>Status</th>
                <th>Actions</th>
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
                    <td>{q.budget || '\u2014'}</td>
                    <td>{q.address}</td>
                    <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      title={q.details}>{q.details}</td>
                    <td><span className={statusBadge(q.status || 'Pending')}>{q.status || 'Pending'}</span></td>
                    <td>
                      <button className="btn btn-outline btn-sm" onClick={() => openReply(q)}>
                        {q.admin_reply ? 'View Reply' : 'Reply'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {replyingTo && (
        <div className="modal-overlay" onClick={closeReply}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Quote Request #{replyingTo.id}</h3>
              <button className="modal-close" onClick={closeReply}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="quote-detail-grid">
                <div><strong>Service:</strong> {replyingTo.service}</div>
                <div><strong>Property:</strong> {replyingTo.property_type || '\u2014'}</div>
                <div><strong>Timeline:</strong> {replyingTo.timeline || '\u2014'}</div>
                <div><strong>Budget:</strong> {replyingTo.budget || '\u2014'}</div>
                <div style={{ gridColumn: '1 / -1' }}><strong>Address:</strong> {replyingTo.address}</div>
                <div style={{ gridColumn: '1 / -1' }}><strong>Details:</strong> {replyingTo.details}</div>
              </div>
              <div className="form-group" style={{ marginTop: '1.25rem' }}>
                <label htmlFor="reply-status"><strong>Status</strong></label>
                <select
                  id="reply-status"
                  value={replyForm.status}
                  onChange={e => setReplyForm(f => ({ ...f, status: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                >
                  {QUOTE_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label htmlFor="reply-message"><strong>Reply Message</strong></label>
                <textarea
                  id="reply-message"
                  rows={4}
                  placeholder="Type your reply to the customer..."
                  value={replyForm.admin_reply}
                  onChange={e => setReplyForm(f => ({ ...f, admin_reply: e.target.value }))}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--color-border)', resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={closeReply}>Cancel</button>
              <button className="btn btn-primary" onClick={submitReply} disabled={saving || !replyForm.admin_reply.trim()}>
                {saving ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
