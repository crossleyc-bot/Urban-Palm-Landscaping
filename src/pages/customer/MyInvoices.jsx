import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiGet, apiPost } from '../../api';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/Skeleton';
import Pagination from '../../components/ui/Pagination';
import SortableHeader from '../../components/ui/SortableHeader';
import printDocument from '../../utils/printDocument';

const statusBadge = (status) => {
  const map = {
    'Paid': 'badge badge-green',
    'Pending': 'badge badge-yellow',
    'Overdue': 'badge badge-red',
  };
  return map[status] || 'badge badge-gray';
};

const PAGE_SIZE = 10;

function detectCardBrand(number) {
  const n = number.replace(/\s/g, '');
  if (/^4/.test(n)) return 'Visa';
  if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'Amex';
  if (/^6(?:011|5)/.test(n)) return 'Discover';
  return 'Card';
}

function formatCardNumber(value) {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length > 2) return digits.slice(0, 2) + '/' + digits.slice(2);
  return digits;
}

function PaymentModal({ invoice, onClose, onSuccess }) {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const digits = cardNumber.replace(/\s/g, '');
  const brand = detectCardBrand(digits);
  const expiryParts = expiry.split('/');
  const isValid = digits.length >= 15 && expiryParts.length === 2 && expiryParts[0].length === 2 && expiryParts[1].length === 2 && cvv.length >= 3 && cardName.trim().length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await apiPost(`/invoices/${invoice.id}/pay`, {
        card_last4: digits.slice(-4),
        card_brand: brand,
      });
      setSuccess(result);
      onSuccess(invoice.id, result);
    } catch (err) {
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
          <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#10003;</div>
            <h2 style={{ color: '#16a34a', marginBottom: '0.5rem' }}>Payment Successful</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
              Your payment of <strong>${invoice.amount.toLocaleString()}</strong> has been processed.
            </p>
            <div style={{ background: 'var(--color-bg-secondary)', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem', textAlign: 'left', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Transaction ID</span>
                <span style={{ fontWeight: 500, fontFamily: 'monospace' }}>{success.transaction_id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Payment Method</span>
                <span style={{ fontWeight: 500 }}>{success.payment_method}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Date</span>
                <span style={{ fontWeight: 500 }}>{success.paid_date}</span>
              </div>
            </div>
            <button className="btn btn-primary" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h2>Pay Invoice {invoice.id}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '1.5rem' }}>
            <div style={{ background: 'var(--color-bg-secondary)', borderRadius: 8, padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Amount Due</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>${invoice.amount.toLocaleString()}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Due Date</div>
                <div style={{ fontWeight: 500 }}>{invoice.dueDate}</div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Name on Card</label>
              <input
                className="form-input"
                type="text"
                placeholder="John Smith"
                value={cardName}
                onChange={e => setCardName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Card Number</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="4242 4242 4242 4242"
                  value={cardNumber}
                  onChange={e => setCardNumber(formatCardNumber(e.target.value))}
                  maxLength={19}
                  required
                />
                {digits.length >= 4 && (
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                    {brand}
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Expiry</label>
                <input
                  className="form-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={e => setExpiry(formatExpiry(e.target.value))}
                  maxLength={5}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">CVV</label>
                <input
                  className="form-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="123"
                  value={cvv}
                  onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                  required
                />
              </div>
            </div>

            {error && <p style={{ color: '#dc2626', fontSize: '0.9rem', marginTop: '0.5rem' }}>{error}</p>}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={!isValid || submitting}>
              {submitting ? 'Processing...' : `Pay $${invoice.amount.toLocaleString()}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MyInvoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('dueDate');
  const [sortDir, setSortDir] = useState('desc');
  const [payingInvoice, setPayingInvoice] = useState(null);

  useEffect(() => {
    if (user) {
      apiGet(`/invoices?user_id=${user.id}`)
        .then(setInvoices)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
    setPage(1);
  };

  const handlePaymentSuccess = (invId, result) => {
    setInvoices(prev => prev.map(inv =>
      inv.id === invId
        ? { ...inv, status: 'Paid', paid_date: result.paid_date, payment_method: result.payment_method, transaction_id: result.transaction_id }
        : inv
    ));
  };

  const sorted = useMemo(() => {
    return [...invoices].sort((a, b) => {
      const aVal = a[sortField] ?? '';
      const bVal = b[sortField] ?? '';
      const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [invoices, sortField, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalOwed = invoices.filter(i => i.status !== 'Paid').reduce((sum, i) => sum + i.amount, 0);
  const totalPaid = invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + i.amount, 0);

  return (
    <div>
      <div className="page-header">
        <h1>My Invoices</h1>
        <p>View your invoices and pay online.</p>
      </div>

      {!loading && invoices.length > 0 && (
        <div className="stats-grid stagger-list" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-label">Total Invoices</div>
            <div className="stat-value">{invoices.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Amount Paid</div>
            <div className="stat-value" style={{ color: '#16a34a' }}>${totalPaid.toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Balance Due</div>
            <div className="stat-value" style={totalOwed > 0 ? { color: '#d97706' } : {}}>${totalOwed.toLocaleString()}</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <SortableHeader label="Invoice" field="id" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Amount" field="amount" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Date" field="date" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Due Date" field="dueDate" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <th>Job</th>
                <th>Status</th>
                <th style={{ width: 140 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTable rows={5} cols={7} />
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <EmptyState icon="&#128176;" title="No invoices yet" message="Invoices will appear here after your job is completed." />
                  </td>
                </tr>
              ) : (
                paginated.map((inv) => (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 500 }}>{inv.id}</td>
                    <td style={{ fontWeight: 500 }}>${inv.amount.toLocaleString()}</td>
                    <td>{inv.date}</td>
                    <td>{inv.dueDate}</td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{inv.job_id || '\u2014'}</td>
                    <td><span className={statusBadge(inv.status)}>{inv.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        {inv.status !== 'Paid' && (
                          <button className="btn btn-primary btn-sm" onClick={() => setPayingInvoice(inv)}>
                            Pay Now
                          </button>
                        )}
                        <button className="btn btn-outline btn-sm" onClick={() => printDocument({
                          title: `Invoice ${inv.id}`,
                          subtitle: `Issued ${inv.date}`,
                          fields: [
                            { label: 'Invoice #', value: inv.id },
                            { label: 'Amount', value: `$${inv.amount.toLocaleString()}` },
                            { label: 'Date Issued', value: inv.date },
                            { label: 'Due Date', value: inv.dueDate },
                            { label: 'Job', value: inv.job_id },
                            { label: 'Status', value: inv.status },
                            ...(inv.paid_date ? [{ label: 'Paid Date', value: inv.paid_date }] : []),
                            ...(inv.payment_method ? [{ label: 'Payment Method', value: inv.payment_method }] : []),
                            ...(inv.transaction_id ? [{ label: 'Transaction ID', value: inv.transaction_id }] : []),
                          ],
                        })}>Print</button>
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

      {payingInvoice && (
        <PaymentModal
          invoice={payingInvoice}
          onClose={() => setPayingInvoice(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
