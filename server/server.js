import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import db from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

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

app.get('/api/services', (req, res) => {
  const services = db.prepare('SELECT * FROM services').all();
  res.json(services);
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

// ─── Employees ───────────────────────────────────────────────────────────────

app.get('/api/employees', (req, res) => {
  const employees = db.prepare('SELECT * FROM employees').all();
  res.json(employees.map(e => ({
    id: e.emp_id,
    name: e.name,
    role: e.role,
    phone: e.phone,
    email: e.email,
    status: e.status,
  })));
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

// ─── Start ───────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
