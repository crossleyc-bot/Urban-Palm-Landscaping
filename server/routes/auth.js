import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { generateToken, requireAuth, validatePassword } from '../middleware/auth.js';
import { escapeXml } from '../helpers.js';

const router = Router();

// ─── Auth ────────────────────────────────────────────────────────────────────

router.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = generateToken(user);
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role, token });
});

router.post('/auth/register', (req, res) => {
  const { email, password, name, phone, address, sms_opt_in, email_opt_in } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }

  if (phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 11) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit phone number' });
    }
  }

  if (address !== undefined && address !== '' && address.trim().length < 5) {
    return res.status(400).json({ error: 'Please enter a valid street address' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (email, password_hash, name, role, phone, address, sms_opt_in, email_opt_in) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(email, hash, name, 'customer', phone || null, address || null, sms_opt_in ? 1 : 0, email_opt_in ? 1 : 0);

  const newUser = { id: result.lastInsertRowid, email, name, role: 'customer' };
  const token = generateToken(newUser);
  res.status(201).json({ id: newUser.id, email, name, role: 'customer', phone: phone || null, address: address || null, sms_opt_in: !!sms_opt_in, email_opt_in: !!email_opt_in, token });
});

// ─── USPS Address Validation ─────────────────────────────────────────────────

router.post('/validate-address', async (req, res) => {
  const { street, city, state, zip } = req.body;
  if (!street) {
    return res.status(400).json({ error: 'Street address is required' });
  }

  const row = db.prepare("SELECT value FROM site_settings WHERE key = 'usps_user_id'").get();
  const uspsUserId = row?.value;
  if (!uspsUserId) {
    return res.json({ valid: true, skipped: true });
  }

  const xmlPayload = `<AddressValidateRequest USERID="${uspsUserId}"><Address><Address1></Address1><Address2>${escapeXml(street)}</Address2><City>${escapeXml(city || '')}</City><State>${escapeXml(state || '')}</State><Zip5>${escapeXml(zip || '')}</Zip5><Zip4></Zip4></Address></AddressValidateRequest>`;

  try {
    const url = `https://secure.shippingapis.com/ShippingAPI.dll?API=Verify&XML=${encodeURIComponent(xmlPayload)}`;
    const response = await fetch(url);
    const text = await response.text();

    const errorMatch = text.match(/<Description>(.*?)<\/Description>/);
    if (text.includes('<Error>') && errorMatch) {
      return res.json({ valid: false, error: errorMatch[1] });
    }

    const get = (tag) => { const m = text.match(new RegExp(`<${tag}>(.*?)</${tag}>`)); return m ? m[1] : ''; };
    const standardized = {
      street: get('Address2'),
      city: get('City'),
      state: get('State'),
      zip5: get('Zip5'),
      zip4: get('Zip4'),
    };

    const dpv = get('DPVConfirmation');
    const returnText = get('ReturnText');

    res.json({
      valid: dpv === 'Y' || dpv === 'D' || dpv === 'S',
      standardized,
      formatted: `${standardized.street}, ${standardized.city}, ${standardized.state} ${standardized.zip5}${standardized.zip4 ? '-' + standardized.zip4 : ''}`,
      dpv,
      returnText: returnText || null,
    });
  } catch {
    res.json({ valid: true, skipped: true, error: 'Address validation service unavailable' });
  }
});

// ─── Account (requires authentication) ──────────────────────────────────────

router.put('/account/password', requireAuth, (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }
  const passwordError = validatePassword(new_password);
  if (passwordError) {
    return res.status(400).json({ error: passwordError });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!bcrypt.compareSync(current_password, user.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id);
  res.json({ success: true });
});

router.put('/account/profile', requireAuth, (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, req.user.id);
  if (existing) return res.status(400).json({ error: 'Email already in use' });
  db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(name, email, req.user.id);
  res.json({ id: req.user.id, name, email });
});

export default router;
