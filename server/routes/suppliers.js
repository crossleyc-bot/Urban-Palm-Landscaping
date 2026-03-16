import { Router } from 'express';
import { join } from 'path';
import { readFileSync, unlinkSync } from 'fs';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { upload, serverDir } from '../middleware/upload.js';
import { resolveCategoryId, autoAssignCategoryId, notifyOptedInUsers } from '../helpers.js';

const router = Router();

// ─── Suppliers ──────────────────────────────────────────────────────────────

router.get('/suppliers', requireAuth, requireAdmin, (req, res) => {
  const suppliers = db.prepare('SELECT * FROM suppliers ORDER BY name').all();
  res.json(suppliers);
});

router.post('/suppliers', requireAuth, requireAdmin, (req, res) => {
  const { name, contact_name, email, phone, address, website, operating_hours, delivery_info, delivery_fees, public_access, notes, status } = req.body;
  if (!name) return res.status(400).json({ error: 'Supplier name is required' });

  const result = db.prepare(
    'INSERT INTO suppliers (name, contact_name, email, phone, address, website, operating_hours, delivery_info, delivery_fees, public_access, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(name, contact_name || null, email || null, phone || null, address || null, website || null, operating_hours || null, delivery_info || null, delivery_fees || null, public_access || null, notes || null, status || 'Active');

  res.status(201).json({ id: result.lastInsertRowid, name, contact_name, email, phone, address, website, operating_hours, delivery_info, delivery_fees, public_access, notes, status: status || 'Active' });
});

router.put('/suppliers/:id', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { name, contact_name, email, phone, address, website, operating_hours, delivery_info, delivery_fees, public_access, notes, status } = req.body;
  if (!name) return res.status(400).json({ error: 'Supplier name is required' });

  const result = db.prepare(
    'UPDATE suppliers SET name = ?, contact_name = ?, email = ?, phone = ?, address = ?, website = ?, operating_hours = ?, delivery_info = ?, delivery_fees = ?, public_access = ?, notes = ?, status = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(name, contact_name || null, email || null, phone || null, address || null, website || null, operating_hours || null, delivery_info || null, delivery_fees || null, public_access || null, notes || null, status || 'Active', id);
  if (result.changes === 0) return res.status(404).json({ error: 'Supplier not found' });

  res.json({ success: true });
});

router.delete('/suppliers/:id', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Supplier not found' });
  res.json({ success: true });
});

router.delete('/suppliers', requireAuth, requireAdmin, (req, res) => {
  const images = db.prepare('SELECT image FROM supplier_inventory WHERE image IS NOT NULL').all();
  for (const row of images) {
    if (row.image) { try { unlinkSync(join(serverDir, row.image.replace(/^\//, ''))); } catch { /* ignore */ } }
  }
  db.prepare('DELETE FROM supplier_inventory').run();
  db.prepare('DELETE FROM suppliers').run();
  res.json({ success: true });
});

router.post('/suppliers/batch-delete', requireAuth, requireAdmin, (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array is required' });
  const placeholders = ids.map(() => '?').join(',');
  const images = db.prepare(`SELECT image FROM supplier_inventory WHERE supplier_id IN (${placeholders}) AND image IS NOT NULL`).all(...ids);
  for (const row of images) {
    if (row.image) { try { unlinkSync(join(serverDir, row.image.replace(/^\//, ''))); } catch { /* ignore */ } }
  }
  db.prepare(`DELETE FROM supplier_inventory WHERE supplier_id IN (${placeholders})`).run(...ids);
  const result = db.prepare(`DELETE FROM suppliers WHERE id IN (${placeholders})`).run(...ids);
  res.json({ success: true, deleted: result.changes });
});

const supplierImportUpload = (req, _res, next) => { req.uploadDir = 'imports'; next(); };

// Simple CSV parser that handles quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { result.push(current.trim()); current = ''; }
      else { current += ch; }
    }
  }
  result.push(current.trim());
  return result;
}

router.post('/suppliers/import', requireAuth, requireAdmin, supplierImportUpload, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File is required' });

  try {
    const raw = readFileSync(req.file.path, 'utf-8');
    const lines = raw.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) {
      unlinkSync(req.file.path);
      return res.status(400).json({ error: 'File contains no data rows' });
    }

    const headers = parseCSVLine(lines[0]);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = values[idx] || ''; });
      rows.push(obj);
    }

    const normalize = (key) => {
      const k = String(key).trim().toLowerCase().replace(/[\s_-]+/g, '_');
      const aliases = {
        company: 'name', company_name: 'name', supplier: 'name', supplier_name: 'name',
        contact: 'contact_name', contact_person: 'contact_name',
        phone_number: 'phone', telephone: 'phone',
        email_address: 'email',
        site: 'website', url: 'website', web: 'website',
        hours: 'operating_hours', business_hours: 'operating_hours', open_hours: 'operating_hours',
        delivery: 'delivery_info', delivery_description: 'delivery_info', delivery_details: 'delivery_info',
        fees: 'delivery_fees', delivery_cost: 'delivery_fees', shipping_fees: 'delivery_fees',
        access: 'public_access', public: 'public_access', walk_in: 'public_access', walkin: 'public_access',
        note: 'notes', comment: 'notes', comments: 'notes',
      };
      return aliases[k] || k;
    };

    const insert = db.prepare(
      'INSERT INTO suppliers (name, contact_name, email, phone, address, website, operating_hours, delivery_info, delivery_fees, public_access, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );

    let imported = 0;
    let skipped = 0;
    const insertMany = db.transaction((data) => {
      for (const raw of data) {
        const row = {};
        for (const [key, val] of Object.entries(raw)) {
          row[normalize(key)] = String(val).trim();
        }
        if (!row.name) { skipped++; continue; }
        insert.run(
          row.name,
          row.contact_name || null,
          row.email || null,
          row.phone || null,
          row.address || null,
          row.website || null,
          row.operating_hours || null,
          row.delivery_info || null,
          row.delivery_fees || null,
          row.public_access || null,
          row.notes || null,
          row.status || 'Active'
        );
        imported++;
      }
    });

    insertMany(rows);
    unlinkSync(req.file.path);

    res.json({ success: true, imported, skipped });
  } catch {
    if (req.file?.path) { try { unlinkSync(req.file.path); } catch { /* ignore */ } }
    res.status(400).json({ error: 'Failed to parse file. Ensure it is a valid CSV file.' });
  }
});

// ─── Supplier Inventory ─────────────────────────────────────────────────────

router.get('/suppliers/:supplierId/inventory', requireAuth, requireAdmin, (req, res) => {
  const { supplierId } = req.params;
  const items = db.prepare('SELECT * FROM supplier_inventory WHERE supplier_id = ? ORDER BY item_name').all(supplierId);
  res.json(items);
});

router.get('/inventory', requireAuth, requireAdmin, (req, res) => {
  const items = db.prepare(`
    SELECT si.*, s.name AS supplier_name
    FROM supplier_inventory si
    JOIN suppliers s ON s.id = si.supplier_id
    ORDER BY si.item_name
  `).all();
  res.json(items);
});

router.post('/inventory', requireAuth, requireAdmin, (req, res) => {
  const { supplier_id, item_name, sku, category, category_id, unit, unit_cost, retail_cost, qty_available, reorder_point, notes, available: availableRaw, on_sale: onSaleRaw, sale_price: salePriceRaw, sale_percentage: salePctRaw } = req.body;
  if (!supplier_id || !item_name) return res.status(400).json({ error: 'Supplier and item name are required' });

  const suppId = Number(supplier_id);
  if (!suppId || !Number.isFinite(suppId)) return res.status(400).json({ error: 'Invalid supplier' });
  const supplierExists = db.prepare('SELECT 1 FROM suppliers WHERE id = ?').get(suppId);
  if (!supplierExists) return res.status(400).json({ error: 'Supplier not found' });

  const wholesale = unit_cost != null && unit_cost !== '' ? Number(unit_cost) : null;
  const retail = retail_cost != null && retail_cost !== '' ? Number(retail_cost) : (wholesale != null ? +(wholesale * 1.5).toFixed(2) : null);
  let catId = resolveCategoryId(category_id);
  let catName = category || null;
  let autoAssigned = false;
  // Auto-assign taxonomy leaf if no category was explicitly set
  if (!catId) {
    const match = autoAssignCategoryId(item_name);
    if (match) {
      catId = match.id;
      catName = match.name;
      autoAssigned = true;
    }
  }
  const qtyVal = qty_available != null ? Number(qty_available) : 0;
  const available = availableRaw === '1' || availableRaw === 1 ? 1 : 0;
  const onSale = onSaleRaw === '1' || onSaleRaw === 1 ? 1 : 0;
  const salePct = salePctRaw != null && salePctRaw !== '' ? Number(salePctRaw) : null;
  // Auto-calculate sale_price from percentage if percentage is provided
  let salePrice = salePriceRaw != null && salePriceRaw !== '' ? Number(salePriceRaw) : null;
  if (salePct != null && retail != null) {
    salePrice = +(retail * (1 - salePct / 100)).toFixed(2);
  }
  try {
    const result = db.prepare(
      'INSERT INTO supplier_inventory (supplier_id, item_name, sku, category, category_id, unit, unit_cost, retail_cost, qty_available, reorder_point, notes, available, on_sale, sale_price, sale_percentage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(suppId, item_name, sku || null, catName, catId, unit || null, wholesale, retail, qtyVal, reorder_point != null ? Number(reorder_point) : 0, notes || null, available, onSale, salePrice, salePct);

    res.status(201).json({ id: result.lastInsertRowid, supplier_id: suppId, item_name, sku, category: catName, category_id: catId, unit, unit_cost: wholesale, retail_cost: retail, qty_available: qtyVal, reorder_point: reorder_point ?? 0, notes, available, on_sale: onSale, sale_price: salePrice, sale_percentage: salePct, auto_assigned: autoAssigned });
  } catch (err) {
    console.error('POST /api/inventory error:', { supplier_id: suppId, category_id: catId, error: err.message });
    res.status(500).json({ error: err.message || 'Failed to save inventory item' });
  }
});

const inventoryImportUpload = (req, _res, next) => { req.uploadDir = 'imports'; next(); };

router.post('/inventory/import', requireAuth, requireAdmin, inventoryImportUpload, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File is required' });

  try {
    const raw = readFileSync(req.file.path, 'utf-8');
    const lines = raw.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) {
      unlinkSync(req.file.path);
      return res.status(400).json({ error: 'File contains no data rows' });
    }

    const headers = parseCSVLine(lines[0]);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = values[idx] || ''; });
      rows.push(obj);
    }

    const normalize = (key) => {
      const k = String(key).trim().toLowerCase().replace(/[\s_-]+/g, '_');
      const aliases = {
        supplier: 'supplier_name', supplier_id: 'supplier_name', company: 'supplier_name', company_name: 'supplier_name',
        item: 'item_name', name: 'item_name', product: 'item_name', product_name: 'item_name',
        wholesale: 'unit_cost', wholesale_cost: 'unit_cost', cost: 'unit_cost', price: 'unit_cost',
        retail: 'retail_cost', retail_price: 'retail_cost', sell_price: 'retail_cost',
        qty: 'qty_available', quantity: 'qty_available', stock: 'qty_available', in_stock: 'qty_available',
        reorder: 'reorder_point', min_stock: 'reorder_point', reorder_level: 'reorder_point',
        note: 'notes', comment: 'notes', comments: 'notes', description: 'notes',
        taxonomy: 'category_id', taxonomy_id: 'category_id', cat_id: 'category_id',
      };
      return aliases[k] || k;
    };

    const allSuppliers = db.prepare('SELECT id, name FROM suppliers').all();
    const supplierMap = {};
    for (const s of allSuppliers) {
      supplierMap[s.name.toLowerCase().trim()] = s.id;
    }

    const insert = db.prepare(
      'INSERT INTO supplier_inventory (supplier_id, item_name, sku, category, category_id, unit, unit_cost, retail_cost, qty_available, reorder_point, notes, available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)'
    );

    let imported = 0;
    let skipped = 0;
    let autoAssignedCount = 0;
    const skippedReasons = [];
    const insertMany = db.transaction((data) => {
      for (const rawRow of data) {
        const row = {};
        for (const [key, val] of Object.entries(rawRow)) {
          row[normalize(key)] = String(val).trim();
        }
        if (!row.item_name) { skipped++; skippedReasons.push('Missing item name'); continue; }
        if (!row.supplier_name) { skipped++; skippedReasons.push(`"${row.item_name}" — missing supplier`); continue; }

        const supplierId = supplierMap[row.supplier_name.toLowerCase().trim()];
        if (!supplierId) { skipped++; skippedReasons.push(`"${row.item_name}" — supplier "${row.supplier_name}" not found`); continue; }

        const wholesale = row.unit_cost ? Number(row.unit_cost) : null;
        const retail = row.retail_cost ? Number(row.retail_cost) : (wholesale != null ? +(wholesale * 1.5).toFixed(2) : null);
        const qtyVal = row.qty_available ? Number(row.qty_available) : 0;

        // Auto-assign taxonomy leaf category from item name
        let catId = resolveCategoryId(row.category_id);
        let catName = row.category || null;
        if (!catId) {
          const match = autoAssignCategoryId(row.item_name);
          if (match) {
            catId = match.id;
            catName = match.name;
            autoAssignedCount++;
          }
        }

        insert.run(
          supplierId,
          row.item_name,
          row.sku || null,
          catName,
          catId,
          row.unit || null,
          wholesale,
          retail,
          qtyVal,
          row.reorder_point ? Number(row.reorder_point) : 0,
          row.notes || null
        );
        imported++;
      }
    });

    insertMany(rows);
    unlinkSync(req.file.path);

    res.json({ success: true, imported, skipped, autoAssigned: autoAssignedCount, skippedReasons: skippedReasons.slice(0, 10) });
  } catch {
    if (req.file?.path) { try { unlinkSync(req.file.path); } catch { /* ignore */ } }
    res.status(400).json({ error: 'Failed to parse file. Ensure it is a valid CSV file.' });
  }
});

router.put('/inventory/:id', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { supplier_id, item_name, sku, category, category_id, unit, unit_cost, retail_cost, qty_available, reorder_point, notes, available: availableRaw, on_sale: onSaleRaw, sale_price: salePriceRaw, sale_percentage: salePctRaw } = req.body;
  if (!supplier_id || !item_name) return res.status(400).json({ error: 'Supplier and item name are required' });

  const existing = db.prepare('SELECT id FROM supplier_inventory WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Inventory item not found' });

  const wholesale = unit_cost != null && unit_cost !== '' ? Number(unit_cost) : null;
  const retail = retail_cost != null && retail_cost !== '' ? Number(retail_cost) : (wholesale != null ? +(wholesale * 1.5).toFixed(2) : null);
  const catId = resolveCategoryId(category_id);
  const qtyVal = qty_available != null ? Number(qty_available) : 0;
  const available = availableRaw === '1' || availableRaw === 1 ? 1 : 0;
  const onSale = onSaleRaw === '1' || onSaleRaw === 1 ? 1 : 0;
  const salePct = salePctRaw != null && salePctRaw !== '' ? Number(salePctRaw) : null;
  // Auto-calculate sale_price from percentage if percentage is provided
  let salePrice = salePriceRaw != null && salePriceRaw !== '' ? Number(salePriceRaw) : null;
  if (salePct != null && retail != null) {
    salePrice = +(retail * (1 - salePct / 100)).toFixed(2);
  }

  const suppId = Number(supplier_id);
  if (!suppId || !Number.isFinite(suppId)) return res.status(400).json({ error: 'Invalid supplier' });
  const supplierExists = db.prepare('SELECT 1 FROM suppliers WHERE id = ?').get(suppId);
  if (!supplierExists) return res.status(400).json({ error: 'Supplier not found' });

  const prevItem = db.prepare('SELECT on_sale, item_name FROM supplier_inventory WHERE id = ?').get(id);

  try {
    const result = db.prepare(
      'UPDATE supplier_inventory SET supplier_id = ?, item_name = ?, sku = ?, category = ?, category_id = ?, unit = ?, unit_cost = ?, retail_cost = ?, qty_available = ?, reorder_point = ?, notes = ?, available = ?, on_sale = ?, sale_price = ?, sale_percentage = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).run(suppId, item_name, sku || null, category || null, catId, unit || null, wholesale, retail, qtyVal, reorder_point != null ? Number(reorder_point) : 0, notes || null, available, onSale, salePrice, salePct, id);
    if (result.changes === 0) return res.status(404).json({ error: 'Inventory item not found' });

    if (onSale === 1 && prevItem && !prevItem.on_sale && salePrice && retail) {
      const pctOff = Math.round((1 - salePrice / retail) * 100);
      notifyOptedInUsers(
        'sale',
        `Sale: ${item_name}`,
        `${item_name} is now ${pctOff}% off! Was $${retail.toFixed(2)}, now $${salePrice.toFixed(2)}.`,
        '/products'
      );
    }

    res.json({ success: true, available, on_sale: onSale, sale_price: salePrice, sale_percentage: salePct });
  } catch (err) {
    console.error('PUT /api/inventory/:id error:', { id, supplier_id: suppId, category_id: catId, error: err.message });
    res.status(500).json({ error: err.message || 'Failed to update inventory item' });
  }
});

router.delete('/inventory/:id', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM supplier_inventory WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Inventory item not found' });
  res.json({ success: true });
});

router.post('/inventory/batch-delete', requireAuth, requireAdmin, (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array is required' });
  const placeholders = ids.map(() => '?').join(',');
  const images = db.prepare(`SELECT image FROM supplier_inventory WHERE id IN (${placeholders}) AND image IS NOT NULL`).all(...ids);
  for (const row of images) {
    if (row.image) { try { unlinkSync(join(serverDir, row.image.replace(/^\//, ''))); } catch { /* ignore */ } }
  }
  const result = db.prepare(`DELETE FROM supplier_inventory WHERE id IN (${placeholders})`).run(...ids);
  res.json({ success: true, deleted: result.changes });
});

// ─── Catalog Products ───────────────────────────────────────────────────────

router.get('/catalog', requireAuth, requireAdmin, (req, res) => {
  const products = db.prepare(`
    SELECT p.*,
           t.name AS category_name,
           (SELECT GROUP_CONCAT(ps.supplier_id) FROM product_sources ps WHERE ps.product_id = p.id) AS source_supplier_ids
    FROM products p
    LEFT JOIN taxonomy t ON t.id = p.category_id
    ORDER BY p.name
  `).all();
  res.json(products);
});

router.get('/catalog/:id', requireAuth, requireAdmin, (req, res) => {
  const product = db.prepare(`
    SELECT p.*, t.name AS category_name
    FROM products p
    LEFT JOIN taxonomy t ON t.id = p.category_id
    WHERE p.id = ?
  `).get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  const sources = db.prepare(`
    SELECT ps.*, s.name AS supplier_name, si.item_name AS inventory_item_name, si.sku, si.qty_available
    FROM product_sources ps
    JOIN suppliers s ON s.id = ps.supplier_id
    LEFT JOIN supplier_inventory si ON si.id = ps.inventory_id
    WHERE ps.product_id = ?
    ORDER BY ps.priority, s.name
  `).all(req.params.id);

  res.json({ ...product, sources });
});

router.post('/catalog', requireAuth, requireAdmin, (req, res) => {
  const { name, description, unit, retail_price, category_id, on_sale, sale_price, sale_percentage, available } = req.body;
  if (!name) return res.status(400).json({ error: 'Product name is required' });

  const catId = resolveCategoryId(category_id);
  const avail = available === '1' || available === 1 ? 1 : 0;
  const onSale = on_sale === '1' || on_sale === 1 ? 1 : 0;
  const rp = retail_price != null && retail_price !== '' ? Number(retail_price) : null;
  const salePct = sale_percentage != null && sale_percentage !== '' ? Number(sale_percentage) : null;
  let sp = sale_price != null && sale_price !== '' ? Number(sale_price) : null;
  if (salePct != null && rp != null) {
    sp = +(rp * (1 - salePct / 100)).toFixed(2);
  }

  const result = db.prepare(
    'INSERT INTO products (name, description, unit, retail_price, category_id, on_sale, sale_price, sale_percentage, available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(name, description || null, unit || null, rp, catId, onSale, sp, salePct, avail);

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(product);
});

router.put('/catalog/:id', requireAuth, requireAdmin, (req, res) => {
  const { name, description, unit, retail_price, category_id, on_sale, sale_price, sale_percentage, available } = req.body;
  if (!name) return res.status(400).json({ error: 'Product name is required' });

  const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  const catId = resolveCategoryId(category_id);
  const avail = available === '1' || available === 1 ? 1 : 0;
  const onSale = on_sale === '1' || on_sale === 1 ? 1 : 0;
  const rp = retail_price != null && retail_price !== '' ? Number(retail_price) : null;
  const salePct = sale_percentage != null && sale_percentage !== '' ? Number(sale_percentage) : null;
  let sp = sale_price != null && sale_price !== '' ? Number(sale_price) : null;
  if (salePct != null && rp != null) {
    sp = +(rp * (1 - salePct / 100)).toFixed(2);
  }

  db.prepare(
    'UPDATE products SET name = ?, description = ?, unit = ?, retail_price = ?, category_id = ?, on_sale = ?, sale_price = ?, sale_percentage = ?, available = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(name, description || null, unit || null, rp, catId, onSale, sp, salePct, avail, req.params.id);

  if (onSale === 1 && sp && rp) {
    const pctOff = Math.round((1 - sp / rp) * 100);
    const prev = db.prepare('SELECT on_sale FROM products WHERE id = ?').get(req.params.id);
    if (prev && !prev.on_sale) {
      notifyOptedInUsers(
        'sale',
        `Sale: ${name}`,
        `${name} is now ${pctOff}% off! Was $${rp.toFixed(2)}, now $${sp.toFixed(2)}.`,
        '/products'
      );
    }
  }

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  res.json(product);
});

router.delete('/catalog/:id', requireAuth, requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Product not found' });
  res.json({ success: true });
});

// ─── Product Sources ────────────────────────────────────────────────────────

router.get('/catalog/:productId/sources', requireAuth, requireAdmin, (req, res) => {
  const sources = db.prepare(`
    SELECT ps.*, s.name AS supplier_name, si.item_name AS inventory_item_name, si.sku, si.qty_available, si.unit_cost AS inv_unit_cost
    FROM product_sources ps
    JOIN suppliers s ON s.id = ps.supplier_id
    LEFT JOIN supplier_inventory si ON si.id = ps.inventory_id
    WHERE ps.product_id = ?
    ORDER BY ps.priority, s.name
  `).all(req.params.productId);
  res.json(sources);
});

router.post('/catalog/:productId/sources', requireAuth, requireAdmin, (req, res) => {
  const { supplier_id, inventory_id, unit_cost, priority } = req.body;
  if (!supplier_id) return res.status(400).json({ error: 'Supplier is required' });

  const productExists = db.prepare('SELECT 1 FROM products WHERE id = ?').get(req.params.productId);
  if (!productExists) return res.status(404).json({ error: 'Product not found' });

  const supplierExists = db.prepare('SELECT 1 FROM suppliers WHERE id = ?').get(supplier_id);
  if (!supplierExists) return res.status(400).json({ error: 'Supplier not found' });

  const duplicate = db.prepare('SELECT 1 FROM product_sources WHERE product_id = ? AND supplier_id = ?').get(req.params.productId, supplier_id);
  if (duplicate) return res.status(409).json({ error: 'This supplier is already a source for this product' });

  const cost = unit_cost != null && unit_cost !== '' ? Number(unit_cost) : null;
  const invId = inventory_id != null && inventory_id !== '' ? Number(inventory_id) : null;

  const result = db.prepare(
    'INSERT INTO product_sources (product_id, supplier_id, inventory_id, unit_cost, priority) VALUES (?, ?, ?, ?, ?)'
  ).run(req.params.productId, supplier_id, invId, cost, priority || 0);

  const source = db.prepare(`
    SELECT ps.*, s.name AS supplier_name
    FROM product_sources ps
    JOIN suppliers s ON s.id = ps.supplier_id
    WHERE ps.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(source);
});

router.put('/catalog/sources/:id', requireAuth, requireAdmin, (req, res) => {
  const { supplier_id, inventory_id, unit_cost, priority } = req.body;
  const existing = db.prepare('SELECT * FROM product_sources WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Source not found' });

  const cost = unit_cost != null && unit_cost !== '' ? Number(unit_cost) : null;
  const invId = inventory_id != null && inventory_id !== '' ? Number(inventory_id) : null;

  db.prepare(
    'UPDATE product_sources SET supplier_id = ?, inventory_id = ?, unit_cost = ?, priority = ? WHERE id = ?'
  ).run(supplier_id || existing.supplier_id, invId, cost, priority ?? existing.priority, req.params.id);

  res.json({ success: true });
});

router.delete('/catalog/sources/:id', requireAuth, requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM product_sources WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Source not found' });
  res.json({ success: true });
});

export default router;
