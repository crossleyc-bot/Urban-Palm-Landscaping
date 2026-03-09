import { Router } from 'express';
import { join } from 'path';
import { readFileSync, unlinkSync } from 'fs';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { upload, serverDir } from '../middleware/upload.js';
import { resolveCategoryId, notifyOptedInUsers } from '../helpers.js';

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
  const { supplier_id, item_name, sku, category, category_id, unit, unit_cost, retail_cost, qty_available, reorder_point, notes, available: availableRaw, on_sale: onSaleRaw, sale_price: salePriceRaw } = req.body;
  if (!supplier_id || !item_name) return res.status(400).json({ error: 'Supplier and item name are required' });

  const suppId = Number(supplier_id);
  if (!suppId || !Number.isFinite(suppId)) return res.status(400).json({ error: 'Invalid supplier' });
  const supplierExists = db.prepare('SELECT 1 FROM suppliers WHERE id = ?').get(suppId);
  if (!supplierExists) return res.status(400).json({ error: 'Supplier not found' });

  const wholesale = unit_cost != null && unit_cost !== '' ? Number(unit_cost) : null;
  const retail = retail_cost != null && retail_cost !== '' ? Number(retail_cost) : (wholesale != null ? +(wholesale * 1.5).toFixed(2) : null);
  const catId = resolveCategoryId(category_id);
  const qtyVal = qty_available != null ? Number(qty_available) : 0;
  const available = availableRaw === '1' || availableRaw === 1 ? 1 : 0;
  const onSale = onSaleRaw === '1' || onSaleRaw === 1 ? 1 : 0;
  const salePrice = salePriceRaw != null && salePriceRaw !== '' ? Number(salePriceRaw) : null;
  try {
    const result = db.prepare(
      'INSERT INTO supplier_inventory (supplier_id, item_name, sku, category, category_id, unit, unit_cost, retail_cost, qty_available, reorder_point, notes, available, on_sale, sale_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(suppId, item_name, sku || null, category || null, catId, unit || null, wholesale, retail, qtyVal, reorder_point != null ? Number(reorder_point) : 0, notes || null, available, onSale, salePrice);

    res.status(201).json({ id: result.lastInsertRowid, supplier_id: suppId, item_name, sku, category, category_id: catId, unit, unit_cost: wholesale, retail_cost: retail, qty_available: qtyVal, reorder_point: reorder_point ?? 0, notes, available, on_sale: onSale, sale_price: salePrice });
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
      };
      return aliases[k] || k;
    };

    const allSuppliers = db.prepare('SELECT id, name FROM suppliers').all();
    const supplierMap = {};
    for (const s of allSuppliers) {
      supplierMap[s.name.toLowerCase().trim()] = s.id;
    }

    const insert = db.prepare(
      'INSERT INTO supplier_inventory (supplier_id, item_name, sku, unit, unit_cost, retail_cost, qty_available, reorder_point, notes, available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)'
    );

    let imported = 0;
    let skipped = 0;
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

        insert.run(
          supplierId,
          row.item_name,
          row.sku || null,
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

    res.json({ success: true, imported, skipped, skippedReasons: skippedReasons.slice(0, 10) });
  } catch {
    if (req.file?.path) { try { unlinkSync(req.file.path); } catch { /* ignore */ } }
    res.status(400).json({ error: 'Failed to parse file. Ensure it is a valid CSV file.' });
  }
});

router.put('/inventory/:id', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { supplier_id, item_name, sku, category, category_id, unit, unit_cost, retail_cost, qty_available, reorder_point, notes, available: availableRaw, on_sale: onSaleRaw, sale_price: salePriceRaw } = req.body;
  if (!supplier_id || !item_name) return res.status(400).json({ error: 'Supplier and item name are required' });

  const existing = db.prepare('SELECT id FROM supplier_inventory WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Inventory item not found' });

  const wholesale = unit_cost != null && unit_cost !== '' ? Number(unit_cost) : null;
  const retail = retail_cost != null && retail_cost !== '' ? Number(retail_cost) : (wholesale != null ? +(wholesale * 1.5).toFixed(2) : null);
  const catId = resolveCategoryId(category_id);
  const qtyVal = qty_available != null ? Number(qty_available) : 0;
  const available = availableRaw === '1' || availableRaw === 1 ? 1 : 0;
  const onSale = onSaleRaw === '1' || onSaleRaw === 1 ? 1 : 0;
  const salePrice = salePriceRaw != null && salePriceRaw !== '' ? Number(salePriceRaw) : null;

  const suppId = Number(supplier_id);
  if (!suppId || !Number.isFinite(suppId)) return res.status(400).json({ error: 'Invalid supplier' });
  const supplierExists = db.prepare('SELECT 1 FROM suppliers WHERE id = ?').get(suppId);
  if (!supplierExists) return res.status(400).json({ error: 'Supplier not found' });

  const prevItem = db.prepare('SELECT on_sale, item_name FROM supplier_inventory WHERE id = ?').get(id);

  try {
    const result = db.prepare(
      'UPDATE supplier_inventory SET supplier_id = ?, item_name = ?, sku = ?, category = ?, category_id = ?, unit = ?, unit_cost = ?, retail_cost = ?, qty_available = ?, reorder_point = ?, notes = ?, available = ?, on_sale = ?, sale_price = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).run(suppId, item_name, sku || null, category || null, catId, unit || null, wholesale, retail, qtyVal, reorder_point != null ? Number(reorder_point) : 0, notes || null, available, onSale, salePrice, id);
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

    res.json({ success: true, available, on_sale: onSale, sale_price: salePrice });
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

export default router;
