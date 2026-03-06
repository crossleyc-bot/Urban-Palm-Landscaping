import { useState, useEffect, useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
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

// Cache the stripe promise so it's only loaded once
let stripePromiseCache = null;
function getStripePromise() {
  if (!stripePromiseCache) {
    stripePromiseCache = apiGet('/stripe/public-key').then(({ publishableKey }) => {
      if (!publishableKey) return null;
      return loadStripe(publishableKey);
    });
  }
  return stripePromiseCache;
}

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#1a1a2e',
      fontFamily: 'Inter, system-ui, sans-serif',
      '::placeholder': { color: '#94a3b8' },
    },
    invalid: { color: '#dc2626' },
  },
};

function StripePaymentForm({ invoice, onClose, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [cardComplete, setCardComplete] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError('');

    try {
      // 1. Create PaymentIntent on the server
      const { clientSecret } = await apiPost(`/invoices/${invoice.id}/create-payment-intent`, {});

      // 2. Confirm the payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardElement) },
      });

      if (stripeError) {
        setError(stripeError.message);
        setSubmitting(false);
        return;
      }

      // 3. Tell our server the payment succeeded
      const result = await apiPost(`/invoices/${invoice.id}/confirm-payment`, {
        payment_intent_id: paymentIntent.id,
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
                <span style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '0.8rem' }}>{success.transaction_id}</span>
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
              <label className="form-label">Card Details</label>
              <div style={{
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                padding: '0.75rem 1rem',
                background: 'var(--color-surface)',
              }}>
                <CardElement
                  options={CARD_ELEMENT_OPTIONS}
                  onChange={(e) => setCardComplete(e.complete)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Payments secured by Stripe. Your card details never touch our servers.
            </div>

            {error && <p style={{ color: '#dc2626', fontSize: '0.9rem', marginTop: '0.75rem' }}>{error}</p>}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={!stripe || !cardComplete || submitting}>
              {submitting ? 'Processing...' : `Pay $${invoice.amount.toLocaleString()}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PaymentModal({ invoice, onClose, onSuccess }) {
  const [stripePromise, setStripePromise] = useState(null);
  const [stripeError, setStripeError] = useState(false);

  useEffect(() => {
    getStripePromise().then(sp => {
      if (!sp) setStripeError(true);
      setStripePromise(sp);
    });
  }, []);

  if (stripeError) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
          <div className="modal-header">
            <h2>Payment Unavailable</h2>
            <button className="modal-close" onClick={onClose}>&times;</button>
          </div>
          <div style={{ padding: '1.5rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              Online payments are not configured yet. Please contact the business to arrange payment.
            </p>
            <button className="btn btn-outline" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Loading payment form...
          </div>
        </div>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <StripePaymentForm invoice={invoice} onClose={onClose} onSuccess={onSuccess} />
    </Elements>
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
