import { Router } from 'express';
import db from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/notifications', requireAuth, (req, res) => {
  const notifications = db.prepare(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
  ).all(req.user.id);
  res.json(notifications);
});

router.get('/notifications/unread-count', requireAuth, (req, res) => {
  const row = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0').get(req.user.id);
  res.json({ count: row.count });
});

router.put('/notifications/:id/read', requireAuth, (req, res) => {
  const notification = db.prepare('SELECT user_id FROM notifications WHERE id = ?').get(req.params.id);
  if (!notification || notification.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

router.put('/notifications/read-all', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0').run(req.user.id);
  res.json({ success: true });
});

export default router;
