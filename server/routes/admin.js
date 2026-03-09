import { Router } from 'express';
import { join } from 'path';
import { unlinkSync } from 'fs';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { upload, videoUpload, serverDir } from '../middleware/upload.js';

const router = Router();

// ─── Site Settings (admin only) ─────────────────────────────────────────────

router.get('/settings', requireAuth, requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT key, value FROM site_settings').all();
  const settings = {};
  for (const r of rows) settings[r.key] = r.value;
  res.json(settings);
});

router.get('/settings/:key', requireAuth, requireAdmin, (req, res) => {
  const row = db.prepare('SELECT value FROM site_settings WHERE key = ?').get(req.params.key);
  res.json({ value: row ? row.value : null });
});

router.put('/settings', requireAuth, requireAdmin, (req, res) => {
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

router.post('/settings/upload-video', requireAuth, requireAdmin, settingsVideoUpload, videoUpload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Video file is required. Accepted formats: .mp4, .webm, .mov, .ogg (max 100MB).' });

  const existing = db.prepare("SELECT value FROM site_settings WHERE key = 'welcome_video_url'").get();
  if (existing && existing.value && existing.value.startsWith('/uploads/videos/')) {
    try { unlinkSync(join(serverDir, existing.value.replace(/^\//, ''))); } catch { /* ignore */ }
  }

  const videoPath = `/uploads/videos/${req.file.filename}`;
  const upsert = db.prepare(
    "INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')"
  );
  upsert.run('welcome_video_url', videoPath);

  res.json({ success: true, url: videoPath });
});

router.delete('/settings/video', requireAuth, requireAdmin, (req, res) => {
  const existing = db.prepare("SELECT value FROM site_settings WHERE key = 'welcome_video_url'").get();
  if (existing && existing.value && existing.value.startsWith('/uploads/videos/')) {
    try { unlinkSync(join(serverDir, existing.value.replace(/^\//, ''))); } catch { /* ignore */ }
  }
  const upsert = db.prepare(
    "INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')"
  );
  upsert.run('welcome_video_url', '');
  res.json({ success: true });
});

// ─── Hero Carousel Slides ───────────────────────────────────────────────────

const carouselUpload = (req, _res, next) => { req.uploadDir = 'carousel'; next(); };

router.get('/hero-slides', (req, res) => {
  const slides = db.prepare('SELECT * FROM hero_slides ORDER BY sort_order, id').all().map(s => ({
    ...s,
    cta_link: (!s.cta_link || /^\/(login|signin|sign-in|portal)/i.test(s.cta_link.trim())) ? '/quote' : s.cta_link,
  }));
  res.json(slides);
});

router.post('/hero-slides', requireAuth, requireAdmin, carouselUpload, upload.single('image'), (req, res) => {
  const { badge, headline, subtext, cta_label, cta_link, cta2_label, cta2_link, sort_order } = req.body;
  if (!req.file) return res.status(400).json({ error: 'Image is required' });

  const image = `/uploads/carousel/${req.file.filename}`;
  const result = db.prepare(
    'INSERT INTO hero_slides (image, badge, headline, subtext, cta_label, cta_link, cta2_label, cta2_link, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(image, badge || null, headline || null, subtext || null, cta_label || null, cta_link || '/quote', cta2_label || null, cta2_link || null, Number(sort_order) || 0);

  const slide = db.prepare('SELECT * FROM hero_slides WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(slide);
});

router.put('/hero-slides/:id', requireAuth, requireAdmin, carouselUpload, upload.single('image'), (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM hero_slides WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Slide not found' });

  const { badge, headline, subtext, cta_label, cta_link, cta2_label, cta2_link, sort_order, active } = req.body;
  let image = existing.image;
  if (req.file) {
    if (existing.image && existing.image.startsWith('/uploads/carousel/')) {
      try { unlinkSync(join(serverDir, existing.image.replace(/^\//, ''))); } catch { /* ignore */ }
    }
    image = `/uploads/carousel/${req.file.filename}`;
  }

  db.prepare(
    'UPDATE hero_slides SET image = ?, badge = ?, headline = ?, subtext = ?, cta_label = ?, cta_link = ?, cta2_label = ?, cta2_link = ?, sort_order = ?, active = ? WHERE id = ?'
  ).run(image, badge || null, headline || null, subtext || null, cta_label || null, cta_link || '/quote', cta2_label || null, cta2_link || null, Number(sort_order) || 0, active !== undefined ? Number(active) : 1, id);

  const updated = db.prepare('SELECT * FROM hero_slides WHERE id = ?').get(id);
  res.json(updated);
});

router.patch('/hero-slides/:id', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM hero_slides WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Slide not found' });

  const { active } = req.body;
  if (active === undefined) return res.status(400).json({ error: 'Nothing to update' });

  db.prepare('UPDATE hero_slides SET active = ? WHERE id = ?').run(Number(active), id);
  const updated = db.prepare('SELECT * FROM hero_slides WHERE id = ?').get(id);
  res.json(updated);
});

router.delete('/hero-slides/:id', requireAuth, requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM hero_slides WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Slide not found' });

  if (existing.image && existing.image.startsWith('/uploads/carousel/')) {
    try { unlinkSync(join(serverDir, existing.image.replace(/^\//, ''))); } catch { /* ignore */ }
  }

  db.prepare('DELETE FROM hero_slides WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── Employees ───────────────────────────────────────────────────────────────

const employeeUpload = (req, _res, next) => { req.uploadDir = 'employees'; next(); };

router.get('/employees', requireAuth, requireAdmin, (req, res) => {
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

router.get('/employees/featured', (req, res) => {
  const employees = db.prepare('SELECT * FROM employees WHERE show_on_website = 1 AND status = ?').all('Active');
  res.json(employees.map(e => ({
    id: e.emp_id,
    name: e.name,
    role: e.role,
    image: e.image,
  })));
});

router.post('/employees', requireAuth, requireAdmin, employeeUpload, upload.single('image'), (req, res) => {
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

router.put('/employees/:empId', requireAuth, requireAdmin, employeeUpload, upload.single('image'), (req, res) => {
  const { empId } = req.params;
  const { name, role, phone, email, status, show_on_website } = req.body;
  if (!name || !role) return res.status(400).json({ error: 'Name and role are required' });

  const existing = db.prepare('SELECT image FROM employees WHERE emp_id = ?').get(empId);
  if (!existing) return res.status(404).json({ error: 'Employee not found' });

  let image = existing.image;
  if (req.file) {
    if (existing.image) {
      const oldPath = join(serverDir, existing.image.replace(/^\//, ''));
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

router.delete('/employees/:empId', requireAuth, requireAdmin, (req, res) => {
  const { empId } = req.params;
  const existing = db.prepare('SELECT image FROM employees WHERE emp_id = ?').get(empId);
  const result = db.prepare('DELETE FROM employees WHERE emp_id = ?').run(empId);
  if (result.changes === 0) return res.status(404).json({ error: 'Employee not found' });

  if (existing && existing.image) {
    const oldPath = join(serverDir, existing.image.replace(/^\//, ''));
    try { unlinkSync(oldPath); } catch { /* ignore */ }
  }

  res.json({ success: true });
});

// ─── Job Openings ───────────────────────────────────────────────────────────

router.get('/job-openings', requireAuth, requireAdmin, (req, res) => {
  const openings = db.prepare('SELECT * FROM job_openings ORDER BY created_at DESC').all();
  res.json(openings);
});

router.get('/job-openings/public', (req, res) => {
  const openings = db.prepare("SELECT * FROM job_openings WHERE status = 'Open' ORDER BY created_at DESC").all();
  res.json(openings);
});

router.post('/job-openings', requireAuth, requireAdmin, (req, res) => {
  const { title, department, type, location, description, requirements, status } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const result = db.prepare(
    'INSERT INTO job_openings (title, department, type, location, description, requirements, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(title, department || null, type || 'Full-time', location || 'Orlando, FL', description || null, requirements || null, status || 'Open');

  res.status(201).json({ id: result.lastInsertRowid, title, department, type: type || 'Full-time', location: location || 'Orlando, FL', description, requirements, status: status || 'Open' });
});

router.put('/job-openings/:id', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { title, department, type, location, description, requirements, status } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const result = db.prepare(
    'UPDATE job_openings SET title = ?, department = ?, type = ?, location = ?, description = ?, requirements = ?, status = ? WHERE id = ?'
  ).run(title, department || null, type || 'Full-time', location || 'Orlando, FL', description || null, requirements || null, status || 'Open', id);
  if (result.changes === 0) return res.status(404).json({ error: 'Job opening not found' });

  res.json({ success: true });
});

router.delete('/job-openings/:id', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  const result = db.prepare('DELETE FROM job_openings WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Job opening not found' });

  res.json({ success: true });
});

// ─── Taxonomy ─────────────────────────────────────────────────────────────────

const taxonomyUpload = (req, _res, next) => { req.uploadDir = 'taxonomy'; next(); };

router.get('/taxonomy/roots', (_req, res) => {
  const roots = db.prepare(
    'SELECT id, name, description, sort_order FROM taxonomy WHERE parent_id IS NULL ORDER BY sort_order, name'
  ).all();

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

router.get('/taxonomy/leaves', (_req, res) => {
  const leaves = db.prepare(`
    SELECT t.id, t.name, t.parent_id
    FROM taxonomy t
    WHERE NOT EXISTS (SELECT 1 FROM taxonomy c WHERE c.parent_id = t.id)
    ORDER BY t.name
  `).all();
  res.json(leaves);
});

router.get('/taxonomy', (_req, res) => {
  const rows = db.prepare('SELECT * FROM taxonomy ORDER BY sort_order, name').all();
  res.json(rows);
});

router.post('/taxonomy', requireAuth, requireAdmin, taxonomyUpload, upload.single('image'), (req, res) => {
  const { name, description, parent_id } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

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

router.put('/taxonomy/:id', requireAuth, requireAdmin, taxonomyUpload, upload.single('image'), (req, res) => {
  const { name, description, parent_id } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

  const id = Number(req.params.id);
  const pid = parent_id != null && parent_id !== '' ? Number(parent_id) : null;

  if (pid === id) return res.status(400).json({ error: 'A node cannot be its own parent' });

  if (pid !== null) {
    const parentExists = db.prepare('SELECT 1 FROM taxonomy WHERE id = ?').get(pid);
    if (!parentExists) return res.status(400).json({ error: 'Invalid parent category' });

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
      try { unlinkSync(join(serverDir, existing.image.replace(/^\//, ''))); } catch { /* ignore */ }
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

router.put('/taxonomy/:id/reorder', requireAuth, requireAdmin, (req, res) => {
  const { sort_order } = req.body;
  if (sort_order == null) return res.status(400).json({ error: 'sort_order is required' });
  db.prepare("UPDATE taxonomy SET sort_order = ?, updated_at = datetime('now') WHERE id = ?").run(sort_order, req.params.id);
  res.json({ success: true });
});

router.delete('/taxonomy/:id', requireAuth, requireAdmin, (req, res) => {
  const node = db.prepare('SELECT * FROM taxonomy WHERE id = ?').get(req.params.id);
  if (!node) return res.status(404).json({ error: 'Not found' });

  db.prepare('DELETE FROM taxonomy WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── Resources ───────────────────────────────────────────────────────────────

const resourceUpload = (req, _res, next) => { req.uploadDir = 'resources'; next(); };

router.get('/resources', requireAuth, requireAdmin, (req, res) => {
  const resources = db.prepare('SELECT * FROM resources ORDER BY sort_order, created_at DESC').all();
  res.json(resources);
});

router.get('/resources/published', (_req, res) => {
  const resources = db.prepare('SELECT * FROM resources WHERE published = 1 ORDER BY sort_order, created_at DESC').all();
  res.json(resources);
});

router.post('/resources', requireAuth, requireAdmin, resourceUpload, upload.single('thumbnail'), (req, res) => {
  const { title, type, url, description, published, sort_order } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const thumbnail = req.file ? `/uploads/resources/${req.file.filename}` : null;
  const pub = published === '0' ? 0 : 1;

  const result = db.prepare(
    'INSERT INTO resources (title, type, url, description, thumbnail, published, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(title, type || 'article', url || null, description || null, thumbnail, pub, sort_order ?? 0);

  res.status(201).json({ id: result.lastInsertRowid, title, type: type || 'article', url, description, thumbnail, published: pub, sort_order: sort_order ?? 0 });
});

router.put('/resources/:id', requireAuth, requireAdmin, resourceUpload, upload.single('thumbnail'), (req, res) => {
  const { id } = req.params;
  const { title, type, url, description, published, sort_order } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const existing = db.prepare('SELECT * FROM resources WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Resource not found' });

  let thumbnail = existing.thumbnail;
  if (req.file) {
    if (existing.thumbnail) {
      try { unlinkSync(join(serverDir, existing.thumbnail.replace(/^\//, ''))); } catch { /* ignore */ }
    }
    thumbnail = `/uploads/resources/${req.file.filename}`;
  }

  const pub = published === '0' ? 0 : 1;
  db.prepare(
    'UPDATE resources SET title = ?, type = ?, url = ?, description = ?, thumbnail = ?, published = ?, sort_order = ? WHERE id = ?'
  ).run(title, type || 'article', url || null, description || null, thumbnail, pub, sort_order ?? 0, id);

  res.json({ id: Number(id), title, type: type || 'article', url, description, thumbnail, published: pub, sort_order: sort_order ?? 0 });
});

router.delete('/resources/:id', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT thumbnail FROM resources WHERE id = ?').get(id);
  if (existing && existing.thumbnail) {
    try { unlinkSync(join(serverDir, existing.thumbnail.replace(/^\//, ''))); } catch { /* ignore */ }
  }
  const result = db.prepare('DELETE FROM resources WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Resource not found' });
  res.json({ success: true });
});

// ─── Announcements ───────────────────────────────────────────────────────────

router.get('/announcements', requireAuth, requireAdmin, (_req, res) => {
  const announcements = db.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all();
  res.json(announcements);
});

router.get('/announcements/active', (_req, res) => {
  const announcement = db.prepare('SELECT * FROM announcements WHERE active = 1 ORDER BY created_at DESC LIMIT 1').get();
  res.json(announcement || null);
});

router.post('/announcements', requireAuth, requireAdmin, (req, res) => {
  const { message, link_text, link_url, bg_color, text_color, active } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });
  const result = db.prepare(
    'INSERT INTO announcements (message, link_text, link_url, bg_color, text_color, active) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(message, link_text || null, link_url || null, bg_color || '#166534', text_color || '#ffffff', active !== false ? 1 : 0);
  const created = db.prepare('SELECT * FROM announcements WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

router.put('/announcements/:id', requireAuth, requireAdmin, (req, res) => {
  const { message, link_text, link_url, bg_color, text_color, active } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });
  db.prepare(
    'UPDATE announcements SET message = ?, link_text = ?, link_url = ?, bg_color = ?, text_color = ?, active = ? WHERE id = ?'
  ).run(message, link_text || null, link_url || null, bg_color || '#166534', text_color || '#ffffff', active ? 1 : 0, req.params.id);
  const updated = db.prepare('SELECT * FROM announcements WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/announcements/:id', requireAuth, requireAdmin, (req, res) => {
  db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
