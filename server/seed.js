import db from './db.js';
import bcrypt from 'bcryptjs';

// Clear existing data
db.exec(`
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
`);

// Seed users
const hash = bcrypt.hashSync('password123', 10);
const insertUser = db.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)');
insertUser.run('admin@urbanpalmlandscaping.com', hash, 'Admin User', 'admin');
insertUser.run('customer@example.com', hash, 'Customer', 'customer');

// Seed services
const insertService = db.prepare('INSERT INTO services (name, description, price, icon) VALUES (?, ?, ?, ?)');
const services = [
  ['Lawn Maintenance', 'Regular mowing, edging, and lawn health management to keep your yard pristine.', 'From $75/visit', '🌿'],
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
  ['David Chen', 'Reliable, professional, and creative. Our lawn has never looked better since we started their maintenance plan.', 5],
  ['Rachel Torres', 'The hardscaping work they did on our patio was outstanding. Great craftsmanship and fair pricing.', 4],
];
for (const t of testimonials) insertTestimonial.run(...t);

// Seed orders
const insertOrder = db.prepare('INSERT INTO orders (order_id, user_id, service, date, status, amount) VALUES (?, ?, ?, ?, ?, ?)');
const orders = [
  ['ORD-001', 2, 'Lawn Maintenance', '2026-02-10', 'Completed', 75],
  ['ORD-002', 2, 'Tree & Shrub Care', '2026-02-14', 'In Progress', 200],
  ['ORD-003', 2, 'Irrigation Systems', '2026-02-20', 'Scheduled', 450],
  ['ORD-004', 2, 'Landscape Design', '2026-03-01', 'Pending Quote', null],
];
for (const o of orders) insertOrder.run(...o);

// Seed jobs
const insertJob = db.prepare('INSERT INTO jobs (job_id, client, service, assignee, date, status) VALUES (?, ?, ?, ?, ?, ?)');
const jobs = [
  ['JOB-001', 'Sarah Mitchell', 'Lawn Maintenance', 'James Okoro', '2026-02-16', 'In Progress'],
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

console.log('Database seeded successfully.');
