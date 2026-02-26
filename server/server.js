import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure upload directories exist
const uploadDirs = ['employees', 'services'];
for (const dir of uploadDirs) {
  const p = join(__dirname, 'uploads', dir);
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    cb(null, join(__dirname, 'uploads', req.uploadDir || 'employees'));
  },
  filename: (_req, file, cb) => cb(null, `${Date.now()}${extname(file.originalname)}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    cb(null, allowed.includes(extname(file.originalname).toLowerCase()));
  },
});

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// ─── Auth ────────────────────────────────────────────────────────────────────

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, name, role } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)').run(
    email, hash, name, role || 'customer'
  );

  res.status(201).json({ id: result.lastInsertRowid, email, name, role: role || 'customer' });
});

// ─── Services ────────────────────────────────────────────────────────────────

const serviceUpload = (req, _res, next) => { req.uploadDir = 'services'; next(); };

app.get('/api/services', (req, res) => {
  const services = db.prepare('SELECT * FROM services').all();
  res.json(services);
});

app.post('/api/services', serviceUpload, upload.fields([{ name: 'image_before', maxCount: 1 }, { name: 'image_after', maxCount: 1 }]), (req, res) => {
  const { name, description, price, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'Service name is required' });

  const imageBefore = req.files?.image_before?.[0] ? `/uploads/services/${req.files.image_before[0].filename}` : null;
  const imageAfter = req.files?.image_after?.[0] ? `/uploads/services/${req.files.image_after[0].filename}` : null;

  const result = db.prepare(
    'INSERT INTO services (name, description, price, icon, image_before, image_after) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, description || null, price || null, icon || null, imageBefore, imageAfter);

  res.status(201).json({ id: result.lastInsertRowid, name, description, price, icon, image_before: imageBefore, image_after: imageAfter });
});

app.put('/api/services/:id', serviceUpload, upload.fields([{ name: 'image_before', maxCount: 1 }, { name: 'image_after', maxCount: 1 }]), (req, res) => {
  const { id } = req.params;
  const { name, description, price, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'Service name is required' });

  const existing = db.prepare('SELECT image_before, image_after FROM services WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Service not found' });

  let imageBefore = existing.image_before;
  let imageAfter = existing.image_after;

  if (req.files?.image_before?.[0]) {
    if (existing.image_before) {
      try { unlinkSync(join(__dirname, existing.image_before.replace(/^\//, ''))); } catch { /* ignore */ }
    }
    imageBefore = `/uploads/services/${req.files.image_before[0].filename}`;
  }
  if (req.files?.image_after?.[0]) {
    if (existing.image_after) {
      try { unlinkSync(join(__dirname, existing.image_after.replace(/^\//, ''))); } catch { /* ignore */ }
    }
    imageAfter = `/uploads/services/${req.files.image_after[0].filename}`;
  }

  db.prepare(
    'UPDATE services SET name = ?, description = ?, price = ?, icon = ?, image_before = ?, image_after = ? WHERE id = ?'
  ).run(name, description || null, price || null, icon || null, imageBefore, imageAfter, id);

  res.json({ success: true, image_before: imageBefore, image_after: imageAfter });
});

app.delete('/api/services/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT image_before, image_after FROM services WHERE id = ?').get(id);
  const result = db.prepare('DELETE FROM services WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Service not found' });

  if (existing) {
    for (const img of [existing.image_before, existing.image_after]) {
      if (img) { try { unlinkSync(join(__dirname, img.replace(/^\//, ''))); } catch { /* ignore */ } }
    }
  }

  res.json({ success: true });
});

// ─── Team Members ────────────────────────────────────────────────────────────

app.get('/api/team', (req, res) => {
  const members = db.prepare('SELECT * FROM team_members').all();
  res.json(members);
});

// ─── Testimonials ────────────────────────────────────────────────────────────

app.get('/api/testimonials', (req, res) => {
  const testimonials = db.prepare('SELECT * FROM testimonials').all();
  res.json(testimonials);
});

// ─── Orders ──────────────────────────────────────────────────────────────────

app.get('/api/orders', (req, res) => {
  const userId = req.query.user_id;
  let orders;
  if (userId) {
    orders = db.prepare('SELECT * FROM orders WHERE user_id = ?').all(userId);
  } else {
    orders = db.prepare('SELECT * FROM orders').all();
  }
  // Map to match frontend field names
  res.json(orders.map(o => ({
    id: o.order_id,
    service: o.service,
    date: o.date,
    status: o.status,
    amount: o.amount,
  })));
});

// ─── Jobs ────────────────────────────────────────────────────────────────────

app.get('/api/jobs', (req, res) => {
  const jobs = db.prepare('SELECT * FROM jobs').all();
  res.json(jobs.map(j => ({
    id: j.job_id,
    client: j.client,
    service: j.service,
    assignee: j.assignee,
    date: j.date,
    status: j.status,
  })));
});

app.put('/api/jobs/:jobId/status', (req, res) => {
  const { jobId } = req.params;
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status is required' });

  const result = db.prepare('UPDATE jobs SET status = ? WHERE job_id = ?').run(status, jobId);
  if (result.changes === 0) return res.status(404).json({ error: 'Job not found' });

  res.json({ success: true });
});

app.put('/api/jobs/:jobId', (req, res) => {
  const { jobId } = req.params;
  const { client, service, assignee, date, status } = req.body;
  if (!client || !service || !assignee || !date) {
    return res.status(400).json({ error: 'Client, service, assignee, and date are required' });
  }

  const result = db.prepare(
    'UPDATE jobs SET client = ?, service = ?, assignee = ?, date = ?, status = ? WHERE job_id = ?'
  ).run(client, service, assignee, date, status || 'Scheduled', jobId);
  if (result.changes === 0) return res.status(404).json({ error: 'Job not found' });

  res.json({ success: true });
});

// ─── Employees ───────────────────────────────────────────────────────────────

const employeeUpload = (req, _res, next) => { req.uploadDir = 'employees'; next(); };

app.get('/api/employees', (req, res) => {
  const employees = db.prepare('SELECT * FROM employees').all();
  res.json(employees.map(e => ({
    id: e.emp_id,
    name: e.name,
    role: e.role,
    phone: e.phone,
    email: e.email,
    image: e.image,
    status: e.status,
    show_on_website: e.show_on_website,
  })));
});

app.get('/api/employees/featured', (req, res) => {
  const employees = db.prepare('SELECT * FROM employees WHERE show_on_website = 1 AND status = ?').all('Active');
  res.json(employees.map(e => ({
    id: e.emp_id,
    name: e.name,
    role: e.role,
    image: e.image,
  })));
});

app.post('/api/employees', employeeUpload, upload.single('image'), (req, res) => {
  const { name, role, phone, email, status, show_on_website } = req.body;
  if (!name || !role) return res.status(400).json({ error: 'Name and role are required' });

  const last = db.prepare("SELECT emp_id FROM employees ORDER BY id DESC LIMIT 1").get();
  const nextNum = last ? parseInt(last.emp_id.replace('EMP-', ''), 10) + 1 : 1;
  const empId = `EMP-${String(nextNum).padStart(3, '0')}`;
  const image = req.file ? `/uploads/employees/${req.file.filename}` : null;
  const showOnWeb = show_on_website === '1' || show_on_website === 'true' ? 1 : 0;

  db.prepare(
    'INSERT INTO employees (emp_id, name, role, phone, email, image, status, show_on_website) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(empId, name, role, phone || null, email || null, image, status || 'Active', showOnWeb);

  res.status(201).json({ id: empId, name, role, phone, email, image, status: status || 'Active', show_on_website: showOnWeb });
});

app.put('/api/employees/:empId', employeeUpload, upload.single('image'), (req, res) => {
  const { empId } = req.params;
  const { name, role, phone, email, status, show_on_website } = req.body;
  if (!name || !role) return res.status(400).json({ error: 'Name and role are required' });

  const existing = db.prepare('SELECT image FROM employees WHERE emp_id = ?').get(empId);
  if (!existing) return res.status(404).json({ error: 'Employee not found' });

  let image = existing.image;
  if (req.file) {
    // Remove old photo if it exists
    if (existing.image) {
      const oldPath = join(__dirname, existing.image.replace(/^\//, ''));
      try { unlinkSync(oldPath); } catch { /* ignore */ }
    }
    image = `/uploads/employees/${req.file.filename}`;
  }

  const showOnWeb = show_on_website === '1' || show_on_website === 'true' ? 1 : 0;

  db.prepare(
    'UPDATE employees SET name = ?, role = ?, phone = ?, email = ?, image = ?, status = ?, show_on_website = ? WHERE emp_id = ?'
  ).run(name, role, phone || null, email || null, image, status || 'Active', showOnWeb, empId);

  res.json({ success: true, image, show_on_website: showOnWeb });
});

app.delete('/api/employees/:empId', (req, res) => {
  const { empId } = req.params;
  const existing = db.prepare('SELECT image FROM employees WHERE emp_id = ?').get(empId);
  const result = db.prepare('DELETE FROM employees WHERE emp_id = ?').run(empId);
  if (result.changes === 0) return res.status(404).json({ error: 'Employee not found' });

  // Remove photo file on delete
  if (existing && existing.image) {
    const oldPath = join(__dirname, existing.image.replace(/^\//, ''));
    try { unlinkSync(oldPath); } catch { /* ignore */ }
  }

  res.json({ success: true });
});

// ─── Invoices ────────────────────────────────────────────────────────────────

app.get('/api/invoices', (req, res) => {
  const invoices = db.prepare('SELECT * FROM invoices').all();
  res.json(invoices.map(i => ({
    id: i.inv_id,
    client: i.client,
    amount: i.amount,
    date: i.date,
    dueDate: i.due_date,
    status: i.status,
  })));
});

app.put('/api/invoices/:invId', (req, res) => {
  const { invId } = req.params;
  const { client, amount, date, due_date, status } = req.body;
  if (!client || amount == null || !status) return res.status(400).json({ error: 'Client, amount, and status are required' });

  const result = db.prepare(
    'UPDATE invoices SET client = ?, amount = ?, date = ?, due_date = ?, status = ? WHERE inv_id = ?'
  ).run(client, amount, date, due_date, status, invId);
  if (result.changes === 0) return res.status(404).json({ error: 'Invoice not found' });

  res.json({ success: true });
});

// ─── Contact Messages ────────────────────────────────────────────────────────

app.post('/api/contact', (req, res) => {
  const { name, email, phone, service, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required' });
  }

  db.prepare('INSERT INTO contact_messages (name, email, phone, service, message) VALUES (?, ?, ?, ?, ?)').run(
    name, email, phone || null, service || null, message
  );

  res.status(201).json({ success: true });
});

app.get('/api/contact', (req, res) => {
  const messages = db.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC').all();
  res.json(messages);
});

app.put('/api/contact/:id/reply', (req, res) => {
  const { id } = req.params;
  const { admin_reply, status } = req.body;
  if (!admin_reply || !status) return res.status(400).json({ error: 'Reply and status are required' });

  const result = db.prepare(
    'UPDATE contact_messages SET admin_reply = ?, status = ? WHERE id = ?'
  ).run(admin_reply, status, id);
  if (result.changes === 0) return res.status(404).json({ error: 'Message not found' });

  res.json({ success: true });
});

// ─── Quote Requests ──────────────────────────────────────────────────────────

app.post('/api/quotes', (req, res) => {
  const { user_id, service, property_type, timeline, budget, details, address } = req.body;
  if (!service || !details || !address) {
    return res.status(400).json({ error: 'Service, details, and address are required' });
  }

  db.prepare(
    'INSERT INTO quote_requests (user_id, service, property_type, timeline, budget, details, address) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(user_id || null, service, property_type || null, timeline || null, budget || null, details, address);

  res.status(201).json({ success: true });
});

app.get('/api/quotes', (req, res) => {
  const quotes = db.prepare('SELECT * FROM quote_requests ORDER BY created_at DESC').all();
  res.json(quotes);
});

app.put('/api/quotes/:id/reply', (req, res) => {
  const { id } = req.params;
  const { admin_reply, status } = req.body;
  if (!admin_reply || !status) return res.status(400).json({ error: 'Reply and status are required' });

  const result = db.prepare(
    'UPDATE quote_requests SET admin_reply = ?, status = ? WHERE id = ?'
  ).run(admin_reply, status, id);
  if (result.changes === 0) return res.status(404).json({ error: 'Quote request not found' });

  res.json({ success: true });
});

// ─── Schedule Requests ───────────────────────────────────────────────────────

app.post('/api/schedule', (req, res) => {
  const { user_id, service, date, time, frequency, address, notes } = req.body;
  if (!service || !date || !address) {
    return res.status(400).json({ error: 'Service, date, and address are required' });
  }

  db.prepare(
    'INSERT INTO schedule_requests (user_id, service, date, time, frequency, address, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(user_id || null, service, date, time || null, frequency || null, address, notes || null);

  res.status(201).json({ success: true });
});

app.get('/api/schedule', (req, res) => {
  const requests = db.prepare('SELECT * FROM schedule_requests ORDER BY created_at DESC').all();
  res.json(requests);
});

// ─── Suppliers ──────────────────────────────────────────────────────────────

app.get('/api/suppliers', (req, res) => {
  const suppliers = db.prepare('SELECT * FROM suppliers ORDER BY name').all();
  res.json(suppliers);
});

app.post('/api/suppliers', (req, res) => {
  const { name, contact_name, email, phone, address, website, notes, status } = req.body;
  if (!name) return res.status(400).json({ error: 'Supplier name is required' });

  const result = db.prepare(
    'INSERT INTO suppliers (name, contact_name, email, phone, address, website, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(name, contact_name || null, email || null, phone || null, address || null, website || null, notes || null, status || 'Active');

  res.status(201).json({ id: result.lastInsertRowid, name, contact_name, email, phone, address, website, notes, status: status || 'Active' });
});

app.put('/api/suppliers/:id', (req, res) => {
  const { id } = req.params;
  const { name, contact_name, email, phone, address, website, notes, status } = req.body;
  if (!name) return res.status(400).json({ error: 'Supplier name is required' });

  const result = db.prepare(
    'UPDATE suppliers SET name = ?, contact_name = ?, email = ?, phone = ?, address = ?, website = ?, notes = ?, status = ? WHERE id = ?'
  ).run(name, contact_name || null, email || null, phone || null, address || null, website || null, notes || null, status || 'Active', id);
  if (result.changes === 0) return res.status(404).json({ error: 'Supplier not found' });

  res.json({ success: true });
});

app.delete('/api/suppliers/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Supplier not found' });

  res.json({ success: true });
});

// ─── Supplier Inventory ─────────────────────────────────────────────────────

app.get('/api/suppliers/:supplierId/inventory', (req, res) => {
  const { supplierId } = req.params;
  const items = db.prepare('SELECT * FROM supplier_inventory WHERE supplier_id = ? ORDER BY item_name').all(supplierId);
  res.json(items);
});

app.get('/api/inventory', (req, res) => {
  const items = db.prepare(`
    SELECT si.*, s.name AS supplier_name
    FROM supplier_inventory si
    JOIN suppliers s ON s.id = si.supplier_id
    ORDER BY si.item_name
  `).all();
  res.json(items);
});

app.post('/api/inventory', (req, res) => {
  const { supplier_id, item_name, sku, category, unit, unit_cost, qty_available, reorder_point, notes } = req.body;
  if (!supplier_id || !item_name) return res.status(400).json({ error: 'Supplier and item name are required' });

  const result = db.prepare(
    'INSERT INTO supplier_inventory (supplier_id, item_name, sku, category, unit, unit_cost, qty_available, reorder_point, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(supplier_id, item_name, sku || null, category || null, unit || null, unit_cost ?? null, qty_available ?? 0, reorder_point ?? 0, notes || null);

  res.status(201).json({ id: result.lastInsertRowid, supplier_id, item_name, sku, category, unit, unit_cost, qty_available: qty_available ?? 0, reorder_point: reorder_point ?? 0, notes });
});

app.put('/api/inventory/:id', (req, res) => {
  const { id } = req.params;
  const { supplier_id, item_name, sku, category, unit, unit_cost, qty_available, reorder_point, notes } = req.body;
  if (!supplier_id || !item_name) return res.status(400).json({ error: 'Supplier and item name are required' });

  const result = db.prepare(
    'UPDATE supplier_inventory SET supplier_id = ?, item_name = ?, sku = ?, category = ?, unit = ?, unit_cost = ?, qty_available = ?, reorder_point = ?, notes = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(supplier_id, item_name, sku || null, category || null, unit || null, unit_cost ?? null, qty_available ?? 0, reorder_point ?? 0, notes || null, id);
  if (result.changes === 0) return res.status(404).json({ error: 'Inventory item not found' });

  res.json({ success: true });
});

app.delete('/api/inventory/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM supplier_inventory WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Inventory item not found' });

  res.json({ success: true });
});

// ─── Start ───────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
