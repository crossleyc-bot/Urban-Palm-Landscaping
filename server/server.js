import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import authRoutes from './routes/auth.js';
import servicesRoutes from './routes/services.js';
import adminRoutes from './routes/admin.js';
import quotesRoutes from './routes/quotes.js';
import jobsRoutes from './routes/jobs.js';
import ordersRoutes from './routes/orders.js';
import suppliersRoutes from './routes/suppliers.js';
import notificationsRoutes from './routes/notifications.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Trust proxy (required behind ELB/load balancer so rate-limiter uses real client IPs)
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS – allow same-host requests on any port (dev, preview, production)
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  credentials: true,
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/auth/') || req.path === '/health',
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many login attempts, please try again later.' },
});
app.use('/api/auth/', authLimiter);

app.use(express.json());
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// ─── Health check for ELB ────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ─── Mount route modules ────────────────────────────────────────────────────
app.use('/api', authRoutes);
app.use('/api', servicesRoutes);
app.use('/api', adminRoutes);
app.use('/api', quotesRoutes);
app.use('/api', jobsRoutes);
app.use('/api', ordersRoutes);
app.use('/api', suppliersRoutes);
app.use('/api', notificationsRoutes);

// ─── Dynamic Sitemap ─────────────────────────────────────────────────────────
import db from './db.js';

app.get('/sitemap.xml', (_req, res) => {
  const services = db.prepare('SELECT slug FROM services').all();
  const staticPages = [
    { loc: '/', changefreq: 'weekly', priority: '1.0' },
    { loc: '/services', changefreq: 'monthly', priority: '0.9' },
    { loc: '/portfolio', changefreq: 'monthly', priority: '0.8' },
    { loc: '/products', changefreq: 'weekly', priority: '0.8' },
    { loc: '/about', changefreq: 'monthly', priority: '0.7' },
    { loc: '/contact', changefreq: 'monthly', priority: '0.8' },
    { loc: '/careers', changefreq: 'weekly', priority: '0.6' },
    { loc: '/resources', changefreq: 'weekly', priority: '0.7' },
  ];

  const urls = staticPages.map(p =>
    `  <url>\n    <loc>https://urbanpalmlandscaping.com${p.loc}</loc>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
  );

  for (const svc of services) {
    if (svc.slug) {
      urls.push(`  <url>\n    <loc>https://urbanpalmlandscaping.com/services/${svc.slug}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
  res.set('Content-Type', 'application/xml');
  res.send(xml);
});

// ─── Serve frontend in production ───────────────────────────────────────────
const distPath = join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('{*path}', (_req, res, next) => {
  // Let API 404s pass through as JSON
  if (_req.path.startsWith('/api')) return next();
  res.sendFile(join(distPath, 'index.html'));
});

// Global error handler — ensures middleware errors (e.g. multer) return JSON
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err.message || err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3001; // eslint-disable-line no-undef
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
