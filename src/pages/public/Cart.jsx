import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import SEO from '../../components/SEO';
import './Cart.css';

export default function Cart() {
  const { items, updateQuantity, removeItem, clearCart, subtotal } = useCart();
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
            <div className="cart-layout">
              {/* Cart Items */}
              <div className="card cart-items-card">
                <div className="cart-items-header">
                  <h2>Cart Items</h2>
                  <button className="btn btn-outline btn-sm" onClick={clearCart}>Clear Cart</button>
                </div>
                {items.map(item => (
                  <CartItemRow key={item.inventory_id} item={item} updateQuantity={updateQuantity} removeItem={removeItem} />
                ))}
              </div>

              {/* Order Summary */}
              <div className="card cart-summary">
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Order Summary</h2>
                <div className="cart-summary-lines">
                  <div className="cart-summary-line">
                    <span className="cart-summary-label">Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="cart-summary-line">
                    <span className="cart-summary-label">Tax (7%)</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <div className="cart-summary-total">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
                <Link to="/checkout" className="btn btn-primary" style={{ width: '100%', textAlign: 'center' }}>
                  Proceed to Checkout
                </Link>
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

function CartItemRow({ item, updateQuantity, removeItem }) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(String(item.quantity));

  const commitQuantity = () => {
    setEditing(false);
    const num = parseInt(inputVal, 10);
    if (isNaN(num) || num <= 0) {
      removeItem(item.inventory_id);
    } else {
      const clamped = item.max_qty ? Math.min(num, item.max_qty) : num;
      updateQuantity(item.inventory_id, clamped);
      setInputVal(String(clamped));
    }
  };

  const decrement = () => {
    if (item.quantity <= 1) {
      removeItem(item.inventory_id);
    } else {
      updateQuantity(item.inventory_id, item.quantity - 1);
      setInputVal(String(item.quantity - 1));
    }
  };

  const increment = () => {
    if (item.max_qty && item.quantity >= item.max_qty) return;
    updateQuantity(item.inventory_id, item.quantity + 1);
    setInputVal(String(item.quantity + 1));
  };

  return (
    <div className="cart-item">
      <div className="cart-item-image">
        {item.image ? (
          <img src={item.image} alt={item.item_name} />
        ) : (
          <div className="cart-item-placeholder">&#128230;</div>
        )}
      </div>
      <div className="cart-item-details">
        <div className="cart-item-name">{item.item_name}</div>
        {item.category_name && (
          <div className="cart-item-category">{item.category_name}</div>
        )}
        <div className="cart-item-price">
          ${Number(item.price).toFixed(2)}
          {item.unit && <span className="cart-item-unit"> / {item.unit}</span>}
        </div>
      </div>
      <div className="cart-item-quantity">
        <button
          className="cart-qty-btn"
          onClick={decrement}
          title={item.quantity <= 1 ? 'Remove item' : 'Decrease quantity'}
        >
          {item.quantity <= 1 ? '\u2715' : '\u2212'}
        </button>
        {editing ? (
          <input
            className="cart-qty-input"
            type="number"
            min="0"
            max={item.max_qty || undefined}
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onBlur={commitQuantity}
            onKeyDown={e => { if (e.key === 'Enter') commitQuantity(); }}
            autoFocus
          />
        ) : (
          <button
            className="cart-qty-display"
            onClick={() => { setInputVal(String(item.quantity)); setEditing(true); }}
            title="Click to edit quantity"
          >
            {item.quantity}
          </button>
        )}
        <button
          className="cart-qty-btn"
          onClick={increment}
          disabled={item.max_qty > 0 && item.quantity >= item.max_qty}
          title="Increase quantity"
        >
          +
        </button>
      </div>
      <div className="cart-item-line-total">
        ${(item.price * item.quantity).toFixed(2)}
      </div>
      <button
        className="cart-item-remove"
        onClick={() => removeItem(item.inventory_id)}
        title="Remove item"
      >
        &#10005;
      </button>
    </div>
  );
}
