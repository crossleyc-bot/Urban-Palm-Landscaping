import { useState, useEffect } from 'react';
import { apiGet, apiPut, apiDelete } from '../../api';
import { useToast } from '../../components/ui/Toast';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/Skeleton';
import Pagination from '../../components/ui/Pagination';

const MESSAGE_STATUSES = ['New', 'Replied', 'Resolved'];

const statusBadge = (status) => {
  const map = {
    'New': 'badge badge-yellow',
    'Replied': 'badge badge-blue',
    'Resolved': 'badge badge-green',
  };
  return map[status] || 'badge badge-gray';
};

const PAGE_SIZE = 10;

export default function ContactMessages() {
  const { addToast } = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyForm, setReplyForm] = useState({ admin_reply: '', status: 'Replied' });
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    apiGet('/contact').then(setMessages).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'All' ? messages : messages.filter(m => (m.status || 'New') === filter);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openReply = (msg) => {
    setReplyingTo(msg);
    setReplyForm({ admin_reply: msg.admin_reply || '', status: msg.status || 'Replied' });
  };

  const closeReply = () => {
    setReplyingTo(null);
    setReplyForm({ admin_reply: '', status: 'Replied' });
  };

  const deleteMessage = async (id) => {
    if (!confirm('Delete this contact message?')) return;
    try {
      await apiDelete(`/contact/${id}`);
      setMessages(prev => prev.filter(m => m.id !== id));
      addToast('Message deleted', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to delete message', 'error');
    }
  };

  const submitReply = async () => {
    if (!replyForm.admin_reply.trim()) return;
    setSaving(true);
    try {
      await apiPut(`/contact/${replyingTo.id}/reply`, replyForm);
      setMessages(prev => prev.map(m => m.id === replyingTo.id ? { ...m, admin_reply: replyForm.admin_reply, status: replyForm.status } : m));
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
        <h1>Contact Messages</h1>
        <p>View and reply to messages submitted through the contact form.</p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['All', ...MESSAGE_STATUSES].map(f => (
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
                <th>Name</th>
                <th>Email</th>
                <th>Service</th>
                <th>Message</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTable rows={5} cols={8} />
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <EmptyState icon="&#128172;" title="No contact messages yet" message="Messages from the contact form will appear here." />
                  </td>
                </tr>
              ) : (
                paginated.map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 500 }}>{m.id}</td>
                    <td>{m.name}</td>
                    <td>{m.email}</td>
                    <td>{m.service || '\u2014'}</td>
                    <td style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      title={m.message}>{m.message}</td>
                    <td><span className={statusBadge(m.status || 'New')}>{m.status || 'New'}</span></td>
                    <td>{m.created_at ? new Date(m.created_at).toLocaleDateString() : '\u2014'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openReply(m)}>
                          {m.admin_reply ? 'View Reply' : 'Reply'}
                        </button>
                        <button className="btn btn-outline btn-sm" style={{ color: '#dc2626', borderColor: '#fca5a5' }} onClick={() => deleteMessage(m.id)}>Delete</button>
                      </div>
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
              <h3>Message from {replyingTo.name}</h3>
              <button className="modal-close" onClick={closeReply}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="quote-detail-grid">
                <div><strong>Name:</strong> {replyingTo.name}</div>
                <div><strong>Email:</strong> {replyingTo.email}</div>
                <div><strong>Phone:</strong> {replyingTo.phone || '\u2014'}</div>
                <div><strong>Service:</strong> {replyingTo.service || '\u2014'}</div>
              </div>
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--color-bg-secondary)', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.7 }}>
                {replyingTo.message}
              </div>
              <div className="form-group" style={{ marginTop: '1.25rem' }}>
                <label htmlFor="reply-status"><strong>Status</strong></label>
                <select
                  id="reply-status"
                  value={replyForm.status}
                  onChange={e => setReplyForm(f => ({ ...f, status: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                >
                  {MESSAGE_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label htmlFor="reply-message"><strong>Reply</strong></label>
                <textarea
                  id="reply-message"
                  rows={4}
                  placeholder="Type your reply..."
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
