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
    operating_hours TEXT,
    delivery_info TEXT,
    delivery_fees TEXT,
    public_access TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'Active',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS supplier_inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    sku TEXT,
    category TEXT,
    unit TEXT,
    unit_cost REAL,
    retail_cost REAL,
    qty_available INTEGER DEFAULT 0,
    reorder_point INTEGER DEFAULT 0,
    notes TEXT,
    image TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS product_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    image TEXT
  );

  CREATE TABLE IF NOT EXISTS service_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    image_before TEXT,
    image_after TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS job_openings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    department TEXT,
    type TEXT NOT NULL DEFAULT 'Full-time',
    location TEXT NOT NULL DEFAULT 'Orlando, FL',
    description TEXT,
    requirements TEXT,
    status TEXT NOT NULL DEFAULT 'Open',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
if (!empColumns.includes('show_on_website')) {
  db.exec("ALTER TABLE employees ADD COLUMN show_on_website INTEGER NOT NULL DEFAULT 0");
}

// Migration: add image column to supplier_inventory if missing
const invColumns = db.prepare("PRAGMA table_info(supplier_inventory)").all().map(c => c.name);
if (!invColumns.includes('image')) {
  db.exec("ALTER TABLE supplier_inventory ADD COLUMN image TEXT");
}
if (!invColumns.includes('retail_cost')) {
  db.exec("ALTER TABLE supplier_inventory ADD COLUMN retail_cost REAL");
}

// Migration: add category_id to supplier_inventory if missing
if (!invColumns.includes('category_id')) {
  db.exec("ALTER TABLE supplier_inventory ADD COLUMN category_id INTEGER REFERENCES product_categories(id)");
}

// Migration: add new description columns to suppliers if missing
const supplierColumns = db.prepare("PRAGMA table_info(suppliers)").all().map(c => c.name);
if (!supplierColumns.includes('operating_hours')) {
  db.exec("ALTER TABLE suppliers ADD COLUMN operating_hours TEXT");
}
if (!supplierColumns.includes('delivery_info')) {
  db.exec("ALTER TABLE suppliers ADD COLUMN delivery_info TEXT");
}
if (!supplierColumns.includes('delivery_fees')) {
  db.exec("ALTER TABLE suppliers ADD COLUMN delivery_fees TEXT");
}
if (!supplierColumns.includes('public_access')) {
  db.exec("ALTER TABLE suppliers ADD COLUMN public_access TEXT");
}
if (!supplierColumns.includes('updated_at')) {
  db.exec("ALTER TABLE suppliers ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'))");
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
