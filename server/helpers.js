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

/**
 * Auto-assign a taxonomy leaf category based on item name matching.
 * Tries exact match on leaf name, then substring match, then word-level match.
 * Returns { id, name } of best match or null.
 */
export function autoAssignCategoryId(itemName) {
  if (!itemName) return null;

  const leaves = db.prepare(`
    SELECT t.id, t.name
    FROM taxonomy t
    WHERE NOT EXISTS (SELECT 1 FROM taxonomy c WHERE c.parent_id = t.id)
    ORDER BY t.name
  `).all();

  if (!leaves.length) return null;

  const item = itemName.toLowerCase().trim();

  // 1) Exact match (item name equals leaf name)
  for (const leaf of leaves) {
    if (item === leaf.name.toLowerCase().trim()) return leaf;
  }

  // 2) Leaf name appears as a word/phrase in the item name
  //    Sort by longest leaf name first so more specific categories win
  const sorted = [...leaves].sort((a, b) => b.name.length - a.name.length);
  for (const leaf of sorted) {
    const leafLower = leaf.name.toLowerCase().trim();
    // Check if leaf name appears as a whole word boundary in the item name
    const regex = new RegExp(`\\b${leafLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(item)) return leaf;
  }

  // 3) Item name appears within a leaf name (e.g., item "mulch" matches leaf "Premium Mulch")
  for (const leaf of sorted) {
    const leafLower = leaf.name.toLowerCase().trim();
    const regex = new RegExp(`\\b${item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(leafLower)) return leaf;
  }

  // 4) Word overlap: find leaf with most matching words
  const itemWords = item.split(/\s+/).filter(w => w.length > 2);
  if (itemWords.length) {
    let bestLeaf = null;
    let bestScore = 0;
    for (const leaf of leaves) {
      const leafWords = leaf.name.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      const matches = itemWords.filter(w => leafWords.some(lw => lw.includes(w) || w.includes(lw)));
      if (matches.length > bestScore) {
        bestScore = matches.length;
        bestLeaf = leaf;
      }
    }
    if (bestScore > 0) return bestLeaf;
  }

  return null;
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
