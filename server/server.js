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
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/auth/'),
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

// ─── Mount route modules ────────────────────────────────────────────────────
app.use('/api', authRoutes);
app.use('/api', servicesRoutes);
app.use('/api', adminRoutes);
app.use('/api', quotesRoutes);
app.use('/api', jobsRoutes);
app.use('/api', ordersRoutes);
app.use('/api', suppliersRoutes);
app.use('/api', notificationsRoutes);

// Global error handler — ensures middleware errors (e.g. multer) return JSON
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err.message || err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3001; // eslint-disable-line no-undef
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
