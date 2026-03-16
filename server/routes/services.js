import { Router } from 'express';
import { join } from 'path';
import { unlinkSync } from 'fs';
import db from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { serverDir } from '../middleware/upload.js';

const router = Router();

const serviceUpload = (req, _res, next) => { req.uploadDir = 'services'; next(); };

// ─── Services ────────────────────────────────────────────────────────────────

router.get('/services', (req, res) => {
  const services = db.prepare('SELECT * FROM services').all();
  const allImages = db.prepare('SELECT * FROM service_images ORDER BY sort_order, id').all();
  const imageMap = new Map();
  for (const img of allImages) {
    if (!imageMap.has(img.service_id)) imageMap.set(img.service_id, []);
    imageMap.get(img.service_id).push(img);
  }
  res.json(services.map(s => ({ ...s, images: imageMap.get(s.id) || [] })));
});

// Get a single service by slug
router.get('/services/:slug', (req, res) => {
  const { slug } = req.params;
  // Try slug first, then numeric id
  const service = slug.match(/^\d+$/)
    ? db.prepare('SELECT * FROM services WHERE id = ?').get(slug)
    : db.prepare('SELECT * FROM services WHERE slug = ?').get(slug);
  if (!service) return res.status(404).json({ error: 'Service not found' });
  const images = db.prepare('SELECT * FROM service_images WHERE service_id = ? ORDER BY sort_order, id').all(service.id);
  res.json({ ...service, images });
});

function generateSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function ensureUniqueSlug(slug, excludeId) {
  let candidate = slug;
  let suffix = 1;
  while (true) {
    const existing = excludeId
      ? db.prepare('SELECT id FROM services WHERE slug = ? AND id != ?').get(candidate, excludeId)
      : db.prepare('SELECT id FROM services WHERE slug = ?').get(candidate);
    if (!existing) return candidate;
    candidate = `${slug}-${++suffix}`;
  }
}

router.post('/services', requireAuth, requireAdmin, serviceUpload, upload.fields([{ name: 'image_before', maxCount: 1 }, { name: 'image_after', maxCount: 1 }]), (req, res) => {
  const { name, description, price, icon, on_sale, sale_label, long_description, features, cta_text, meta_title, meta_description, why_choose_us, faqs } = req.body;
  if (!name) return res.status(400).json({ error: 'Service name is required' });

  const slug = ensureUniqueSlug(generateSlug(name));
  const imageBefore = req.files?.image_before?.[0] ? `/uploads/services/${req.files.image_before[0].filename}` : null;
  const imageAfter = req.files?.image_after?.[0] ? `/uploads/services/${req.files.image_after[0].filename}` : null;
  const saleFlag = on_sale === '1' || on_sale === 1 ? 1 : 0;

  const result = db.prepare(
    'INSERT INTO services (name, slug, description, price, icon, image_before, image_after, on_sale, sale_label, long_description, features, cta_text, meta_title, meta_description, why_choose_us, faqs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(name, slug, description || null, price || null, icon || null, imageBefore, imageAfter, saleFlag, sale_label || null, long_description || null, features || null, cta_text || null, meta_title || null, meta_description || null, why_choose_us || null, faqs || null);

  res.status(201).json({ id: result.lastInsertRowid, slug, name, description, price, icon, image_before: imageBefore, image_after: imageAfter });
});

router.put('/services/:id', requireAuth, requireAdmin, serviceUpload, upload.fields([{ name: 'image_before', maxCount: 1 }, { name: 'image_after', maxCount: 1 }]), (req, res) => {
  const { id } = req.params;
  const { name, description, price, icon, on_sale, sale_label, long_description, features, cta_text, meta_title, meta_description, why_choose_us, faqs } = req.body;
  if (!name) return res.status(400).json({ error: 'Service name is required' });
  const saleFlag = on_sale === '1' || on_sale === 1 ? 1 : 0;

  const existing = db.prepare('SELECT image_before, image_after, slug FROM services WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Service not found' });

  // Regenerate slug if name changed
  const slug = existing.slug || ensureUniqueSlug(generateSlug(name), id);

  let imageBefore = existing.image_before;
  let imageAfter = existing.image_after;

  if (req.files?.image_before?.[0]) {
    if (existing.image_before) {
      try { unlinkSync(join(serverDir, existing.image_before.replace(/^\//, ''))); } catch { /* ignore */ }
    }
    imageBefore = `/uploads/services/${req.files.image_before[0].filename}`;
  }
  if (req.files?.image_after?.[0]) {
    if (existing.image_after) {
      try { unlinkSync(join(serverDir, existing.image_after.replace(/^\//, ''))); } catch { /* ignore */ }
    }
    imageAfter = `/uploads/services/${req.files.image_after[0].filename}`;
  }

  db.prepare(
    'UPDATE services SET name = ?, slug = ?, description = ?, price = ?, icon = ?, image_before = ?, image_after = ?, on_sale = ?, sale_label = ?, long_description = ?, features = ?, cta_text = ?, meta_title = ?, meta_description = ?, why_choose_us = ?, faqs = ? WHERE id = ?'
  ).run(name, slug, description || null, price || null, icon || null, imageBefore, imageAfter, saleFlag, sale_label || null, long_description || null, features || null, cta_text || null, meta_title || null, meta_description || null, why_choose_us || null, faqs || null, id);

  res.json({ success: true, slug, image_before: imageBefore, image_after: imageAfter });
});

router.delete('/services/:id', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT image_before, image_after FROM services WHERE id = ?').get(id);
  const extraImages = db.prepare('SELECT image_before, image_after FROM service_images WHERE service_id = ?').all(id);
  const result = db.prepare('DELETE FROM services WHERE id = ?').run(id);
  if (result.changes === 0) return res.status(404).json({ error: 'Service not found' });

  const toDelete = [];
  if (existing) toDelete.push(existing.image_before, existing.image_after);
  for (const row of extraImages) toDelete.push(row.image_before, row.image_after);
  for (const img of toDelete) {
    if (img) { try { unlinkSync(join(serverDir, img.replace(/^\//, ''))); } catch { /* ignore */ } }
  }

  res.json({ success: true });
});

// ─── Service Images ─────────────────────────────────────────────────────────

router.post('/services/:serviceId/images', requireAuth, requireAdmin, serviceUpload, upload.fields([{ name: 'image_before', maxCount: 1 }, { name: 'image_after', maxCount: 1 }]), (req, res) => {
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

router.delete('/service-images/:id', requireAuth, requireAdmin, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT image_before, image_after FROM service_images WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Image not found' });

  db.prepare('DELETE FROM service_images WHERE id = ?').run(id);

  for (const img of [existing.image_before, existing.image_after]) {
    if (img) { try { unlinkSync(join(serverDir, img.replace(/^\//, ''))); } catch { /* ignore */ } }
  }

  res.json({ success: true });
});

// ─── Team Members ────────────────────────────────────────────────────────────

router.get('/team', (req, res) => {
  const members = db.prepare('SELECT * FROM team_members').all();
  res.json(members);
});

// ─── Testimonials ────────────────────────────────────────────────────────────

router.get('/testimonials', (req, res) => {
  const testimonials = db.prepare('SELECT * FROM testimonials').all();
  res.json(testimonials);
});

router.post('/testimonials', requireAuth, requireAdmin, (req, res) => {
  const { name, text, rating } = req.body;
  if (!name || !text || !rating) return res.status(400).json({ error: 'Name, text, and rating are required' });
  const result = db.prepare('INSERT INTO testimonials (name, text, rating) VALUES (?, ?, ?)').run(name, text, Number(rating));
  res.status(201).json({ id: result.lastInsertRowid, name, text, rating: Number(rating) });
});

router.put('/testimonials/:id', requireAuth, requireAdmin, (req, res) => {
  const { name, text, rating } = req.body;
  if (!name || !text || !rating) return res.status(400).json({ error: 'Name, text, and rating are required' });
  db.prepare('UPDATE testimonials SET name = ?, text = ?, rating = ? WHERE id = ?').run(name, text, Number(rating), req.params.id);
  res.json({ id: Number(req.params.id), name, text, rating: Number(rating) });
});

router.delete('/testimonials/:id', requireAuth, requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM testimonials WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Testimonial not found' });
  res.json({ success: true });
});

export default router;
