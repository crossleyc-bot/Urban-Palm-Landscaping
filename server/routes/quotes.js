import { Router } from 'express';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

// ─── Contact Messages ────────────────────────────────────────────────────────

router.post('/contact', (req, res) => {
  const { name, email, phone, service, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required' });
  }

  db.prepare('INSERT INTO contact_messages (name, email, phone, service, message) VALUES (?, ?, ?, ?, ?)').run(
    name, email, phone || null, service || null, message
  );

  res.status(201).json({ success: true });
});

router.get('/contact', requireAuth, requireAdmin, (req, res) => {
  const messages = db.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC').all();
  res.json(messages);
});

router.put('/contact/:id/reply', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { admin_reply, status } = req.body;
  if (!admin_reply || !status) return res.status(400).json({ error: 'Reply and status are required' });

  const result = db.prepare(
    'UPDATE contact_messages SET admin_reply = ?, status = ? WHERE id = ?'
  ).run(admin_reply, status, id);
  if (result.changes === 0) return res.status(404).json({ error: 'Message not found' });

  res.json({ success: true });
});

router.delete('/contact/:id', requireAuth, requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM contact_messages WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Message not found' });
  res.json({ success: true });
});

// ─── Quote Requests ──────────────────────────────────────────────────────────

router.post('/quotes', (req, res) => {
  const { user_id, service, property_type, timeline, budget, details, address, guest_name, guest_email, guest_phone } = req.body;
  if (!service || !details || !address) {
    return res.status(400).json({ error: 'Service, details, and address are required' });
  }
  if (!user_id && (!guest_name || !guest_email)) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  db.prepare(
    'INSERT INTO quote_requests (user_id, service, property_type, timeline, budget, details, address, guest_name, guest_email, guest_phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(user_id || null, service, property_type || null, timeline || null, budget || null, details, address, guest_name || null, guest_email || null, guest_phone || null);

  res.status(201).json({ success: true });
});

router.get('/quotes', requireAuth, requireAdmin, (req, res) => {
  const quotes = db.prepare('SELECT q.*, u.name AS user_name, u.email AS user_email FROM quote_requests q LEFT JOIN users u ON q.user_id = u.id ORDER BY q.created_at DESC').all();
  res.json(quotes);
});

router.put('/quotes/:id/respond', requireAuth, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['Approved', 'Declined'].includes(status)) return res.status(400).json({ error: 'Status must be Approved or Declined' });

  const quote = db.prepare('SELECT * FROM quote_requests WHERE id = ?').get(id);
  if (!quote) return res.status(404).json({ error: 'Quote not found' });
  if (quote.user_id !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

  db.prepare('UPDATE quote_requests SET status = ? WHERE id = ?').run(status, id);
  const updated = db.prepare('SELECT * FROM quote_requests WHERE id = ?').get(id);
  res.json(updated);
});

router.put('/quotes/:id/reply', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { admin_reply, status } = req.body;
  if (!admin_reply || !status) return res.status(400).json({ error: 'Reply and status are required' });

  const result = db.prepare(
    'UPDATE quote_requests SET admin_reply = ?, status = ? WHERE id = ?'
  ).run(admin_reply, status, id);
  if (result.changes === 0) return res.status(404).json({ error: 'Quote request not found' });

  res.json({ success: true });
});

router.put('/quotes/:id', requireAuth, requireAdmin, (req, res) => {
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

router.delete('/quotes/:id', requireAuth, requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM quote_requests WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Quote request not found' });
  res.json({ success: true });
});

// ─── Schedule Requests ───────────────────────────────────────────────────────

router.post('/schedule', requireAuth, (req, res) => {
  const { service, date, time, frequency, address, notes } = req.body;
  if (!service || !date || !address) {
    return res.status(400).json({ error: 'Service, date, and address are required' });
  }

  db.prepare(
    'INSERT INTO schedule_requests (user_id, service, date, time, frequency, address, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(req.user.id, service, date, time || null, frequency || null, address, notes || null);

  res.status(201).json({ success: true });
});

router.get('/schedule', requireAuth, (req, res) => {
  let requests;
  if (req.user.role === 'admin') {
    const userId = req.query.user_id;
    if (userId) {
      requests = db.prepare('SELECT s.*, u.name AS user_name FROM schedule_requests s LEFT JOIN users u ON s.user_id = u.id WHERE s.user_id = ? ORDER BY s.created_at DESC').all(userId);
    } else {
      requests = db.prepare('SELECT s.*, u.name AS user_name FROM schedule_requests s LEFT JOIN users u ON s.user_id = u.id ORDER BY s.created_at DESC').all();
    }
  } else {
    requests = db.prepare('SELECT s.*, u.name AS user_name FROM schedule_requests s LEFT JOIN users u ON s.user_id = u.id WHERE s.user_id = ? ORDER BY s.created_at DESC').all(req.user.id);
  }
  res.json(requests);
});

router.put('/schedule/:id', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status is required' });

  const result = db.prepare('UPDATE schedule_requests SET status = ? WHERE id = ?').run(status, id);
  if (result.changes === 0) return res.status(404).json({ error: 'Schedule request not found' });

  res.json({ success: true });
});

router.delete('/schedule/:id', requireAuth, requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM schedule_requests WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Schedule request not found' });
  res.json({ success: true });
});

// Customer-facing quotes
router.get('/my-quotes', requireAuth, (req, res) => {
  const quotes = db.prepare('SELECT * FROM quote_requests WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json(quotes);
});

export default router;
