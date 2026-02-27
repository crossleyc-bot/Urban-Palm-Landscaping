import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { existsSync, mkdirSync, unlinkSync, readFileSync } from 'fs';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure upload directories exist
const uploadDirs = ['employees', 'services', 'inventory', 'categories', 'imports'];
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
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.csv'];
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
  const allImages = db.prepare('SELECT * FROM service_images ORDER BY sort_order, id').all();
  const imageMap = new Map();
  for (const img of allImages) {
    if (!imageMap.has(img.service_id)) imageMap.set(img.service_id, []);
    imageMap.get(img.service_id).push(img);
  }
  res.json(services.map(s => ({ ...s, images: imageMap.get(s.id) || [] })));
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
  const extraImages = db.prepare('SELECT image_before, image_after FROM service_images WHERE service_id = ?').all(id);
  const result = db.prepare('DELETE FROM services WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Service not found' });

  const toDelete = [];
  if (existing) toDelete.push(existing.image_before, existing.image_after);
  for (const row of extraImages) toDelete.push(row.image_before, row.image_after);
  for (const img of toDelete) {
    if (img) { try { unlinkSync(join(__dirname, img.replace(/^\//, ''))); } catch { /* ignore */ } }
  }

  res.json({ success: true });
});

// ─── Service Images ─────────────────────────────────────────────────────────

app.post('/api/services/:serviceId/images', serviceUpload, upload.fields([{ name: 'image_before', maxCount: 1 }, { name: 'image_after', maxCount: 1 }]), (req, res) => {
  const { serviceId } = req.params;
  const service = db.prepare('SELECT id FROM services WHERE id = ?').get(serviceId);
  if (!service) return res.status(404).json({ error: 'Service not found' });

  const imageBefore = req.files?.image_before?.[0] ? `/uploads/services/${req.files.image_before[0].filename}` : null;
  const imageAfter = req.files?.image_after?.[0] ? `/uploads/services/${req.files.image_after[0].filename}` : null;

  if (!imageBefore && !imageAfter) return res.status(400).json({ error: 'At least one image is required' });

  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM service_images WHERE service_id = ?').get(serviceId);
  const sortOrder = (maxOrder?.m ?? -1) + 1;

  const result = db.prepare(
    'INSERT INTO service_images (service_id, image_before, image_after, sort_order) VALUES (?, ?, ?, ?)'
  ).run(serviceId, imageBefore, imageAfter, sortOrder);

  res.status(201).json({ id: result.lastInsertRowid, service_id: Number(serviceId), image_before: imageBefore, image_after: imageAfter, sort_order: sortOrder });
});

app.delete('/api/service-images/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT image_before, image_after FROM service_images WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Image not found' });

  db.prepare('DELETE FROM service_images WHERE id = ?').run(id);

  for (const img of [existing.image_before, existing.image_after]) {
    if (img) { try { unlinkSync(join(__dirname, img.replace(/^\//, ''))); } catch { /* ignore */ } }
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
  const { name, contact_name, email, phone, address, website, operating_hours, delivery_info, delivery_fees, public_access, notes, status } = req.body;
  if (!name) return res.status(400).json({ error: 'Supplier name is required' });

  const result = db.prepare(
    'INSERT INTO suppliers (name, contact_name, email, phone, address, website, operating_hours, delivery_info, delivery_fees, public_access, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(name, contact_name || null, email || null, phone || null, address || null, website || null, operating_hours || null, delivery_info || null, delivery_fees || null, public_access || null, notes || null, status || 'Active');

  res.status(201).json({ id: result.lastInsertRowid, name, contact_name, email, phone, address, website, operating_hours, delivery_info, delivery_fees, public_access, notes, status: status || 'Active' });
});

app.put('/api/suppliers/:id', (req, res) => {
  const { id } = req.params;
  const { name, contact_name, email, phone, address, website, operating_hours, delivery_info, delivery_fees, public_access, notes, status } = req.body;
  if (!name) return res.status(400).json({ error: 'Supplier name is required' });

  const result = db.prepare(
    'UPDATE suppliers SET name = ?, contact_name = ?, email = ?, phone = ?, address = ?, website = ?, operating_hours = ?, delivery_info = ?, delivery_fees = ?, public_access = ?, notes = ?, status = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(name, contact_name || null, email || null, phone || null, address || null, website || null, operating_hours || null, delivery_info || null, delivery_fees || null, public_access || null, notes || null, status || 'Active', id);
  if (result.changes === 0) return res.status(404).json({ error: 'Supplier not found' });

  res.json({ success: true });
});

app.delete('/api/suppliers/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Supplier not found' });

  res.json({ success: true });
});

app.delete('/api/suppliers', (req, res) => {
  // Delete all inventory images first
  const images = db.prepare('SELECT image FROM supplier_inventory WHERE image IS NOT NULL').all();
  for (const row of images) {
    if (row.image) { try { unlinkSync(join(__dirname, row.image.replace(/^\//, ''))); } catch { /* ignore */ } }
  }
  db.prepare('DELETE FROM supplier_inventory').run();
  db.prepare('DELETE FROM suppliers').run();
  res.json({ success: true });
});

const supplierImportUpload = (req, _res, next) => { req.uploadDir = 'imports'; next(); };

app.post('/api/suppliers/import', supplierImportUpload, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File is required' });

  try {
    const raw = readFileSync(req.file.path, 'utf-8');
    const lines = raw.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) {
      unlinkSync(req.file.path);
      return res.status(400).json({ error: 'File contains no data rows' });
    }

    // Simple CSV parser that handles quoted fields
    const parseCSVLine = (line) => {
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
    };

    const headers = parseCSVLine(lines[0]);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = values[idx] || ''; });
      rows.push(obj);
    }

    // Normalize column headers (lowercase, trim, map common aliases)
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
  } catch (err) {
    if (req.file?.path) { try { unlinkSync(req.file.path); } catch { /* ignore */ } }
    res.status(400).json({ error: 'Failed to parse file. Ensure it is a valid CSV file.' });
  }
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

const inventoryUpload = (req, _res, next) => { req.uploadDir = 'inventory'; next(); };

app.post('/api/inventory', inventoryUpload, upload.single('image'), (req, res) => {
  const { supplier_id, item_name, sku, category, category_id, unit, unit_cost, retail_cost, qty_available, reorder_point, notes } = req.body;
  if (!supplier_id || !item_name) return res.status(400).json({ error: 'Supplier and item name are required' });

  const wholesale = unit_cost != null && unit_cost !== '' ? Number(unit_cost) : null;
  const retail = retail_cost != null && retail_cost !== '' ? Number(retail_cost) : (wholesale != null ? +(wholesale * 1.5).toFixed(2) : null);
  const image = req.file ? `/uploads/inventory/${req.file.filename}` : null;
  const catId = category_id != null && category_id !== '' ? Number(category_id) : null;
  const result = db.prepare(
    'INSERT INTO supplier_inventory (supplier_id, item_name, sku, category, category_id, unit, unit_cost, retail_cost, qty_available, reorder_point, notes, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(Number(supplier_id), item_name, sku || null, category || null, catId, unit || null, wholesale, retail, qty_available != null ? Number(qty_available) : 0, reorder_point != null ? Number(reorder_point) : 0, notes || null, image);

  res.status(201).json({ id: result.lastInsertRowid, supplier_id: Number(supplier_id), item_name, sku, category, category_id: catId, unit, unit_cost: wholesale, retail_cost: retail, qty_available: qty_available ?? 0, reorder_point: reorder_point ?? 0, notes, image });
});

const inventoryImportUpload = (req, _res, next) => { req.uploadDir = 'imports'; next(); };

app.post('/api/inventory/import', inventoryImportUpload, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File is required' });

  try {
    const raw = readFileSync(req.file.path, 'utf-8');
    const lines = raw.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) {
      unlinkSync(req.file.path);
      return res.status(400).json({ error: 'File contains no data rows' });
    }

    const parseCSVLine = (line) => {
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
    };

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

    // Build a map of supplier names (case-insensitive) to IDs
    const allSuppliers = db.prepare('SELECT id, name FROM suppliers').all();
    const supplierMap = {};
    for (const s of allSuppliers) {
      supplierMap[s.name.toLowerCase().trim()] = s.id;
    }

    const insert = db.prepare(
      'INSERT INTO supplier_inventory (supplier_id, item_name, sku, category, unit, unit_cost, retail_cost, qty_available, reorder_point, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
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

        insert.run(
          supplierId,
          row.item_name,
          row.sku || null,
          row.category || null,
          row.unit || null,
          wholesale,
          retail,
          row.qty_available ? Number(row.qty_available) : 0,
          row.reorder_point ? Number(row.reorder_point) : 0,
          row.notes || null
        );
        imported++;
      }
    });

    insertMany(rows);
    unlinkSync(req.file.path);

    res.json({ success: true, imported, skipped, skippedReasons: skippedReasons.slice(0, 10) });
  } catch (err) {
    if (req.file?.path) { try { unlinkSync(req.file.path); } catch { /* ignore */ } }
    res.status(400).json({ error: 'Failed to parse file. Ensure it is a valid CSV file.' });
  }
});

app.put('/api/inventory/:id', inventoryUpload, upload.single('image'), (req, res) => {
  const { id } = req.params;
  const { supplier_id, item_name, sku, category, category_id, unit, unit_cost, retail_cost, qty_available, reorder_point, notes } = req.body;
  if (!supplier_id || !item_name) return res.status(400).json({ error: 'Supplier and item name are required' });

  const existing = db.prepare('SELECT image FROM supplier_inventory WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Inventory item not found' });

  let image = existing.image;
  if (req.file) {
    if (existing.image) {
      try { unlinkSync(join(__dirname, existing.image.replace(/^\//, ''))); } catch { /* ignore */ }
    }
    image = `/uploads/inventory/${req.file.filename}`;
  }

  const wholesale = unit_cost != null && unit_cost !== '' ? Number(unit_cost) : null;
  const retail = retail_cost != null && retail_cost !== '' ? Number(retail_cost) : (wholesale != null ? +(wholesale * 1.5).toFixed(2) : null);
  const catId = category_id != null && category_id !== '' ? Number(category_id) : null;

  const result = db.prepare(
    'UPDATE supplier_inventory SET supplier_id = ?, item_name = ?, sku = ?, category = ?, category_id = ?, unit = ?, unit_cost = ?, retail_cost = ?, qty_available = ?, reorder_point = ?, notes = ?, image = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(Number(supplier_id), item_name, sku || null, category || null, catId, unit || null, wholesale, retail, qty_available != null ? Number(qty_available) : 0, reorder_point != null ? Number(reorder_point) : 0, notes || null, image, id);
  if (result.changes === 0) return res.status(404).json({ error: 'Inventory item not found' });

  res.json({ success: true, image });
});

app.delete('/api/inventory/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT image FROM supplier_inventory WHERE id = ?').get(id);
  const result = db.prepare('DELETE FROM supplier_inventory WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Inventory item not found' });

  if (existing && existing.image) {
    try { unlinkSync(join(__dirname, existing.image.replace(/^\//, ''))); } catch { /* ignore */ }
  }

  res.json({ success: true });
});

// ─── Job Openings ───────────────────────────────────────────────────────────

app.get('/api/job-openings', (req, res) => {
  const openings = db.prepare('SELECT * FROM job_openings ORDER BY created_at DESC').all();
  res.json(openings);
});

app.get('/api/job-openings/public', (req, res) => {
  const openings = db.prepare("SELECT * FROM job_openings WHERE status = 'Open' ORDER BY created_at DESC").all();
  res.json(openings);
});

app.post('/api/job-openings', (req, res) => {
  const { title, department, type, location, description, requirements, status } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const result = db.prepare(
    'INSERT INTO job_openings (title, department, type, location, description, requirements, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(title, department || null, type || 'Full-time', location || 'Orlando, FL', description || null, requirements || null, status || 'Open');

  res.status(201).json({ id: result.lastInsertRowid, title, department, type: type || 'Full-time', location: location || 'Orlando, FL', description, requirements, status: status || 'Open' });
});

app.put('/api/job-openings/:id', (req, res) => {
  const { id } = req.params;
  const { title, department, type, location, description, requirements, status } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const result = db.prepare(
    'UPDATE job_openings SET title = ?, department = ?, type = ?, location = ?, description = ?, requirements = ?, status = ? WHERE id = ?'
  ).run(title, department || null, type || 'Full-time', location || 'Orlando, FL', description || null, requirements || null, status || 'Open', id);
  if (result.changes === 0) return res.status(404).json({ error: 'Job opening not found' });

  res.json({ success: true });
});

app.delete('/api/job-openings/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM job_openings WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Job opening not found' });

  res.json({ success: true });
});

// ─── Product Categories ─────────────────────────────────────────────────────

const categoryUpload = (req, _res, next) => { req.uploadDir = 'categories'; next(); };

app.get('/api/product-categories', (req, res) => {
  const cats = db.prepare('SELECT * FROM product_categories ORDER BY name').all();
  res.json(cats);
});

app.post('/api/product-categories', categoryUpload, upload.single('image'), (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name is required' });

  const image = req.file ? `/uploads/categories/${req.file.filename}` : null;
  const result = db.prepare(
    'INSERT INTO product_categories (name, description, image) VALUES (?, ?, ?)'
  ).run(name, description || null, image);

  res.status(201).json({ id: result.lastInsertRowid, name, description, image });
});

app.put('/api/product-categories/:id', categoryUpload, upload.single('image'), (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Category name is required' });

  const existing = db.prepare('SELECT image FROM product_categories WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Category not found' });

  let image = existing.image;
  if (req.file) {
    if (existing.image) {
      try { unlinkSync(join(__dirname, existing.image.replace(/^\//, ''))); } catch { /* ignore */ }
    }
    image = `/uploads/categories/${req.file.filename}`;
  }

  db.prepare(
    'UPDATE product_categories SET name = ?, description = ?, image = ? WHERE id = ?'
  ).run(name, description || null, image, id);

  res.json({ success: true, image });
});

app.delete('/api/product-categories/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT image FROM product_categories WHERE id = ?').get(id);
  const result = db.prepare('DELETE FROM product_categories WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Category not found' });

  if (existing && existing.image) {
    try { unlinkSync(join(__dirname, existing.image.replace(/^\//, ''))); } catch { /* ignore */ }
  }

  // Clear category_id references on inventory items
  db.prepare('UPDATE supplier_inventory SET category_id = NULL WHERE category_id = ?').run(id);

  res.json({ success: true });
});

// ─── Public Products ────────────────────────────────────────────────────────

app.get('/api/products', (req, res) => {
  const items = db.prepare(`
    SELECT si.item_name, si.category, si.category_id, si.unit_cost, si.retail_cost, si.image, si.unit,
           s.name AS supplier_name,
           pc.name AS category_name, pc.image AS category_image
    FROM supplier_inventory si
    JOIN suppliers s ON s.id = si.supplier_id
    LEFT JOIN product_categories pc ON pc.id = si.category_id
    WHERE si.qty_available > 0
    ORDER BY si.category, si.item_name
  `).all();

  // Deduplicate by item_name — pick the first (cheapest or first found) for each unique name
  const seen = new Map();
  for (const item of items) {
    if (!seen.has(item.item_name)) {
      seen.set(item.item_name, item);
    }
  }

  res.json(Array.from(seen.values()));
});

// ─── Start ───────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
