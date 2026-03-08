import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { apiGet, apiPost } from '../../api';
import SEO from '../../components/SEO';
import Spinner from '../../components/ui/Spinner';

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

/* ── Inline auth / guest identity section ── */
function CustomerSection({ onReady }) {
  const { user, login, register } = useAuth();
  const [mode, setMode] = useState('guest'); // 'guest' | 'login' | 'register'
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, immediately signal ready
  useEffect(() => {
    if (user) onReady({ type: 'user', user_id: user.id });
  }, [user, onReady]);

  if (user) {
    return (
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'var(--color-primary)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '1rem', flexShrink: 0,
          }}>
            {user.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{user.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{user.email}</div>
          </div>
          <span style={{
            marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 600,
            color: '#16a34a', background: '#f0fdf4', padding: '0.2rem 0.6rem',
            borderRadius: 9999, flexShrink: 0,
          }}>Signed In</span>
        </div>
      </div>
    );
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const u = await login(email, password);
      onReady({ type: 'user', user_id: u.id });
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const u = await register(name, email, password);
      onReady({ type: 'user', user_id: u.id });
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = (e) => {
    e.preventDefault();
    setError('');
    if (!guestName.trim() || !guestEmail.trim()) {
      setError('Name and email are required');
      return;
    }
    onReady({ type: 'guest', guest_name: guestName.trim(), guest_email: guestEmail.trim() });
  };

  const tabs = [
    { key: 'guest', label: 'Guest Checkout' },
    { key: 'login', label: 'Sign In' },
    { key: 'register', label: 'Register' },
  ];

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Customer Information</h2>

      <div style={{
        display: 'flex', borderBottom: '2px solid var(--color-border)', marginBottom: '1.25rem',
      }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setMode(t.key); setError(''); }}
            style={{
              flex: 1, padding: '0.6rem 0.5rem', background: 'none', border: 'none',
              borderBottom: `2px solid ${mode === t.key ? 'var(--color-primary)' : 'transparent'}`,
              marginBottom: -2, fontSize: '0.85rem', fontWeight: mode === t.key ? 600 : 500,
              color: mode === t.key ? 'var(--color-primary)' : 'var(--color-text-muted)',
              cursor: 'pointer', transition: 'color 0.2s, border-color 0.2s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{
          background: '#fef2f2', color: '#dc2626', padding: '0.6rem 0.75rem',
          borderRadius: 8, fontSize: '0.85rem', marginBottom: '1rem',
        }}>
          {error}
        </div>
      )}

      {mode === 'guest' && (
        <form onSubmit={handleGuest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>
            No account needed. We just need your name and email for order confirmation.
          </p>
          <div className="form-group">
            <label htmlFor="guest-name">Full Name</label>
            <input id="guest-name" type="text" value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="John Smith" required />
          </div>
          <div className="form-group">
            <label htmlFor="guest-email">Email</label>
            <input id="guest-email" type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Continue as Guest
          </button>
        </form>
      )}

      {mode === 'login' && (
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label htmlFor="login-email">Email</label>
            <input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? <><Spinner size={16} /> Signing in...</> : 'Sign In & Continue'}
          </button>
        </form>
      )}

      {mode === 'register' && (
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label htmlFor="reg-name">Full Name</label>
            <input id="reg-name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="John Smith" required />
          </div>
          <div className="form-group">
            <label htmlFor="reg-email">Email</label>
            <input id="reg-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label htmlFor="reg-password">Password</label>
            <input id="reg-password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" required minLength={6} />
          </div>
          <div className="form-group">
            <label htmlFor="reg-confirm">Confirm Password</label>
            <input id="reg-confirm" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter your password" required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? <><Spinner size={16} /> Creating account...</> : 'Create Account & Continue'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const { user } = useAuth();
  const [customerInfo, setCustomerInfo] = useState(null);
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

  // If user logs in via CustomerSection or was already logged in, reflect it
  const handleCustomerReady = (info) => {
    setCustomerInfo(info);
  };

  const isCustomerReady = !!customerInfo;

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
      const payload = {
        items: items.map(i => ({ inventory_id: i.inventory_id, quantity: i.quantity })),
      };
      if (customerInfo.type === 'user') {
        payload.user_id = customerInfo.user_id;
      } else {
        payload.guest_name = customerInfo.guest_name;
        payload.guest_email = customerInfo.guest_email;
      }
      const result = await apiPost('/orders', payload);
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
              {user ? (
                <Link to="/portal/orders" className="btn btn-primary">View Orders</Link>
              ) : (
                <Link to="/products" className="btn btn-primary">Continue Shopping</Link>
              )}
              <Link to="/products" className="btn btn-outline">Browse Products</Link>
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
            {/* Left column */}
            <div>
              {/* Step 1: Customer info */}
              <CustomerSection onReady={handleCustomerReady} />

              {/* Step 2: Order items */}
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

              {/* Step 3: Place order & pay */}
              {!order ? (
                <div>
                  {placeError && <p style={{ color: '#dc2626', fontSize: '0.9rem', marginBottom: '0.75rem' }}>{placeError}</p>}
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={placeOrder}
                    disabled={placing || !isCustomerReady}
                    title={!isCustomerReady ? 'Please complete customer information above' : ''}
                  >
                    {!isCustomerReady ? 'Complete Info Above to Continue' : placing ? 'Placing Order...' : 'Place Order & Pay'}
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
