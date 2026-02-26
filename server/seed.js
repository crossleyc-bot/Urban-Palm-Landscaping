import db from './db.js';
import bcrypt from 'bcryptjs';

// Temporarily disable FK checks so we can clear and reseed with known IDs
db.pragma('foreign_keys = OFF');

db.exec(`
  DELETE FROM supplier_inventory;
  DELETE FROM suppliers;
  DELETE FROM schedule_requests;
  DELETE FROM quote_requests;
  DELETE FROM contact_messages;
  DELETE FROM invoices;
  DELETE FROM employees;
  DELETE FROM jobs;
  DELETE FROM orders;
  DELETE FROM testimonials;
  DELETE FROM team_members;
  DELETE FROM services;
  DELETE FROM users;
  DELETE FROM sqlite_sequence;
`);

db.pragma('foreign_keys = ON');

// Seed users
const hash = bcrypt.hashSync('password123', 10);
const insertUser = db.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)');
insertUser.run('admin@urbanpalmlandscaping.com', hash, 'Admin User', 'admin');
insertUser.run('customer@example.com', hash, 'Customer', 'customer');

// Seed services
const insertService = db.prepare('INSERT INTO services (name, description, price, icon) VALUES (?, ?, ?, ?)');
const services = [
  ['Landscape Delivery & Installation', 'We deliver and install sod, plants, trees, mulch, and landscape materials across Central Florida. Our crews handle everything from site prep to final placement so your property is transformed with zero hassle.', 'From $250', '🌿'],
  ['Landscape Design', 'Custom landscape architecture tailored to your property and lifestyle.', 'From $500', '🎨'],
  ['Tree & Shrub Care', 'Professional pruning, trimming, and health assessments for all your plants.', 'From $150', '🌳'],
  ['Irrigation Systems', 'Design, installation, and repair of efficient irrigation and sprinkler systems.', 'From $300', '💧'],
  ['Hardscaping', 'Patios, walkways, retaining walls, and outdoor living spaces built to last.', 'From $1,000', '🧱'],
  ['Seasonal Cleanup', 'Spring and fall cleanup services including leaf removal and bed preparation.', 'From $200', '🍂'],
];
for (const s of services) insertService.run(...s);

// Seed team members
const insertTeam = db.prepare('INSERT INTO team_members (name, role, experience, image) VALUES (?, ?, ?, ?)');
const team = [
  ['Andrea Rusch', 'Founder & Lead Designer', '15 years', '/Andrea.png'],
  ['Chad Crossley', 'Senior Landscaper', '8 years', '/Chad.png'],
];
for (const t of team) insertTeam.run(...t);

// Seed testimonials
const insertTestimonial = db.prepare('INSERT INTO testimonials (name, text, rating) VALUES (?, ?, ?)');
const testimonials = [
  ['Sarah Mitchell', 'Urban Palm completely transformed our backyard. The design team listened to every detail and delivered beyond expectations.', 5],
  ['David Chen', 'Reliable, professional, and creative. They delivered and installed everything exactly as promised — our yard looks incredible.', 5],
  ['Rachel Torres', 'The hardscaping work they did on our patio was outstanding. Great craftsmanship and fair pricing.', 4],
];
for (const t of testimonials) insertTestimonial.run(...t);

// Seed orders
const insertOrder = db.prepare('INSERT INTO orders (order_id, user_id, service, date, status, amount) VALUES (?, ?, ?, ?, ?, ?)');
const orders = [
  ['ORD-001', 2, 'Landscape Delivery & Installation', '2026-02-10', 'Completed', 350],
  ['ORD-002', 2, 'Tree & Shrub Care', '2026-02-14', 'In Progress', 200],
  ['ORD-003', 2, 'Irrigation Systems', '2026-02-20', 'Scheduled', 450],
  ['ORD-004', 2, 'Landscape Design', '2026-03-01', 'Pending Quote', null],
];
for (const o of orders) insertOrder.run(...o);

// Seed jobs
const insertJob = db.prepare('INSERT INTO jobs (job_id, client, service, assignee, date, status) VALUES (?, ?, ?, ?, ?, ?)');
const jobs = [
  ['JOB-001', 'Sarah Mitchell', 'Landscape Delivery & Installation', 'James Okoro', '2026-02-16', 'In Progress'],
  ['JOB-002', 'David Chen', 'Tree & Shrub Care', 'James Okoro', '2026-02-17', 'Scheduled'],
  ['JOB-003', 'Rachel Torres', 'Hardscaping', 'Carlos Rivera', '2026-02-18', 'Scheduled'],
  ['JOB-004', 'Mark Johnson', 'Irrigation Systems', 'Aisha Patel', '2026-02-19', 'Scheduled'],
  ['JOB-005', 'Lisa Wang', 'Seasonal Cleanup', 'James Okoro', '2026-02-15', 'Completed'],
];
for (const j of jobs) insertJob.run(...j);

// Seed employees
const insertEmployee = db.prepare('INSERT INTO employees (emp_id, name, role, phone, email, status) VALUES (?, ?, ?, ?, ?, ?)');
const employees = [
  ['EMP-001', 'Andrea Rusch', 'Lead Designer', '(555) 100-1001', 'andrea@urbanpalmlandscaping.com', 'Active'],
  ['EMP-003', 'Chad Crossley', 'Senior Landscaper', '(555) 100-1003', 'chad@urbanpalmlandscaping.com', 'Active'],
  ['EMP-005', 'Tom Bradley', 'Junior Landscaper', '(555) 100-1005', 'tom@urbanpalmlandscaping.com', 'On Leave'],
];
for (const e of employees) insertEmployee.run(...e);

// Seed invoices
const insertInvoice = db.prepare('INSERT INTO invoices (inv_id, client, amount, date, due_date, status) VALUES (?, ?, ?, ?, ?, ?)');
const invoices = [
  ['INV-001', 'Sarah Mitchell', 75, '2026-02-10', '2026-03-10', 'Paid'],
  ['INV-002', 'David Chen', 200, '2026-02-14', '2026-03-14', 'Pending'],
  ['INV-003', 'Rachel Torres', 2500, '2026-01-20', '2026-02-20', 'Overdue'],
  ['INV-004', 'Mark Johnson', 450, '2026-02-15', '2026-03-15', 'Pending'],
  ['INV-005', 'Lisa Wang', 200, '2026-02-15', '2026-03-15', 'Paid'],
];
for (const i of invoices) insertInvoice.run(...i);

// Seed suppliers
const insertSupplier = db.prepare('INSERT INTO suppliers (name, contact_name, email, phone, address, website, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
const suppliers = [
  ['Green World Nursery', 'Maria Lopez', 'maria@greenworldnursery.com', '(407) 555-0101', '1200 Plant Ave, Orlando, FL 32803', 'https://greenworldnursery.com', 'Net 30 terms. Bulk discount on orders over $2,000.', 'Active'],
  ['SunState Sod Farm', 'Jake Turner', 'jake@sunstatesod.com', '(407) 555-0202', '8400 Sod Rd, Sanford, FL 32771', 'https://sunstatesod.com', 'Same-day delivery available. Min order 1 pallet.', 'Active'],
  ['Rock Solid Supply', 'Diane Park', 'diane@rocksolidsupply.com', '(321) 555-0303', '560 Quarry Ln, Clermont, FL 34711', null, 'Pavers, stone, gravel. Delivery Tue/Thu only.', 'Active'],
];
for (const s of suppliers) insertSupplier.run(...s);

// Seed supplier inventory
const insertInventory = db.prepare('INSERT INTO supplier_inventory (supplier_id, item_name, sku, category, unit, unit_cost, qty_available, reorder_point, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
const inventory = [
  [1, 'Foxtail Palm (10 gal)', 'GW-FP10', 'Trees', 'each', 85.00, 24, 5, null],
  [1, 'Croton Gold Dust (3 gal)', 'GW-CG3', 'Plants', 'each', 12.50, 60, 10, null],
  [1, 'Jasmine Confederate (1 gal)', 'GW-JC1', 'Plants', 'each', 8.00, 120, 20, 'Fragrant, popular for hedges'],
  [1, 'Premium Mulch - Brown', 'GW-MBR', 'Mulch', 'cu yd', 35.00, 40, 10, null],
  [2, 'Floratam St. Augustine Sod', 'SS-FSA', 'Sod', 'pallet', 185.00, 30, 5, '500 sq ft per pallet'],
  [2, 'Bermuda Celebration Sod', 'SS-BCS', 'Sod', 'pallet', 210.00, 15, 5, 'Full sun recommended'],
  [2, 'Zoysia Empire Sod', 'SS-ZES', 'Sod', 'pallet', 225.00, 8, 3, 'Shade tolerant'],
  [3, 'Travertine Pavers 12x12', 'RS-TP12', 'Pavers', 'sq ft', 4.50, 2000, 200, null],
  [3, 'River Rock (1-3 in)', 'RS-RR3', 'Stone', 'ton', 65.00, 12, 3, null],
  [3, 'Retaining Wall Block', 'RS-RWB', 'Stone', 'each', 3.25, 500, 100, null],
];
for (const i of inventory) insertInventory.run(...i);

console.log('Database seeded successfully.');
