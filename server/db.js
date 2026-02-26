import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'urbanpalm.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer'
  );

  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price TEXT,
    icon TEXT,
    image_before TEXT,
    image_after TEXT
  );

  CREATE TABLE IF NOT EXISTS team_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT,
    experience TEXT,
    image TEXT
  );

  CREATE TABLE IF NOT EXISTS testimonials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    text TEXT NOT NULL,
    rating INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id),
    service TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL,
    amount REAL
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT UNIQUE NOT NULL,
    client TEXT NOT NULL,
    service TEXT NOT NULL,
    assignee TEXT NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Scheduled'
  );

  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    emp_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT,
    phone TEXT,
    email TEXT,
    image TEXT,
    status TEXT NOT NULL DEFAULT 'Active'
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inv_id TEXT UNIQUE NOT NULL,
    client TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending'
  );

  CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    service TEXT,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'New',
    admin_reply TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS quote_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    service TEXT NOT NULL,
    property_type TEXT,
    timeline TEXT,
    budget TEXT,
    details TEXT NOT NULL,
    address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    admin_reply TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS schedule_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    service TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT,
    frequency TEXT,
    address TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    website TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS supplier_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    sku TEXT,
    category TEXT,
    unit TEXT,
    unit_cost REAL,
    qty_available INTEGER DEFAULT 0,
    reorder_point INTEGER DEFAULT 0,
    notes TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Migration: add before/after image columns to services if missing
const svcColumns = db.prepare("PRAGMA table_info(services)").all().map(c => c.name);
if (!svcColumns.includes('image_before')) {
  db.exec("ALTER TABLE services ADD COLUMN image_before TEXT");
}
if (!svcColumns.includes('image_after')) {
  db.exec("ALTER TABLE services ADD COLUMN image_after TEXT");
}

// Migration: add status and admin_reply columns to quote_requests if missing
const quoteColumns = db.prepare("PRAGMA table_info(quote_requests)").all().map(c => c.name);
if (!quoteColumns.includes('status')) {
  db.exec("ALTER TABLE quote_requests ADD COLUMN status TEXT NOT NULL DEFAULT 'Pending'");
}
if (!quoteColumns.includes('admin_reply')) {
  db.exec("ALTER TABLE quote_requests ADD COLUMN admin_reply TEXT");
}

// Migration: add image column to employees if missing
const empColumns = db.prepare("PRAGMA table_info(employees)").all().map(c => c.name);
if (!empColumns.includes('image')) {
  db.exec("ALTER TABLE employees ADD COLUMN image TEXT");
}

// Migration: add status and admin_reply columns to contact_messages if missing
const contactColumns = db.prepare("PRAGMA table_info(contact_messages)").all().map(c => c.name);
if (!contactColumns.includes('status')) {
  db.exec("ALTER TABLE contact_messages ADD COLUMN status TEXT NOT NULL DEFAULT 'New'");
}
if (!contactColumns.includes('admin_reply')) {
  db.exec("ALTER TABLE contact_messages ADD COLUMN admin_reply TEXT");
}

export default db;
