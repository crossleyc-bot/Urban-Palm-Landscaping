import { createContext, useContext, useState, useCallback } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('cart');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const persist = (next) => {
    setItems(next);
    localStorage.setItem('cart', JSON.stringify(next));
  };

  const addItem = useCallback((product, qty = 1) => {
    setItems(prev => {
      // Support both product_id (catalog) and legacy inventory_id
      const id = product.product_id || product.id;
      const existing = prev.find(i => i.product_id === id);
      let next;
      if (existing) {
        next = prev.map(i =>
          i.product_id === id
            ? { ...i, quantity: i.quantity + qty }
            : i
        );
      } else {
        next = [...prev, {
          product_id: id,
          item_name: product.item_name,
          unit: product.unit,
          price: product.on_sale && product.sale_price != null ? product.sale_price : (product.retail_cost || product.retail_price),
          retail_cost: product.retail_cost || product.retail_price,
          sale_price: product.sale_price,
          on_sale: product.on_sale,
          image: product.image,
          category_name: product.category_name,
          quantity: qty,
          max_qty: product.qty_available,
        }];
      }
      localStorage.setItem('cart', JSON.stringify(next));
      return next;
    });
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    setItems(prev => {
      const next = quantity <= 0
        ? prev.filter(i => i.product_id !== productId)
        : prev.map(i => i.product_id === productId ? { ...i, quantity } : i);
      localStorage.setItem('cart', JSON.stringify(next));
      return next;
    });
  }, []);

  const removeItem = useCallback((productId) => {
    setItems(prev => {
      const next = prev.filter(i => i.product_id !== productId);
      localStorage.setItem('cart', JSON.stringify(next));
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    persist([]);
  }, []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, updateQuantity, removeItem, clearCart, itemCount, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}
