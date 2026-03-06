import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import SEO from '../../components/SEO';

export default function Cart() {
  const { items, updateQuantity, removeItem, clearCart, subtotal } = useCart();
  const { user } = useAuth();
  const tax = Math.round(subtotal * 0.07 * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;

  return (
    <div className="products-page">
      <SEO title="Shopping Cart" description="Review your cart items before checkout." path="/cart" />
      <section className="page-hero">
        <div className="container">
          <h1>Shopping Cart</h1>
          <p>{items.length === 0 ? 'Your cart is empty.' : `${items.length} item${items.length !== 1 ? 's' : ''} in your cart`}</p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#128722;</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Your Cart is Empty</h2>
              <p style={{ color: 'var(--color-text-muted)', maxWidth: 480, margin: '0 auto 1.5rem' }}>
                Browse our products and add items to get started.
              </p>
              <Link to="/products" className="btn btn-primary">Browse Products</Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'start' }}>
              {/* Cart Items */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Cart Items</h2>
                  <button className="btn btn-outline btn-sm" onClick={clearCart}>Clear Cart</button>
                </div>
                {items.map(item => (
                  <div key={item.inventory_id} style={{
                    display: 'flex', gap: '1rem', padding: '1rem 1.25rem',
                    borderBottom: '1px solid var(--color-border)', alignItems: 'center',
                  }}>
                    {item.image && (
                      <img src={item.image} alt={item.item_name} style={{
                        width: 64, height: 64, borderRadius: 8, objectFit: 'cover',
                        border: '1px solid var(--color-border)', flexShrink: 0,
                      }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.15rem' }}>{item.item_name}</div>
                      {item.category_name && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{item.category_name}</div>
                      )}
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-primary)', marginTop: '0.25rem' }}>
                        ${Number(item.price).toFixed(2)}
                        {item.unit && <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', fontSize: '0.8rem' }}> / {item.unit}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ width: 32, padding: 0 }}
                        onClick={() => updateQuantity(item.inventory_id, item.quantity - 1)}
                      >
                        -
                      </button>
                      <span style={{ fontWeight: 600, minWidth: 24, textAlign: 'center' }}>{item.quantity}</span>
                      <button
                        className="btn btn-outline btn-sm"
                        style={{ width: 32, padding: 0 }}
                        onClick={() => updateQuantity(item.inventory_id, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', minWidth: 70, textAlign: 'right', flexShrink: 0 }}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ color: '#dc2626', borderColor: '#fca5a5', flexShrink: 0 }}
                      onClick={() => removeItem(item.inventory_id)}
                      title="Remove"
                    >
                      &#10005;
                    </button>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="card" style={{ position: 'sticky', top: '1rem' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Order Summary</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
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
                {user ? (
                  <Link to="/checkout" className="btn btn-primary" style={{ width: '100%', textAlign: 'center' }}>
                    Proceed to Checkout
                  </Link>
                ) : (
                  <div>
                    <Link to="/login" className="btn btn-primary" style={{ width: '100%', textAlign: 'center', marginBottom: '0.5rem' }}>
                      Log In to Checkout
                    </Link>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                      You need an account to place an order.
                    </p>
                  </div>
                )}
                <Link to="/products" className="btn btn-outline" style={{ width: '100%', textAlign: 'center', marginTop: '0.5rem' }}>
                  Continue Shopping
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
