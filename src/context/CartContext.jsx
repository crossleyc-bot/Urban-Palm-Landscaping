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
      const existing = prev.find(i => i.inventory_id === product.id);
      let next;
      if (existing) {
        next = prev.map(i =>
          i.inventory_id === product.id
            ? { ...i, quantity: i.quantity + qty }
            : i
        );
      } else {
        next = [...prev, {
          inventory_id: product.id,
          item_name: product.item_name,
          unit: product.unit,
          price: product.on_sale && product.sale_price != null ? product.sale_price : product.retail_cost,
          retail_cost: product.retail_cost,
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

  const updateQuantity = useCallback((inventoryId, quantity) => {
    setItems(prev => {
      const next = quantity <= 0
        ? prev.filter(i => i.inventory_id !== inventoryId)
        : prev.map(i => i.inventory_id === inventoryId ? { ...i, quantity } : i);
      localStorage.setItem('cart', JSON.stringify(next));
      return next;
    });
  }, []);

  const removeItem = useCallback((inventoryId) => {
    setItems(prev => {
      const next = prev.filter(i => i.inventory_id !== inventoryId);
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
