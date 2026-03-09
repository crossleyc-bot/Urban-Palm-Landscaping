import { Router } from 'express';
import Stripe from 'stripe';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { getStripeInstance } from '../helpers.js';

const router = Router();

// ─── Jobs ────────────────────────────────────────────────────────────────────

router.get('/jobs', requireAuth, (req, res) => {
  let jobs;
  if (req.user.role === 'admin') {
    const userId = req.query.user_id;
    if (userId) {
      jobs = db.prepare('SELECT j.*, u.name AS user_name FROM jobs j LEFT JOIN users u ON j.user_id = u.id WHERE j.user_id = ?').all(userId);
    } else {
      jobs = db.prepare('SELECT j.*, u.name AS user_name FROM jobs j LEFT JOIN users u ON j.user_id = u.id').all();
    }
  } else {
    jobs = db.prepare('SELECT j.*, u.name AS user_name FROM jobs j LEFT JOIN users u ON j.user_id = u.id WHERE j.user_id = ?').all(req.user.id);
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

router.post('/jobs', requireAuth, requireAdmin, (req, res) => {
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

  if (quote_id) {
    db.prepare("UPDATE quote_requests SET status = 'Converted' WHERE id = ?").run(quote_id);
  }
  if (schedule_id) {
    db.prepare("UPDATE schedule_requests SET status = 'Converted' WHERE id = ?").run(schedule_id);
  }

  res.status(201).json({ id: jobId, client, service, assignee: assignee || 'Unassigned', date, status: status || 'Scheduled', quote_id, schedule_id, user_id, address, amount });
});

router.put('/jobs/:jobId/status', requireAuth, requireAdmin, (req, res) => {
  const { jobId } = req.params;
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'Status is required' });

  const result = db.prepare('UPDATE jobs SET status = ? WHERE job_id = ?').run(status, jobId);
  if (result.changes === 0) return res.status(404).json({ error: 'Job not found' });

  res.json({ success: true });
});

router.put('/jobs/:jobId', requireAuth, requireAdmin, (req, res) => {
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

router.delete('/jobs/:jobId', requireAuth, requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM jobs WHERE job_id = ?').run(req.params.jobId);
  if (result.changes === 0) return res.status(404).json({ error: 'Job not found' });
  res.json({ success: true });
});

// ─── Invoices ────────────────────────────────────────────────────────────────

router.get('/invoices', requireAuth, (req, res) => {
  let invoices;
  if (req.user.role === 'admin') {
    const userId = req.query.user_id;
    if (userId) {
      invoices = db.prepare('SELECT * FROM invoices WHERE user_id = ?').all(userId);
    } else {
      invoices = db.prepare('SELECT * FROM invoices').all();
    }
  } else {
    invoices = db.prepare('SELECT * FROM invoices WHERE user_id = ?').all(req.user.id);
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

router.post('/invoices', requireAuth, requireAdmin, (req, res) => {
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

router.put('/invoices/:invId', requireAuth, requireAdmin, (req, res) => {
  const { invId } = req.params;
  const { client, amount, date, due_date, status } = req.body;
  if (!client || amount == null || !status) return res.status(400).json({ error: 'Client, amount, and status are required' });

  const result = db.prepare(
    'UPDATE invoices SET client = ?, amount = ?, date = ?, due_date = ?, status = ? WHERE inv_id = ?'
  ).run(client, amount, date, due_date, status, invId);
  if (result.changes === 0) return res.status(404).json({ error: 'Invoice not found' });

  res.json({ success: true });
});

// ─── Invoice Payments (Stripe) ──────────────────────────────────────────────

router.post('/invoices/:invId/create-payment-intent', requireAuth, async (req, res) => {
  const { invId } = req.params;

  const invoice = db.prepare('SELECT * FROM invoices WHERE inv_id = ?').get(invId);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  if (invoice.status === 'Paid') return res.status(400).json({ error: 'Invoice is already paid' });

  const stripe = getStripeInstance();
  if (!stripe) return res.status(500).json({ error: 'Stripe is not configured. Ask the admin to add Stripe API keys in Site Settings.' });

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(invoice.amount * 100),
      currency: 'usd',
      metadata: { inv_id: invId },
      description: `Invoice ${invId} - Urban Palm Landscaping`,
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/invoices/:invId/confirm-payment', requireAuth, async (req, res) => {
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

export default router;
