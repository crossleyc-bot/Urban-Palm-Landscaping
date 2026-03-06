import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { apiGet, apiPost } from '../../api';
import SEO from '../../components/SEO';

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

function CheckoutForm({ order, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [cardComplete, setCardComplete] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError('');

    try {
      const { clientSecret } = await apiPost(`/orders/${order.id}/create-payment-intent`, {});
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardElement) },
      });

      if (stripeError) {
        setError(stripeError.message);
        setSubmitting(false);
        return;
      }

      const result = await apiPost(`/orders/${order.id}/confirm-payment`, {
        payment_intent_id: paymentIntent.id,
      });
      onSuccess(result);
    } catch (err) {
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Payment Details</h2>
        <div className="form-group">
          <label className="form-label">Card Information</label>
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
      <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={!stripe || !cardComplete || submitting}>
        {submitting ? 'Processing...' : `Pay $${order.total.toFixed(2)}`}
      </button>
    </form>
  );
}

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [stripePromise, setStripePromise] = useState(null);
  const [stripeError, setStripeError] = useState(false);
  const [success, setSuccess] = useState(null);
  const [placeError, setPlaceError] = useState('');

  const tax = Math.round(subtotal * 0.07 * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  useEffect(() => {
    getStripePromise().then(sp => {
      if (!sp) setStripeError(true);
      setStripePromise(sp);
    });
  }, []);

  if (!user) {
    return (
      <div className="products-page">
        <section className="section">
          <div className="container" style={{ textAlign: 'center', padding: '4rem 0' }}>
            <h1 style={{ marginBottom: '1rem' }}>Please Log In</h1>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>You need to be logged in to checkout.</p>
            <Link to="/login" className="btn btn-primary">Log In</Link>
          </div>
        </section>
      </div>
    );
  }

  if (items.length === 0 && !success) {
    return (
      <div className="products-page">
        <section className="section">
          <div className="container" style={{ textAlign: 'center', padding: '4rem 0' }}>
            <h1 style={{ marginBottom: '1rem' }}>Cart is Empty</h1>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>Add some products before checking out.</p>
            <Link to="/products" className="btn btn-primary">Browse Products</Link>
          </div>
        </section>
      </div>
    );
  }

  const placeOrder = async () => {
    setPlacing(true);
    setPlaceError('');
    try {
      const result = await apiPost('/orders', {
        user_id: user.id,
        items: items.map(i => ({ inventory_id: i.inventory_id, quantity: i.quantity })),
      });
      setOrder(result);
    } catch (err) {
      setPlaceError(err.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  };

  const handlePaymentSuccess = (result) => {
    setSuccess(result);
    clearCart();
  };

  if (success) {
    return (
      <div className="products-page">
        <SEO title="Order Confirmed" path="/checkout" />
        <section className="section">
          <div className="container" style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center', padding: '3rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#10003;</div>
            <h1 style={{ color: '#16a34a', marginBottom: '0.5rem' }}>Order Confirmed!</h1>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
              Your payment has been processed successfully.
            </p>
            <div className="card" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Order #</span>
                <span style={{ fontWeight: 600 }}>{order?.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Transaction ID</span>
                <span style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '0.8rem' }}>{success.transaction_id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Payment Method</span>
                <span style={{ fontWeight: 500 }}>{success.payment_method}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Date</span>
                <span style={{ fontWeight: 500 }}>{success.paid_date}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <Link to="/portal/orders" className="btn btn-primary">View Orders</Link>
              <Link to="/products" className="btn btn-outline">Continue Shopping</Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="products-page">
      <SEO title="Checkout" description="Complete your order." path="/checkout" />
      <section className="page-hero">
        <div className="container">
          <h1>Checkout</h1>
          <p>Review your order and complete payment.</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', alignItems: 'start' }}>
            {/* Left column: Order items + payment */}
            <div>
              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Order Items ({items.length})</h2>
                {items.map(item => (
                  <div key={item.inventory_id} style={{
                    display: 'flex', gap: '0.75rem', padding: '0.5rem 0',
                    borderBottom: '1px solid var(--color-border)', alignItems: 'center',
                  }}>
                    {item.image && (
                      <img src={item.image} alt={item.item_name} style={{
                        width: 48, height: 48, borderRadius: 6, objectFit: 'cover',
                        border: '1px solid var(--color-border)', flexShrink: 0,
                      }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.item_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        Qty: {item.quantity} x ${Number(item.price).toFixed(2)}
                      </div>
                    </div>
                    <div style={{ fontWeight: 600, flexShrink: 0 }}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              {!order ? (
                <div>
                  {placeError && <p style={{ color: '#dc2626', fontSize: '0.9rem', marginBottom: '0.75rem' }}>{placeError}</p>}
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={placeOrder}
                    disabled={placing}
                  >
                    {placing ? 'Placing Order...' : 'Place Order & Pay'}
                  </button>
                </div>
              ) : stripeError ? (
                <div className="card" style={{ textAlign: 'center' }}>
                  <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                    Online payments are not configured. Please contact the business to arrange payment.
                  </p>
                </div>
              ) : !stripePromise ? (
                <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                  <p style={{ color: 'var(--color-text-muted)' }}>Loading payment form...</p>
                </div>
              ) : (
                <Elements stripe={stripePromise}>
                  <CheckoutForm order={order} onSuccess={handlePaymentSuccess} />
                </Elements>
              )}
            </div>

            {/* Right column: Summary */}
            <div className="card" style={{ position: 'sticky', top: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Order Summary</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Tax (7%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem' }}>
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
              <Link to="/cart" className="btn btn-outline" style={{ width: '100%', textAlign: 'center', marginTop: '1rem' }}>
                Back to Cart
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
