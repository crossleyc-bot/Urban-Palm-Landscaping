import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import Stripe from 'stripe';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { existsSync, mkdirSync, unlinkSync, readFileSync } from 'fs';
import db from './db.js';

// ─── Stripe helper ───────────────────────────────────────────────────────────
function getStripeInstance() {
  const row = db.prepare("SELECT value FROM site_settings WHERE key = 'stripe_secret_key'").get();
  if (!row || !row.value) return null;
  return new Stripe(row.value);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure upload directories exist
const uploadDirs = ['employees', 'services', 'inventory', 'imports', 'videos', 'carousel'];
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

const videoUpload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.mp4', '.webm', '.mov', '.ogg'];
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
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)').run(
    email, hash, name, 'customer'
  );

  res.status(201).json({ id: result.lastInsertRowid, email, name, role: 'customer' });
});

// ─── Site Settings ──────────────────────────────────────────────────────────

app.get('/api/settings', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM site_settings').all();
  const settings = {};
  for (const r of rows) settings[r.key] = r.value;
  res.json(settings);
});

app.get('/api/settings/:key', (req, res) => {
  const row = db.prepare('SELECT value FROM site_settings WHERE key = ?').get(req.params.key);
  res.json({ value: row ? row.value : null });
});

app.put('/api/settings', (req, res) => {
  const entries = req.body;
  if (!entries || typeof entries !== 'object') return res.status(400).json({ error: 'Invalid settings data' });

  const upsert = db.prepare(
    "INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')"
  );
  const updateMany = db.transaction((data) => {
    for (const [key, value] of Object.entries(data)) {
      upsert.run(key, value ?? null);
    }
  });
  updateMany(entries);
  res.json({ success: true });
});

const settingsVideoUpload = (req, _res, next) => { req.uploadDir = 'videos'; next(); };

app.post('/api/settings/upload-video', settingsVideoUpload, videoUpload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Video file is required. Accepted formats: .mp4, .webm, .mov, .ogg (max 100MB).' });

  // Delete old uploaded video if one exists
  const existing = db.prepare("SELECT value FROM site_settings WHERE key = 'welcome_video_url'").get();
  if (existing && existing.value && existing.value.startsWith('/uploads/videos/')) {
    try { unlinkSync(join(__dirname, existing.value.replace(/^\//, ''))); } catch { /* ignore */ }
  }

  const videoPath = `/uploads/videos/${req.file.filename}`;
  const upsert = db.prepare(
    "INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')"
  );
  upsert.run('welcome_video_url', videoPath);

  res.json({ success: true, url: videoPath });
});

app.delete('/api/settings/video', (req, res) => {
  const existing = db.prepare("SELECT value FROM site_settings WHERE key = 'welcome_video_url'").get();
  if (existing && existing.value && existing.value.startsWith('/uploads/videos/')) {
    try { unlinkSync(join(__dirname, existing.value.replace(/^\//, ''))); } catch { /* ignore */ }
  }
  const upsert = db.prepare(
    "INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')"
  );
  upsert.run('welcome_video_url', '');
  res.json({ success: true });
});

// ─── Hero Carousel Slides ───────────────────────────────────────────────────

const carouselUpload = (req, _res, next) => { req.uploadDir = 'carousel'; next(); };

app.get('/api/hero-slides', (req, res) => {
  const slides = db.prepare('SELECT * FROM hero_slides ORDER BY sort_order, id').all();
  res.json(slides);
});

app.post('/api/hero-slides', carouselUpload, upload.single('image'), (req, res) => {
  const { badge, headline, subtext, cta_label, cta_link, cta2_label, cta2_link, sort_order } = req.body;
  if (!req.file) return res.status(400).json({ error: 'Image is required' });

  const image = `/uploads/carousel/${req.file.filename}`;
  const result = db.prepare(
    'INSERT INTO hero_slides (image, badge, headline, subtext, cta_label, cta_link, cta2_label, cta2_link, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(image, badge || null, headline || null, subtext || null, cta_label || null, cta_link || null, cta2_label || null, cta2_link || null, Number(sort_order) || 0);

  const slide = db.prepare('SELECT * FROM hero_slides WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(slide);
});

app.put('/api/hero-slides/:id', carouselUpload, upload.single('image'), (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM hero_slides WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Slide not found' });

  const { badge, headline, subtext, cta_label, cta_link, cta2_label, cta2_link, sort_order, active } = req.body;
  let image = existing.image;
  if (req.file) {
    if (existing.image && existing.image.startsWith('/uploads/carousel/')) {
      try { unlinkSync(join(__dirname, existing.image.replace(/^\//, ''))); } catch { /* ignore */ }
    }
    image = `/uploads/carousel/${req.file.filename}`;
  }

  db.prepare(
    'UPDATE hero_slides SET image = ?, badge = ?, headline = ?, subtext = ?, cta_label = ?, cta_link = ?, cta2_label = ?, cta2_link = ?, sort_order = ?, active = ? WHERE id = ?'
  ).run(image, badge || null, headline || null, subtext || null, cta_label || null, cta_link || null, cta2_label || null, cta2_link || null, Number(sort_order) || 0, active !== undefined ? Number(active) : 1, id);

  const updated = db.prepare('SELECT * FROM hero_slides WHERE id = ?').get(id);
  res.json(updated);
});

app.delete('/api/hero-slides/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM hero_slides WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Slide not found' });

  if (existing.image && existing.image.startsWith('/uploads/carousel/')) {
    try { unlinkSync(join(__dirname, existing.image.replace(/^\//, ''))); } catch { /* ignore */ }
  }

  db.prepare('DELETE FROM hero_slides WHERE id = ?').run(req.params.id);
  res.json({ success: true });
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

// ─── Jobs ────────────────────────────────────────────────────────────────────

app.get('/api/jobs', (req, res) => {
  const userId = req.query.user_id;
  let jobs;
  if (userId) {
    jobs = db.prepare('SELECT j.*, u.name AS user_name FROM jobs j LEFT JOIN users u ON j.user_id = u.id WHERE j.user_id = ?').all(userId);
  } else {
    jobs = db.prepare('SELECT j.*, u.name AS user_name FROM jobs j LEFT JOIN users u ON j.user_id = u.id').all();
  }
  res.json(jobs.map(j => ({
    id: j.job_id,
    _id: j.id,
    client: j.user_name || j.client,
    service: j.service,
    assignee: j.assignee,
    date: j.date,
    status: j.status,
    quote_id: j.quote_id,
    schedule_id: j.schedule_id,
    user_id: j.user_id,
    address: j.address,
    amount: j.amount,
  })));
});

app.post('/api/jobs', (req, res) => {
  const { client, service, assignee, date, status, quote_id, schedule_id, user_id, address, amount } = req.body;
  if (!client || !service || !date) {
    return res.status(400).json({ error: 'Client, service, and date are required' });
  }

  const last = db.prepare("SELECT job_id FROM jobs ORDER BY id DESC LIMIT 1").get();
  const nextNum = last ? parseInt(last.job_id.replace('JOB-', ''), 10) + 1 : 1;
  const jobId = `JOB-${String(nextNum).padStart(3, '0')}`;

  db.prepare(
    'INSERT INTO jobs (job_id, client, service, assignee, date, status, quote_id, schedule_id, user_id, address, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(jobId, client, service, assignee || 'Unassigned', date, status || 'Scheduled', quote_id || null, schedule_id || null, user_id || null, address || null, amount || null);

  // Update quote status to Converted if linked
  if (quote_id) {
    db.prepare("UPDATE quote_requests SET status = 'Converted' WHERE id = ?").run(quote_id);
  }
  // Update schedule request status to Converted if linked
  if (schedule_id) {
    db.prepare("UPDATE schedule_requests SET status = 'Converted' WHERE id = ?").run(schedule_id);
  }

  res.status(201).json({ id: jobId, client, service, assignee: assignee || 'Unassigned', date, status: status || 'Scheduled', quote_id, schedule_id, user_id, address, amount });
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
  const { client, service, assignee, date, status, address, amount } = req.body;
  if (!client || !service || !date) {
    return res.status(400).json({ error: 'Client, service, and date are required' });
  }

  const result = db.prepare(
    'UPDATE jobs SET client = ?, service = ?, assignee = ?, date = ?, status = ?, address = ?, amount = ? WHERE job_id = ?'
  ).run(client, service, assignee || 'Unassigned', date, status || 'Scheduled', address || null, amount || null, jobId);
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
  const userId = req.query.user_id;
  let invoices;
  if (userId) {
    invoices = db.prepare('SELECT * FROM invoices WHERE user_id = ?').all(userId);
  } else {
    invoices = db.prepare('SELECT * FROM invoices').all();
  }
  res.json(invoices.map(i => ({
    id: i.inv_id,
    client: i.client,
    amount: i.amount,
    date: i.date,
    dueDate: i.due_date,
    status: i.status,
    job_id: i.job_id,
    user_id: i.user_id,
    paid_date: i.paid_date || null,
    payment_method: i.payment_method || null,
    transaction_id: i.transaction_id || null,
  })));
});

app.post('/api/invoices', (req, res) => {
  const { client, amount, date, due_date, status, job_id, user_id } = req.body;
  if (!client || amount == null) return res.status(400).json({ error: 'Client and amount are required' });

  const last = db.prepare("SELECT inv_id FROM invoices ORDER BY id DESC LIMIT 1").get();
  const nextNum = last ? parseInt(last.inv_id.replace('INV-', ''), 10) + 1 : 1;
  const invId = `INV-${String(nextNum).padStart(3, '0')}`;
  const invoiceDate = date || new Date().toISOString().split('T')[0];
  const dueDate = due_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  db.prepare(
    'INSERT INTO invoices (inv_id, client, amount, date, due_date, status, job_id, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(invId, client, amount, invoiceDate, dueDate, status || 'Pending', job_id || null, user_id || null);

  res.status(201).json({ id: invId, client, amount, date: invoiceDate, dueDate, status: status || 'Pending', job_id, user_id });
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

// ─── Stripe public key (no auth required) ───────────────────────────────────
app.get('/api/stripe/public-key', (_req, res) => {
  const row = db.prepare("SELECT value FROM site_settings WHERE key = 'stripe_publishable_key'").get();
  res.json({ publishableKey: row ? row.value : null });
});

// ─── Create Stripe PaymentIntent ─────────────────────────────────────────────
app.post('/api/invoices/:invId/create-payment-intent', async (req, res) => {
  const { invId } = req.params;

  const invoice = db.prepare('SELECT * FROM invoices WHERE inv_id = ?').get(invId);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  if (invoice.status === 'Paid') return res.status(400).json({ error: 'Invoice is already paid' });

  const stripe = getStripeInstance();
  if (!stripe) return res.status(500).json({ error: 'Stripe is not configured. Ask the admin to add Stripe API keys in Site Settings.' });

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(invoice.amount * 100), // cents
      currency: 'usd',
      metadata: { inv_id: invId },
      description: `Invoice ${invId} - Urban Palm Landscaping`,
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Confirm payment (after Stripe succeeds on the client) ───────────────────
app.post('/api/invoices/:invId/confirm-payment', async (req, res) => {
  const { invId } = req.params;
  const { payment_intent_id } = req.body;

  const invoice = db.prepare('SELECT * FROM invoices WHERE inv_id = ?').get(invId);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  if (invoice.status === 'Paid') return res.status(400).json({ error: 'Invoice is already paid' });
  if (!payment_intent_id) return res.status(400).json({ error: 'Payment intent ID is required' });

  const stripe = getStripeInstance();
  if (!stripe) return res.status(500).json({ error: 'Stripe is not configured' });

  try {
    const pi = await stripe.paymentIntents.retrieve(payment_intent_id);
    if (pi.status !== 'succeeded') return res.status(400).json({ error: `Payment not completed. Status: ${pi.status}` });

    const paidDate = new Date().toISOString().split('T')[0];
    const charge = pi.latest_charge && typeof pi.latest_charge === 'object' ? pi.latest_charge : null;
    let paymentMethod = 'Card';
    if (charge && charge.payment_method_details && charge.payment_method_details.card) {
      const card = charge.payment_method_details.card;
      paymentMethod = `${card.brand || 'Card'} ending in ${card.last4}`;
    }

    db.prepare(
      'UPDATE invoices SET status = ?, paid_date = ?, payment_method = ?, transaction_id = ? WHERE inv_id = ?'
    ).run('Paid', paidDate, paymentMethod, pi.id, invId);

    res.json({
      success: true,
      transaction_id: pi.id,
      paid_date: paidDate,
      payment_method: paymentMethod,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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
  const quotes = db.prepare('SELECT q.*, u.name AS user_name FROM quote_requests q LEFT JOIN users u ON q.user_id = u.id ORDER BY q.created_at DESC').all();
  res.json(quotes);
});

// Customer approve / decline a quote they own
app.put('/api/quotes/:id/respond', (req, res) => {
  const { id } = req.params;
  const { status, user_id } = req.body;
  if (!['Approved', 'Declined'].includes(status)) return res.status(400).json({ error: 'Status must be Approved or Declined' });
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });

  const quote = db.prepare('SELECT * FROM quote_requests WHERE id = ?').get(id);
  if (!quote) return res.status(404).json({ error: 'Quote not found' });
  if (quote.user_id !== Number(user_id)) return res.status(403).json({ error: 'Not authorized' });

  db.prepare('UPDATE quote_requests SET status = ? WHERE id = ?').run(status, id);
  const updated = db.prepare('SELECT * FROM quote_requests WHERE id = ?').get(id);
  res.json(updated);
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

app.put('/api/quotes/:id', (req, res) => {
  const { id } = req.params;
  const { service, property_type, timeline, budget, details, address, status, admin_reply } = req.body;
  if (!service || !details || !address) return res.status(400).json({ error: 'Service, details, and address are required' });

  const result = db.prepare(
    "UPDATE quote_requests SET service = ?, property_type = ?, timeline = ?, budget = ?, details = ?, address = ?, status = ?, admin_reply = ? WHERE id = ?"
  ).run(service, property_type || null, timeline || null, budget || null, details, address, status || 'Pending', admin_reply || null, id);
  if (result.changes === 0) return res.status(404).json({ error: 'Quote request not found' });

  const updated = db.prepare('SELECT * FROM quote_requests WHERE id = ?').get(id);
  res.json(updated);
});

app.delete('/api/quotes/:id', (req, res) => {
  const result = db.prepare('DELETE FROM quote_requests WHERE id = ?').run(req.params.id);
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
  const userId = req.query.user_id;
  let requests;
  if (userId) {
    requests = db.prepare('SELECT s.*, u.name AS user_name FROM schedule_requests s LEFT JOIN users u ON s.user_id = u.id WHERE s.user_id = ? ORDER BY s.created_at DESC').all(userId);
  } else {
    requests = db.prepare('SELECT s.*, u.name AS user_name FROM schedule_requests s LEFT JOIN users u ON s.user_id = u.id ORDER BY s.created_at DESC').all();
  }
  res.json(requests);
});

app.put('/api/schedule/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status is required' });

  const result = db.prepare('UPDATE schedule_requests SET status = ? WHERE id = ?').run(status, id);
  if (result.changes === 0) return res.status(404).json({ error: 'Schedule request not found' });

  res.json({ success: true });
});

// Customer-facing quotes (filtered by user)
app.get('/api/my-quotes', (req, res) => {
  const userId = req.query.user_id;
  if (!userId) return res.status(400).json({ error: 'user_id is required' });
  const quotes = db.prepare('SELECT * FROM quote_requests WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  res.json(quotes);
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

// Safely resolve category_id: returns a valid taxonomy id or null
function resolveCategoryId(raw) {
  if (raw == null || raw === '') return null;
  const id = Number(raw);
  if (!id || !Number.isFinite(id)) return null;
  const exists = db.prepare('SELECT 1 FROM taxonomy WHERE id = ?').get(id);
  return exists ? id : null;
}

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
  const { supplier_id, item_name, sku, category, category_id, unit, unit_cost, retail_cost, qty_available, reorder_point, notes, available: availableRaw } = req.body;
  if (!supplier_id || !item_name) return res.status(400).json({ error: 'Supplier and item name are required' });

  // Validate supplier_id references a real supplier
  const suppId = Number(supplier_id);
  if (!suppId || !Number.isFinite(suppId)) return res.status(400).json({ error: 'Invalid supplier' });
  const supplierExists = db.prepare('SELECT 1 FROM suppliers WHERE id = ?').get(suppId);
  if (!supplierExists) return res.status(400).json({ error: 'Supplier not found' });

  const wholesale = unit_cost != null && unit_cost !== '' ? Number(unit_cost) : null;
  const retail = retail_cost != null && retail_cost !== '' ? Number(retail_cost) : (wholesale != null ? +(wholesale * 1.5).toFixed(2) : null);
  const catId = resolveCategoryId(category_id);
  const qtyVal = qty_available != null ? Number(qty_available) : 0;
  const available = availableRaw === '1' || availableRaw === 1 ? 1 : 0;
  try {
    const result = db.prepare(
      'INSERT INTO supplier_inventory (supplier_id, item_name, sku, category, category_id, unit, unit_cost, retail_cost, qty_available, reorder_point, notes, available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(suppId, item_name, sku || null, category || null, catId, unit || null, wholesale, retail, qtyVal, reorder_point != null ? Number(reorder_point) : 0, notes || null, available);

    res.status(201).json({ id: result.lastInsertRowid, supplier_id: suppId, item_name, sku, category, category_id: catId, unit, unit_cost: wholesale, retail_cost: retail, qty_available: qtyVal, reorder_point: reorder_point ?? 0, notes, available });
  } catch (err) {
    console.error('POST /api/inventory error:', { supplier_id: suppId, category_id: catId, error: err.message });
    res.status(500).json({ error: err.message || 'Failed to save inventory item' });
  }
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
  } catch (err) {
    if (req.file?.path) { try { unlinkSync(req.file.path); } catch { /* ignore */ } }
    res.status(400).json({ error: 'Failed to parse file. Ensure it is a valid CSV file.' });
  }
});

app.put('/api/inventory/:id', (req, res) => {
  const { id } = req.params;
  const { supplier_id, item_name, sku, category, category_id, unit, unit_cost, retail_cost, qty_available, reorder_point, notes, available: availableRaw } = req.body;
  if (!supplier_id || !item_name) return res.status(400).json({ error: 'Supplier and item name are required' });

  const existing = db.prepare('SELECT id FROM supplier_inventory WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Inventory item not found' });

  const wholesale = unit_cost != null && unit_cost !== '' ? Number(unit_cost) : null;
  const retail = retail_cost != null && retail_cost !== '' ? Number(retail_cost) : (wholesale != null ? +(wholesale * 1.5).toFixed(2) : null);
  const catId = resolveCategoryId(category_id);
  const qtyVal = qty_available != null ? Number(qty_available) : 0;
  const available = availableRaw === '1' || availableRaw === 1 ? 1 : 0;

  // Validate supplier_id references a real supplier
  const suppId = Number(supplier_id);
  if (!suppId || !Number.isFinite(suppId)) return res.status(400).json({ error: 'Invalid supplier' });
  const supplierExists = db.prepare('SELECT 1 FROM suppliers WHERE id = ?').get(suppId);
  if (!supplierExists) return res.status(400).json({ error: 'Supplier not found' });

  try {
    const result = db.prepare(
      'UPDATE supplier_inventory SET supplier_id = ?, item_name = ?, sku = ?, category = ?, category_id = ?, unit = ?, unit_cost = ?, retail_cost = ?, qty_available = ?, reorder_point = ?, notes = ?, available = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).run(suppId, item_name, sku || null, category || null, catId, unit || null, wholesale, retail, qtyVal, reorder_point != null ? Number(reorder_point) : 0, notes || null, available, id);
    if (result.changes === 0) return res.status(404).json({ error: 'Inventory item not found' });

    res.json({ success: true, available });
  } catch (err) {
    console.error('PUT /api/inventory/:id error:', { id, supplier_id: suppId, category_id: catId, error: err.message });
    res.status(500).json({ error: err.message || 'Failed to update inventory item' });
  }
});

app.delete('/api/inventory/:id', (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM supplier_inventory WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Inventory item not found' });
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

// ─── Public Products ────────────────────────────────────────────────────────

app.get('/api/products', (req, res) => {
  // Return taxonomy leaf categories that have at least one active product
  const leaves = db.prepare(`
    SELECT t.id, t.name, t.description, t.image, t.parent_id,
           p.name AS parent_name,
           COUNT(si.id) AS product_count,
           MIN(si.retail_cost) AS min_price,
           MAX(si.retail_cost) AS max_price
    FROM taxonomy t
    LEFT JOIN taxonomy p ON p.id = t.parent_id
    JOIN supplier_inventory si ON si.category_id = t.id AND si.available = 1
    WHERE NOT EXISTS (SELECT 1 FROM taxonomy c WHERE c.parent_id = t.id)
    GROUP BY t.id
    ORDER BY t.name
  `).all();

  res.json(leaves);
});

// ─── Taxonomy ─────────────────────────────────────────────────────────────────

app.get('/api/taxonomy/roots', (_req, res) => {
  const roots = db.prepare(
    'SELECT id, name, description, sort_order FROM taxonomy WHERE parent_id IS NULL ORDER BY sort_order, name'
  ).all();

  // For each root, collect all descendant names (for product matching)
  const allNodes = db.prepare('SELECT id, name, parent_id FROM taxonomy').all();
  const childMap = {};
  for (const n of allNodes) {
    if (n.parent_id != null) {
      (childMap[n.parent_id] ||= []).push(n);
    }
  }
  const collectNames = (nodeId) => {
    const names = [];
    for (const child of (childMap[nodeId] || [])) {
      names.push(child.name);
      names.push(...collectNames(child.id));
    }
    return names;
  };

  const result = roots.map(r => ({
    ...r,
    descendant_names: collectNames(r.id),
  }));

  res.json(result);
});

app.get('/api/taxonomy/leaves', (_req, res) => {
  const leaves = db.prepare(`
    SELECT t.id, t.name, t.parent_id
    FROM taxonomy t
    WHERE NOT EXISTS (SELECT 1 FROM taxonomy c WHERE c.parent_id = t.id)
    ORDER BY t.name
  `).all();
  res.json(leaves);
});

app.get('/api/taxonomy', (_req, res) => {
  const rows = db.prepare('SELECT * FROM taxonomy ORDER BY sort_order, name').all();
  res.json(rows);
});

const taxonomyUpload = (req, _res, next) => { req.uploadDir = 'taxonomy'; next(); };

// Ensure taxonomy upload directory exists
const taxUploadDir = join(__dirname, 'uploads', 'taxonomy');
if (!existsSync(taxUploadDir)) mkdirSync(taxUploadDir, { recursive: true });

app.post('/api/taxonomy', taxonomyUpload, upload.single('image'), (req, res) => {
  const { name, description, parent_id } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

  // Validate parent_id exists if provided
  const pid = parent_id != null && parent_id !== '' ? Number(parent_id) : null;
  if (pid !== null) {
    const parentExists = db.prepare('SELECT 1 FROM taxonomy WHERE id = ?').get(pid);
    if (!parentExists) return res.status(400).json({ error: 'Invalid parent category' });
  }

  const image = req.file ? `/uploads/taxonomy/${req.file.filename}` : null;

  try {
    const maxOrder = db.prepare(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM taxonomy WHERE parent_id IS ?'
    ).get(pid);

    const result = db.prepare(
      "INSERT INTO taxonomy (name, description, parent_id, sort_order, image) VALUES (?, ?, ?, ?, ?)"
    ).run(name.trim(), (description || '').trim() || null, pid, maxOrder.next, image);

    const created = db.prepare('SELECT * FROM taxonomy WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create taxonomy node' });
  }
});

app.put('/api/taxonomy/:id', taxonomyUpload, upload.single('image'), (req, res) => {
  const { name, description, parent_id } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

  const id = Number(req.params.id);
  const pid = parent_id != null && parent_id !== '' ? Number(parent_id) : null;

  // Prevent making a node its own parent
  if (pid === id) return res.status(400).json({ error: 'A node cannot be its own parent' });

  // Validate parent_id exists if provided
  if (pid !== null) {
    const parentExists = db.prepare('SELECT 1 FROM taxonomy WHERE id = ?').get(pid);
    if (!parentExists) return res.status(400).json({ error: 'Invalid parent category' });

    // Prevent making a node a child of its own descendants
    const descendants = new Set();
    const collectDescendants = (nodeId) => {
      const children = db.prepare('SELECT id FROM taxonomy WHERE parent_id = ?').all(nodeId);
      for (const child of children) {
        descendants.add(child.id);
        collectDescendants(child.id);
      }
    };
    collectDescendants(id);
    if (descendants.has(pid)) {
      return res.status(400).json({ error: 'Cannot move a node under its own descendant' });
    }
  }

  const existing = db.prepare('SELECT image FROM taxonomy WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  let image = existing.image;
  if (req.file) {
    if (existing.image) {
      try { unlinkSync(join(__dirname, existing.image.replace(/^\//, ''))); } catch { /* ignore */ }
    }
    image = `/uploads/taxonomy/${req.file.filename}`;
  }

  try {
    db.prepare(
      "UPDATE taxonomy SET name = ?, description = ?, parent_id = ?, image = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(name.trim(), (description || '').trim() || null, pid, image, id);

    const updated = db.prepare('SELECT * FROM taxonomy WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update taxonomy node' });
  }
});

app.put('/api/taxonomy/:id/reorder', (req, res) => {
  const { sort_order } = req.body;
  if (sort_order == null) return res.status(400).json({ error: 'sort_order is required' });
  db.prepare("UPDATE taxonomy SET sort_order = ?, updated_at = datetime('now') WHERE id = ?").run(sort_order, req.params.id);
  res.json({ success: true });
});

app.delete('/api/taxonomy/:id', (req, res) => {
  const node = db.prepare('SELECT * FROM taxonomy WHERE id = ?').get(req.params.id);
  if (!node) return res.status(404).json({ error: 'Not found' });

  // CASCADE will delete children automatically
  db.prepare('DELETE FROM taxonomy WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── Start ───────────────────────────────────────────────────────────────────

// Global error handler — ensures middleware errors (e.g. multer) return JSON
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err.message || err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
