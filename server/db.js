import db from './database.js';

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
    available INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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

  CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS hero_slides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image TEXT NOT NULL,
    badge TEXT,
    headline TEXT,
    subtext TEXT,
    cta_label TEXT,
    cta_link TEXT,
    cta2_label TEXT,
    cta2_link TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'article',
    url TEXT,
    description TEXT,
    thumbnail TEXT,
    published INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS taxonomy (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES taxonomy(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    guest_name TEXT,
    guest_email TEXT,
    status TEXT NOT NULL DEFAULT 'Pending',
    subtotal REAL NOT NULL DEFAULT 0,
    tax REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    payment_method TEXT,
    transaction_id TEXT,
    paid_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    inventory_id INTEGER REFERENCES supplier_inventory(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    unit TEXT,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1
  );
`);

// Migration: add phone, address, and notification preferences to users
const userColumns = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
if (!userColumns.includes('phone')) {
  db.exec("ALTER TABLE users ADD COLUMN phone TEXT");
}
if (!userColumns.includes('address')) {
  db.exec("ALTER TABLE users ADD COLUMN address TEXT");
}
if (!userColumns.includes('sms_opt_in')) {
  db.exec("ALTER TABLE users ADD COLUMN sms_opt_in INTEGER NOT NULL DEFAULT 0");
}
if (!userColumns.includes('email_opt_in')) {
  db.exec("ALTER TABLE users ADD COLUMN email_opt_in INTEGER NOT NULL DEFAULT 0");
}

// Migration: add sale columns to services
const svcColumns = db.prepare("PRAGMA table_info(services)").all().map(c => c.name);
if (!svcColumns.includes('on_sale')) {
  db.exec("ALTER TABLE services ADD COLUMN on_sale INTEGER NOT NULL DEFAULT 0");
}
if (!svcColumns.includes('sale_label')) {
  db.exec("ALTER TABLE services ADD COLUMN sale_label TEXT");
}

// Migration: add sale columns to supplier_inventory
const invSaleColumns = db.prepare("PRAGMA table_info(supplier_inventory)").all().map(c => c.name);
if (!invSaleColumns.includes('on_sale')) {
  db.exec("ALTER TABLE supplier_inventory ADD COLUMN on_sale INTEGER NOT NULL DEFAULT 0");
}
if (!invSaleColumns.includes('sale_price')) {
  db.exec("ALTER TABLE supplier_inventory ADD COLUMN sale_price REAL");
}

// Migration: add sale_percentage column to supplier_inventory
if (!invSaleColumns.includes('sale_percentage')) {
  db.exec("ALTER TABLE supplier_inventory ADD COLUMN sale_percentage REAL");
}

// Migration: add before/after image columns to services if missing
if (!svcColumns.includes('image_before')) {
  db.exec("ALTER TABLE services ADD COLUMN image_before TEXT");
}
if (!svcColumns.includes('image_after')) {
  db.exec("ALTER TABLE services ADD COLUMN image_after TEXT");
}

// Migration: add guest contact fields to quote_requests
const quoteGuestColumns = db.prepare("PRAGMA table_info(quote_requests)").all().map(c => c.name);
if (!quoteGuestColumns.includes('guest_name')) {
  db.exec("ALTER TABLE quote_requests ADD COLUMN guest_name TEXT");
}
if (!quoteGuestColumns.includes('guest_email')) {
  db.exec("ALTER TABLE quote_requests ADD COLUMN guest_email TEXT");
}
if (!quoteGuestColumns.includes('guest_phone')) {
  db.exec("ALTER TABLE quote_requests ADD COLUMN guest_phone TEXT");
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

if (!invColumns.includes('available')) {
  db.exec("ALTER TABLE supplier_inventory ADD COLUMN available INTEGER NOT NULL DEFAULT 0");
}

if (!invColumns.includes('category_id')) {
  db.exec("ALTER TABLE supplier_inventory ADD COLUMN category_id INTEGER REFERENCES taxonomy(id)");
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
  db.exec("ALTER TABLE suppliers ADD COLUMN updated_at TEXT");
  db.exec("UPDATE suppliers SET updated_at = datetime('now') WHERE updated_at IS NULL");
}

// Migration: add status and admin_reply columns to contact_messages if missing
const contactColumns = db.prepare("PRAGMA table_info(contact_messages)").all().map(c => c.name);
if (!contactColumns.includes('status')) {
  db.exec("ALTER TABLE contact_messages ADD COLUMN status TEXT NOT NULL DEFAULT 'New'");
}
if (!contactColumns.includes('admin_reply')) {
  db.exec("ALTER TABLE contact_messages ADD COLUMN admin_reply TEXT");
}

// Migration: rebuild supplier_inventory to use ON DELETE SET NULL for category_id FK
// This prevents "FOREIGN KEY constraint failed" when setting/changing category_id
const invSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='supplier_inventory'").get();
if (invSchema && invSchema.sql.includes('REFERENCES') && !invSchema.sql.includes('ON DELETE SET NULL')) {
  db.pragma('foreign_keys = OFF');
  db.exec(`
    CREATE TABLE supplier_inventory_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
      item_name TEXT NOT NULL,
      sku TEXT,
      category TEXT,
      category_id INTEGER REFERENCES taxonomy(id) ON DELETE SET NULL,
      unit TEXT,
      unit_cost REAL,
      retail_cost REAL,
      qty_available INTEGER DEFAULT 0,
      reorder_point INTEGER DEFAULT 0,
      notes TEXT,
      image TEXT,
      available INTEGER NOT NULL DEFAULT 0,
      on_sale INTEGER NOT NULL DEFAULT 0,
      sale_price REAL,
      sale_percentage REAL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO supplier_inventory_new (id, supplier_id, item_name, sku, category, category_id, unit, unit_cost, retail_cost, qty_available, reorder_point, notes, image, available, on_sale, sale_price, sale_percentage, updated_at)
      SELECT id, supplier_id, item_name, sku, category, category_id, unit, unit_cost, retail_cost, qty_available, reorder_point, notes, image, available,
        COALESCE(on_sale, 0), sale_price, sale_percentage, updated_at
      FROM supplier_inventory;
    DROP TABLE supplier_inventory;
    ALTER TABLE supplier_inventory_new RENAME TO supplier_inventory;
  `);
  db.pragma('foreign_keys = ON');
}

// Migration: add image column to taxonomy for leaf-level category images
const taxColumns = db.prepare("PRAGMA table_info(taxonomy)").all().map(c => c.name);
if (!taxColumns.includes('image')) {
  db.exec("ALTER TABLE taxonomy ADD COLUMN image TEXT");
}

// Migration: add per-category delivery and installation fee overrides
if (!taxColumns.includes('delivery_fee')) {
  db.exec("ALTER TABLE taxonomy ADD COLUMN delivery_fee REAL");
}
if (!taxColumns.includes('installation_fee')) {
  db.exec("ALTER TABLE taxonomy ADD COLUMN installation_fee REAL");
}

// Migration: add workflow linking columns to jobs (quote_id, schedule_id, user_id, address, amount)
const jobColumns = db.prepare("PRAGMA table_info(jobs)").all().map(c => c.name);
if (!jobColumns.includes('quote_id')) {
  db.exec("ALTER TABLE jobs ADD COLUMN quote_id INTEGER REFERENCES quote_requests(id)");
}
if (!jobColumns.includes('schedule_id')) {
  db.exec("ALTER TABLE jobs ADD COLUMN schedule_id INTEGER REFERENCES schedule_requests(id)");
}
if (!jobColumns.includes('user_id')) {
  db.exec("ALTER TABLE jobs ADD COLUMN user_id INTEGER REFERENCES users(id)");
}
if (!jobColumns.includes('address')) {
  db.exec("ALTER TABLE jobs ADD COLUMN address TEXT");
}
if (!jobColumns.includes('amount')) {
  db.exec("ALTER TABLE jobs ADD COLUMN amount REAL");
}

// Migration: add job_id to invoices for linking
const invoiceColumns = db.prepare("PRAGMA table_info(invoices)").all().map(c => c.name);
if (!invoiceColumns.includes('job_id')) {
  db.exec("ALTER TABLE invoices ADD COLUMN job_id TEXT");
}
if (!invoiceColumns.includes('user_id')) {
  db.exec("ALTER TABLE invoices ADD COLUMN user_id INTEGER REFERENCES users(id)");
}

// Migration: add status column to schedule_requests
const schedColumns = db.prepare("PRAGMA table_info(schedule_requests)").all().map(c => c.name);
if (!schedColumns.includes('status')) {
  db.exec("ALTER TABLE schedule_requests ADD COLUMN status TEXT NOT NULL DEFAULT 'Pending'");
}

// Migration: add payment tracking columns to invoices
const invPayColumns = db.prepare("PRAGMA table_info(invoices)").all().map(c => c.name);
if (!invPayColumns.includes('paid_date')) {
  db.exec("ALTER TABLE invoices ADD COLUMN paid_date TEXT");
}
if (!invPayColumns.includes('payment_method')) {
  db.exec("ALTER TABLE invoices ADD COLUMN payment_method TEXT");
}
if (!invPayColumns.includes('transaction_id')) {
  db.exec("ALTER TABLE invoices ADD COLUMN transaction_id TEXT");
}

// Migration: rebuild order_items to use ON DELETE SET NULL for inventory_id FK
const oiSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='order_items'").get();
if (oiSchema && oiSchema.sql && !oiSchema.sql.includes('ON DELETE SET NULL')) {
  db.pragma('foreign_keys = OFF');
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      inventory_id INTEGER REFERENCES supplier_inventory(id) ON DELETE SET NULL,
      item_name TEXT NOT NULL,
      unit TEXT,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1
    );
    INSERT INTO order_items_new SELECT * FROM order_items;
    DROP TABLE order_items;
    ALTER TABLE order_items_new RENAME TO order_items;
  `);
  db.pragma('foreign_keys = ON');
}

// Migration: rebuild orders table to match expected schema (subtotal, tax, total, etc.)
const ordColumns = db.prepare("PRAGMA table_info(orders)").all().map(c => c.name);
if (!ordColumns.includes('subtotal')) {
  db.pragma('foreign_keys = OFF');
  db.exec(`
    CREATE TABLE orders_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'Pending',
      subtotal REAL NOT NULL DEFAULT 0,
      tax REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      payment_method TEXT,
      transaction_id TEXT,
      paid_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO orders_new (id, user_id, status, total, created_at, updated_at)
      SELECT id, COALESCE(user_id, 0), COALESCE(status, 'Pending'), COALESCE(amount, 0), COALESCE(date, datetime('now')), datetime('now')
      FROM orders;
    DROP TABLE orders;
    ALTER TABLE orders_new RENAME TO orders;
  `);
  db.pragma('foreign_keys = ON');
}

// Migration: add guest checkout columns to orders
const ordColsGuest = db.prepare("PRAGMA table_info(orders)").all().map(c => c.name);
if (!ordColsGuest.includes('guest_name')) {
  db.exec("ALTER TABLE orders ADD COLUMN guest_name TEXT");
}
if (!ordColsGuest.includes('guest_email')) {
  db.exec("ALTER TABLE orders ADD COLUMN guest_email TEXT");
}

// Migration: make orders.user_id nullable (rebuild if NOT NULL)
const ordSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='orders'").get();
if (ordSchema && ordSchema.sql.includes('user_id INTEGER NOT NULL')) {
  db.pragma('foreign_keys = OFF');
  const cols = db.prepare("PRAGMA table_info(orders)").all().map(c => c.name);
  const colList = cols.join(', ');
  db.exec(`
    CREATE TABLE orders_nullable (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      guest_name TEXT,
      guest_email TEXT,
      status TEXT NOT NULL DEFAULT 'Pending',
      subtotal REAL NOT NULL DEFAULT 0,
      tax REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      payment_method TEXT,
      transaction_id TEXT,
      paid_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    INSERT INTO orders_nullable (${colList})
      SELECT ${colList} FROM orders;
    DROP TABLE orders;
    ALTER TABLE orders_nullable RENAME TO orders;
  `);
  db.pragma('foreign_keys = ON');
}

// Migration: add coupons table
db.exec(`
  CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL DEFAULT 'percentage',
    value REAL NOT NULL,
    min_order REAL NOT NULL DEFAULT 0,
    max_uses INTEGER,
    uses_count INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Migration: add delivery, installation, coupon columns to orders
const ordFeatureColumns = db.prepare("PRAGMA table_info(orders)").all().map(c => c.name);
if (!ordFeatureColumns.includes('delivery_fee')) {
  db.exec("ALTER TABLE orders ADD COLUMN delivery_fee REAL NOT NULL DEFAULT 0");
}
if (!ordFeatureColumns.includes('installation_fee')) {
  db.exec("ALTER TABLE orders ADD COLUMN installation_fee REAL NOT NULL DEFAULT 0");
}
if (!ordFeatureColumns.includes('delivery_address')) {
  db.exec("ALTER TABLE orders ADD COLUMN delivery_address TEXT");
}
if (!ordFeatureColumns.includes('coupon_code')) {
  db.exec("ALTER TABLE orders ADD COLUMN coupon_code TEXT");
}
if (!ordFeatureColumns.includes('discount')) {
  db.exec("ALTER TABLE orders ADD COLUMN discount REAL NOT NULL DEFAULT 0");
}

// Migration: add announcements table
db.exec(`
  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT NOT NULL,
    link_text TEXT,
    link_url TEXT,
    bg_color TEXT NOT NULL DEFAULT '#166534',
    text_color TEXT NOT NULL DEFAULT '#ffffff',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Migration: add notifications table
db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'promo',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Migration: add notification_queue table for email/SMS
db.exec(`
  CREATE TABLE IF NOT EXISTS notification_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,
    subject TEXT,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    sent_at TEXT
  )
`);

// Migration: add products catalog table
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    image TEXT,
    unit TEXT,
    retail_price REAL,
    category_id INTEGER REFERENCES taxonomy(id) ON DELETE SET NULL,
    on_sale INTEGER NOT NULL DEFAULT 0,
    sale_price REAL,
    available INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Migration: add sale_percentage column to products
const prodColumns = db.prepare("PRAGMA table_info(products)").all().map(c => c.name);
if (!prodColumns.includes('sale_percentage')) {
  db.exec("ALTER TABLE products ADD COLUMN sale_percentage REAL");
}

// Migration: add product_sources table linking products to suppliers
db.exec(`
  CREATE TABLE IF NOT EXISTS product_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    inventory_id INTEGER REFERENCES supplier_inventory(id) ON DELETE SET NULL,
    unit_cost REAL,
    priority INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(product_id, supplier_id)
  )
`);

// Migration: add product_id column to order_items for catalog product reference
const oiCols = db.prepare("PRAGMA table_info(order_items)").all().map(c => c.name);
if (!oiCols.includes('product_id')) {
  db.exec("ALTER TABLE order_items ADD COLUMN product_id INTEGER REFERENCES products(id) ON DELETE SET NULL");
}

// Seed default hero carousel slides if table is empty
const slideCount = db.prepare('SELECT COUNT(*) as cnt FROM hero_slides').get();
if (slideCount.cnt === 0) {
  const insertSlide = db.prepare(`
    INSERT INTO hero_slides (image, badge, headline, subtext, cta_label, cta_link, cta2_label, cta2_link, sort_order, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);
  const defaultSlides = [
    {
      image: '/uploads/carousel/10_traditional-after.png',
      badge: 'Residential Landscapes',
      headline: 'Transform Your Backyard Into a Living Masterpiece',
      subtext: 'Custom design, expert installation, and reliable delivery for Central Florida homes.',
      cta_label: 'Get Free Quote', cta_link: '/quote',
      cta2_label: 'View Portfolio', cta2_link: '/portfolio',
    },
    {
      image: '/uploads/carousel/2_backyard-after.png',
      badge: 'Commercial Properties',
      headline: 'Professional Grounds That Make a Lasting Impression',
      subtext: 'Comprehensive commercial landscaping for offices, retail centers, and mixed-use developments.',
      cta_label: 'Request a Quote', cta_link: '/quote',
      cta2_label: 'Our Services', cta2_link: '/services',
    },
    {
      image: '/uploads/carousel/4_commercial-after.png',
      badge: 'Design & Build',
      headline: 'From Concept to Completion — One Trusted Partner',
      subtext: 'Full-service landscape architecture, hardscaping, and planting by our expert team.',
      cta_label: 'Start Your Project', cta_link: '/quote',
      cta2_label: 'See Our Work', cta2_link: '/about',
    },
    {
      image: '/uploads/carousel/6_midcentury-after.png',
      badge: 'Delivery & Installation',
      headline: 'We Deliver and Install — You Enjoy the Results',
      subtext: 'From plants and trees to sod and materials, we handle delivery and professional installation across Central Florida.',
      cta_label: 'Schedule Service', cta_link: '/quote',
      cta2_label: 'Learn More', cta2_link: '/services',
    },
  ];
  for (let i = 0; i < defaultSlides.length; i++) {
    const s = defaultSlides[i];
    insertSlide.run(s.image, s.badge, s.headline, s.subtext, s.cta_label, s.cta_link, s.cta2_label, s.cta2_link, i);
  }
}

// Migration: add related_items table for cross-sell recommendations
db.exec(`
  CREATE TABLE IF NOT EXISTS related_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_item_name TEXT NOT NULL,
    source_category_id INTEGER NOT NULL REFERENCES taxonomy(id) ON DELETE CASCADE,
    related_item_name TEXT NOT NULL,
    related_category_id INTEGER NOT NULL REFERENCES taxonomy(id) ON DELETE CASCADE,
    label TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Migration: update hero slide CTA links to /quote
db.prepare("UPDATE hero_slides SET cta_link = '/quote' WHERE cta_link = '/contact'").run();
db.prepare("UPDATE hero_slides SET cta_link = '/quote' WHERE cta_link = '/login'").run();
db.prepare("UPDATE hero_slides SET cta_link = '/quote' WHERE cta_link LIKE '/portal%'").run();
db.prepare("UPDATE hero_slides SET cta_link = '/quote' WHERE cta_link LIKE '/signin%'").run();
db.prepare("UPDATE hero_slides SET cta_link = '/quote' WHERE cta_link IS NULL OR cta_link = ''").run();
db.prepare("UPDATE hero_slides SET cta_label = 'Get Free Quote' WHERE cta_label = 'Get Free Consultation'").run();

// Migration: keep only the four offered services
const allowedServices = [
  'Landscape Delivery & Installation',
  'Landscape Design',
  'Tree & Shrub Care',
  'Seasonal Cleanup',
];
const existingServices = db.prepare('SELECT name FROM services').all().map(r => r.name);
const toRemove = existingServices.filter(n => !allowedServices.includes(n));
if (toRemove.length > 0) {
  const del = db.prepare('DELETE FROM services WHERE name = ?');
  for (const name of toRemove) del.run(name);
}

// Migration: seed default email notification settings if not present
const emailSettings = [
  ['contact_notify_email', 'admin@urbanpalmlandscaping.com'],
  ['ses_from_email', 'no-reply@urbanpalmlandscaping.com'],
];
for (const [key, value] of emailSettings) {
  db.prepare(
    "INSERT OR IGNORE INTO site_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))"
  ).run(key, value);
}

export default db;
