import { Router } from 'express';
import Stripe from 'stripe';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { notifyOptedInUsers } from '../helpers.js';

const router = Router();

// ─── Stripe public key (no auth required) ───────────────────────────────────

router.get('/stripe/public-key', (_req, res) => {
  const row = db.prepare("SELECT value FROM site_settings WHERE key = 'stripe_publishable_key'").get();
  res.json({ publishableKey: row ? row.value : null });
});

// ─── Public Products ────────────────────────────────────────────────────────

router.get('/products', (req, res) => {
  const leaves = db.prepare(`
    SELECT t.id, t.name, t.description, t.image, t.parent_id,
           t.delivery_fee AS category_delivery_fee,
           t.installation_fee AS category_installation_fee,
           p.name AS parent_name,
           COUNT(DISTINCT si.item_name) AS product_count,
           MIN(si.retail_cost) AS min_price,
           MAX(si.retail_cost) AS max_price,
           MAX(si.on_sale) AS has_sale,
           MIN(CASE WHEN si.on_sale = 1 THEN si.sale_price ELSE NULL END) AS min_sale_price
    FROM taxonomy t
    LEFT JOIN taxonomy p ON p.id = t.parent_id
    JOIN supplier_inventory si ON si.category_id = t.id AND si.available = 1
    WHERE NOT EXISTS (SELECT 1 FROM taxonomy c WHERE c.parent_id = t.id)
    GROUP BY t.id
    ORDER BY t.name
  `).all();

  res.json(leaves);
});

// ─── Product Items (public, for cart) ────────────────────────────────────────

router.get('/products/:categoryId/items', (req, res) => {
  const items = db.prepare(`
    SELECT MIN(si.id) AS id, si.item_name, si.unit,
           MAX(si.retail_cost) AS retail_cost,
           MAX(si.image) AS image,
           MAX(si.on_sale) AS on_sale,
           MIN(CASE WHEN si.on_sale = 1 THEN si.sale_price ELSE NULL END) AS sale_price,
           t.name AS category_name,
           SUM(si.qty_available) AS qty_available
    FROM supplier_inventory si
    LEFT JOIN taxonomy t ON t.id = si.category_id
    WHERE si.category_id = ? AND si.available = 1
    GROUP BY si.item_name, si.unit, si.category_id
    ORDER BY si.item_name
  `).all(req.params.categoryId);
  res.json(items);
});

// ─── Orders (Shopping Cart) ─────────────────────────────────────────────────

router.get('/orders', requireAuth, (req, res) => {
  let orders;
  if (req.user.role === 'admin') {
    const userId = req.query.user_id;
    if (userId) {
      orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(userId);
    } else {
      orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
    }
  } else {
    orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  }
  res.json(orders);
});

router.get('/orders/:id', requireAuth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  res.json({ ...order, items });
});

router.post('/orders', (req, res) => {
  const { user_id, guest_name, guest_email, items, add_delivery, delivery_address, add_installation, coupon_code } = req.body;
  if (!items || !items.length) {
    return res.status(400).json({ error: 'items are required' });
  }
  if (!user_id && (!guest_name || !guest_email)) {
    return res.status(400).json({ error: 'Sign in or provide guest name and email' });
  }

  let subtotal = 0;
  const resolved = [];
  for (const item of items) {
    const invId = item.product_id || item.inventory_id;
    const inv = db.prepare('SELECT * FROM supplier_inventory WHERE id = ? AND available = 1').get(invId);
    if (!inv) return res.status(400).json({ error: `Product ${invId} not available` });

    // Aggregate stock across all suppliers carrying this product in the same category
    const totalStock = db.prepare(
      'SELECT COALESCE(SUM(qty_available), 0) AS total FROM supplier_inventory WHERE item_name = ? AND category_id = ? AND available = 1'
    ).get(inv.item_name, inv.category_id);
    const totalAvailable = totalStock.total;
    if (totalAvailable > 0 && item.quantity > totalAvailable) {
      return res.status(400).json({ error: `Only ${totalAvailable} of "${inv.item_name}" available` });
    }

    // Use max retail_cost as the catalog price (consistent with what customers see)
    const catalogPrice = db.prepare(
      'SELECT MAX(retail_cost) AS price FROM supplier_inventory WHERE item_name = ? AND category_id = ? AND available = 1'
    ).get(inv.item_name, inv.category_id);
    const retailPrice = catalogPrice.price || inv.retail_cost;
    const price = inv.on_sale && inv.sale_price != null ? inv.sale_price : retailPrice;
    subtotal += price * item.quantity;
    resolved.push({ inv, quantity: item.quantity, price });
  }

  const getSetting = (key) => {
    const row = db.prepare("SELECT value FROM site_settings WHERE key = ?").get(key);
    return row ? parseFloat(row.value) || 0 : 0;
  };

  let deliveryFee = 0;
  if (add_delivery) {
    const defaultDeliveryFee = getSetting('delivery_fee');
    const deliveryMin = getSetting('delivery_minimum');
    if (deliveryMin > 0 && subtotal < deliveryMin) {
      return res.status(400).json({ error: `Minimum order of $${deliveryMin.toFixed(2)} required for delivery` });
    }
    // Max-fee model: charge the highest delivery fee across all cart item categories
    let maxCategoryDeliveryFee = null;
    for (const r of resolved) {
      if (r.inv.category_id) {
        const cat = db.prepare('SELECT delivery_fee FROM taxonomy WHERE id = ?').get(r.inv.category_id);
        if (cat && cat.delivery_fee != null) {
          maxCategoryDeliveryFee = Math.max(maxCategoryDeliveryFee ?? 0, cat.delivery_fee);
        }
      }
    }
    deliveryFee = maxCategoryDeliveryFee != null ? maxCategoryDeliveryFee : defaultDeliveryFee;
  }

  let installationFee = 0;
  if (add_installation) {
    const defaultInstallationFee = getSetting('installation_fee');
    // Per-item model: multiply installation fee by each item's quantity
    for (const r of resolved) {
      const catId = r.inv.category_id;
      let fee = defaultInstallationFee;
      if (catId) {
        const cat = db.prepare('SELECT installation_fee FROM taxonomy WHERE id = ?').get(catId);
        if (cat && cat.installation_fee != null) {
          fee = cat.installation_fee;
        }
      }
      installationFee += fee * r.quantity;
    }
  }

  let discount = 0;
  let appliedCoupon = null;
  if (coupon_code) {
    const coupon = db.prepare('SELECT * FROM coupons WHERE UPPER(code) = UPPER(?) AND active = 1').get(coupon_code.trim());
    if (!coupon) return res.status(400).json({ error: 'Invalid coupon code' });
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This coupon has expired' });
    }
    if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) {
      return res.status(400).json({ error: 'This coupon has reached its usage limit' });
    }
    if (subtotal < coupon.min_order) {
      return res.status(400).json({ error: `Minimum order of $${coupon.min_order.toFixed(2)} required for this coupon` });
    }
    discount = coupon.type === 'percentage'
      ? Math.round(subtotal * (coupon.value / 100) * 100) / 100
      : coupon.value;
    discount = Math.min(discount, subtotal);
    appliedCoupon = coupon;
  }

  const discountedSubtotal = subtotal - discount;
  const tax = Math.round(discountedSubtotal * 0.07 * 100) / 100;
  const total = Math.round((discountedSubtotal + deliveryFee + installationFee + tax) * 100) / 100;

  const result = db.prepare(
    'INSERT INTO orders (user_id, guest_name, guest_email, subtotal, tax, total, delivery_fee, installation_fee, delivery_address, coupon_code, discount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(user_id || null, guest_name || null, guest_email || null, subtotal, tax, total, deliveryFee, installationFee, delivery_address || null, appliedCoupon?.code || null, discount);

  const orderId = result.lastInsertRowid;
  const insertItem = db.prepare(
    'INSERT INTO order_items (order_id, inventory_id, product_id, item_name, unit, price, quantity) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const updateQty = db.prepare(
    'UPDATE supplier_inventory SET qty_available = qty_available - ? WHERE id = ?'
  );

  for (const r of resolved) {
    insertItem.run(orderId, r.inv.id, null, r.inv.item_name, r.inv.unit, r.price, r.quantity);

    // Deduct stock across all suppliers carrying this product, cheapest unit_cost first
    const sources = db.prepare(
      'SELECT id, qty_available FROM supplier_inventory WHERE item_name = ? AND category_id = ? AND available = 1 AND qty_available > 0 ORDER BY unit_cost ASC'
    ).all(r.inv.item_name, r.inv.category_id);
    let remaining = r.quantity;
    for (const src of sources) {
      if (remaining <= 0) break;
      const deduct = Math.min(remaining, src.qty_available);
      updateQty.run(deduct, src.id);
      remaining -= deduct;
    }
  }

  if (appliedCoupon) {
    db.prepare('UPDATE coupons SET uses_count = uses_count + 1 WHERE id = ?').run(appliedCoupon.id);
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
  res.status(201).json({ ...order, items: orderItems });
});

router.post('/orders/:id/create-payment-intent', requireAuth, async (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status === 'Paid') return res.status(400).json({ error: 'Order already paid' });

  const stripeKey = db.prepare("SELECT value FROM site_settings WHERE key = 'stripe_secret_key'").get();
  if (!stripeKey?.value) return res.status(500).json({ error: 'Stripe not configured' });

  try {
    const stripe = new Stripe(stripeKey.value);
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(order.total * 100),
      currency: 'usd',
      metadata: { order_id: String(order.id) },
    });
    res.json({ clientSecret: intent.client_secret });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/orders/:id/confirm-payment', requireAuth, async (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const { payment_intent_id } = req.body;
  const stripeKey = db.prepare("SELECT value FROM site_settings WHERE key = 'stripe_secret_key'").get();
  if (!stripeKey?.value) return res.status(500).json({ error: 'Stripe not configured' });

  try {
    const stripe = new Stripe(stripeKey.value);
    const intent = await stripe.paymentIntents.retrieve(payment_intent_id);
    if (intent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    const card = intent.charges?.data?.[0]?.payment_method_details?.card;
    const method = card ? `${card.brand.charAt(0).toUpperCase() + card.brand.slice(1)} ending in ${card.last4}` : 'Card';
    const paidDate = new Date().toISOString().split('T')[0];

    db.prepare(
      'UPDATE orders SET status = ?, payment_method = ?, transaction_id = ?, paid_date = ?, updated_at = datetime(?) WHERE id = ?'
    ).run('Paid', method, payment_intent_id, paidDate, paidDate, order.id);

    res.json({ status: 'Paid', payment_method: method, transaction_id: payment_intent_id, paid_date: paidDate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Checkout Settings (public) ───────────────────────────────────────────────

router.get('/checkout-settings', (_req, res) => {
  const get = (key) => {
    const row = db.prepare("SELECT value FROM site_settings WHERE key = ?").get(key);
    return row ? parseFloat(row.value) || 0 : 0;
  };

  // Per-category fee overrides (leaf categories only)
  const categoryFees = db.prepare(`
    SELECT t.id, t.name, t.delivery_fee, t.installation_fee
    FROM taxonomy t
    WHERE (t.delivery_fee IS NOT NULL OR t.installation_fee IS NOT NULL)
      AND NOT EXISTS (SELECT 1 FROM taxonomy c WHERE c.parent_id = t.id)
  `).all();

  res.json({
    delivery_fee: get('delivery_fee'),
    installation_fee: get('installation_fee'),
    delivery_minimum: get('delivery_minimum'),
    category_fees: categoryFees,
  });
});

// ─── Coupons ──────────────────────────────────────────────────────────────────

router.get('/coupons', requireAuth, requireAdmin, (_req, res) => {
  const coupons = db.prepare('SELECT * FROM coupons ORDER BY created_at DESC').all();
  res.json(coupons);
});

router.post('/coupons', requireAuth, requireAdmin, (req, res) => {
  const { code, type, value, min_order, max_uses, active, expires_at } = req.body;
  if (!code || !type || value == null) {
    return res.status(400).json({ error: 'Code, type, and value are required' });
  }
  if (!['percentage', 'fixed'].includes(type)) {
    return res.status(400).json({ error: 'Type must be "percentage" or "fixed"' });
  }
  const existing = db.prepare('SELECT id FROM coupons WHERE UPPER(code) = UPPER(?)').get(code);
  if (existing) return res.status(409).json({ error: 'Coupon code already exists' });

  const isActive = active !== false ? 1 : 0;
  const result = db.prepare(
    'INSERT INTO coupons (code, type, value, min_order, max_uses, active, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(code.toUpperCase().trim(), type, value, min_order || 0, max_uses || null, isActive, expires_at || null);
  const coupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(result.lastInsertRowid);

  if (isActive) {
    const discount = type === 'percentage' ? `${value}%` : `$${Number(value).toFixed(2)}`;
    notifyOptedInUsers(
      'promo',
      `New Coupon: ${discount} Off!`,
      `Use code ${code.toUpperCase().trim()} to get ${discount} off your order${min_order > 0 ? ` (min. order $${Number(min_order).toFixed(2)})` : ''}.`,
      '/products'
    );
  }

  res.status(201).json(coupon);
});

router.put('/coupons/:id', requireAuth, requireAdmin, (req, res) => {
  const { code, type, value, min_order, max_uses, active, expires_at } = req.body;
  const existing = db.prepare('SELECT * FROM coupons WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Coupon not found' });

  const dup = db.prepare('SELECT id FROM coupons WHERE UPPER(code) = UPPER(?) AND id != ?').get(code, req.params.id);
  if (dup) return res.status(409).json({ error: 'Coupon code already exists' });

  db.prepare(
    'UPDATE coupons SET code = ?, type = ?, value = ?, min_order = ?, max_uses = ?, active = ?, expires_at = ? WHERE id = ?'
  ).run(code.toUpperCase().trim(), type, value, min_order || 0, max_uses || null, active ? 1 : 0, expires_at || null, req.params.id);
  const coupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(req.params.id);
  res.json(coupon);
});

router.delete('/coupons/:id', requireAuth, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM coupons WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.post('/coupons/validate', (req, res) => {
  const { code, subtotal } = req.body;
  if (!code) return res.status(400).json({ error: 'Coupon code is required' });

  const coupon = db.prepare('SELECT * FROM coupons WHERE UPPER(code) = UPPER(?) AND active = 1').get(code.trim());
  if (!coupon) return res.status(404).json({ error: 'Invalid coupon code' });

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return res.status(400).json({ error: 'This coupon has expired' });
  }
  if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) {
    return res.status(400).json({ error: 'This coupon has reached its usage limit' });
  }
  if (subtotal != null && subtotal < coupon.min_order) {
    return res.status(400).json({ error: `Minimum order of $${coupon.min_order.toFixed(2)} required for this coupon` });
  }

  let discount = 0;
  if (coupon.type === 'percentage') {
    discount = Math.round((subtotal || 0) * (coupon.value / 100) * 100) / 100;
  } else {
    discount = coupon.value;
  }
  if (subtotal != null) discount = Math.min(discount, subtotal);

  res.json({ valid: true, coupon_code: coupon.code, type: coupon.type, value: coupon.value, discount });
});

// ─── Current Deals (public) ─────────────────────────────────────────────────

router.get('/deals', (_req, res) => {
  const saleProducts = db.prepare(`
    SELECT MIN(si.id) AS id, si.item_name, MAX(si.retail_cost) AS retail_cost,
           MIN(si.sale_price) AS sale_price, MAX(si.image) AS image, t.name AS category_name
    FROM supplier_inventory si
    LEFT JOIN taxonomy t ON si.category_id = t.id
    WHERE si.on_sale = 1 AND si.available = 1 AND si.sale_price IS NOT NULL AND si.category_id IS NOT NULL
    GROUP BY si.item_name, si.category_id
    ORDER BY MAX(si.updated_at) DESC
    LIMIT 8
  `).all();

  const coupons = db.prepare(`
    SELECT code, type, value, min_order, expires_at
    FROM coupons
    WHERE active = 1
      AND (expires_at IS NULL OR expires_at > datetime('now'))
      AND (max_uses IS NULL OR uses_count < max_uses)
    ORDER BY created_at DESC
    LIMIT 4
  `).all();

  res.json({ saleProducts, coupons });
});

export default router;
