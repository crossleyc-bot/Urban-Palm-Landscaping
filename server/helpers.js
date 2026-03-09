import db from './db.js';
import Stripe from 'stripe';

export function getStripeInstance() {
  const row = db.prepare("SELECT value FROM site_settings WHERE key = 'stripe_secret_key'").get();
  if (!row || !row.value) return null;
  return new Stripe(row.value);
}

export function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function resolveCategoryId(raw) {
  if (raw == null || raw === '') return null;
  const id = Number(raw);
  if (!id || !Number.isFinite(id)) return null;
  const exists = db.prepare('SELECT 1 FROM taxonomy WHERE id = ?').get(id);
  return exists ? id : null;
}

export function notifyOptedInUsers(type, title, message, link) {
  const users = db.prepare(
    "SELECT id, email, phone, email_opt_in, sms_opt_in FROM users WHERE role = 'customer' AND (email_opt_in = 1 OR sms_opt_in = 1)"
  ).all();

  const insertNotification = db.prepare(
    'INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)'
  );
  const insertQueue = db.prepare(
    'INSERT INTO notification_queue (user_id, channel, subject, body) VALUES (?, ?, ?, ?)'
  );

  for (const user of users) {
    insertNotification.run(user.id, type, title, message, link || null);
    if (user.email_opt_in) {
      insertQueue.run(user.id, 'email', title, message);
    }
    if (user.sms_opt_in && user.phone) {
      insertQueue.run(user.id, 'sms', null, message);
    }
  }
}
