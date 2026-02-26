import db from './db.js';
import bcrypt from 'bcryptjs';

// Temporarily disable FK checks so we can clear and reseed with known IDs
db.pragma('foreign_keys = OFF');

db.exec(`
  DELETE FROM job_openings;
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

// ─── Users ──────────────────────────────────────────────────────────────────
const hash = bcrypt.hashSync('password123', 10);
const insertUser = db.prepare('INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)');
insertUser.run('admin@urbanpalmlandscaping.com', hash, 'Admin User', 'admin');
insertUser.run('customer@example.com', hash, 'Sarah Mitchell', 'customer');
insertUser.run('david.chen@email.com', hash, 'David Chen', 'customer');
insertUser.run('rachel.torres@email.com', hash, 'Rachel Torres', 'customer');
insertUser.run('mark.johnson@email.com', hash, 'Mark Johnson', 'customer');
insertUser.run('lisa.wang@email.com', hash, 'Lisa Wang', 'customer');
insertUser.run('james.wilson@email.com', hash, 'James Wilson', 'customer');
insertUser.run('emily.davis@email.com', hash, 'Emily Davis', 'customer');

// ─── Services ───────────────────────────────────────────────────────────────
const insertService = db.prepare('INSERT INTO services (name, description, price, icon) VALUES (?, ?, ?, ?)');
const services = [
  ['Landscape Delivery & Installation', 'We deliver and install sod, plants, trees, mulch, and landscape materials across Central Florida. Our crews handle everything from site prep to final placement so your property is transformed with zero hassle.', 'From $250', '🌿'],
  ['Landscape Design', 'Our certified landscape architects create custom plans that blend aesthetics with functionality. We consider your lifestyle, climate, soil conditions, and budget to craft a design you will love for years to come.', 'From $500', '🎨'],
  ['Tree & Shrub Care', 'Keep your trees and shrubs healthy and beautiful with professional pruning, trimming, disease diagnosis, fertilization, and preventive care programs tailored to Central Florida species.', 'From $150', '🌳'],
  ['Irrigation Systems', 'From smart controller installations to full sprinkler system design and repair, we build water-efficient irrigation solutions that keep your landscape thriving while cutting your water bill.', 'From $300', '💧'],
  ['Hardscaping', 'Transform your outdoor living space with custom patios, walkways, retaining walls, fire pits, outdoor kitchens, and decorative stonework. We use premium materials built to withstand Florida weather.', 'From $1,000', '🧱'],
  ['Seasonal Cleanup', 'Our spring and fall cleanup services include leaf removal, bed edging, mulch refresh, dead plant removal, and general property tidying to keep your landscape looking sharp year-round.', 'From $200', '🍂'],
  ['Lawn Maintenance', 'Weekly and bi-weekly lawn care including mowing, edging, blowing, and weed control. We keep your turf green and healthy through every season with customized treatment programs.', 'From $120/mo', '🏡'],
  ['Outdoor Lighting', 'Architectural and landscape lighting design and installation to highlight your property at night. LED path lights, uplights, deck lighting, and security lighting with smart controls.', 'From $400', '💡'],
];
for (const s of services) insertService.run(...s);

// ─── Team Members ───────────────────────────────────────────────────────────
const insertTeam = db.prepare('INSERT INTO team_members (name, role, experience, image) VALUES (?, ?, ?, ?)');
const team = [
  ['Andrea Rusch', 'Founder & Lead Designer', '15 years', '/Andrea.png'],
  ['Chad Crossley', 'Senior Landscaper', '8 years', '/Chad.png'],
];
for (const t of team) insertTeam.run(...t);

// ─── Testimonials ───────────────────────────────────────────────────────────
const insertTestimonial = db.prepare('INSERT INTO testimonials (name, text, rating) VALUES (?, ?, ?)');
const testimonials = [
  ['Sarah Mitchell', 'Urban Palm completely transformed our backyard. The design team listened to every detail and delivered beyond expectations. Our neighbors can\'t stop complimenting the new patio!', 5],
  ['David Chen', 'Reliable, professional, and creative. They delivered and installed everything exactly as promised — our yard looks incredible. Would recommend to anyone in Central Florida.', 5],
  ['Rachel Torres', 'The hardscaping work they did on our patio was outstanding. Great craftsmanship and fair pricing. They even finished a day ahead of schedule.', 4],
  ['Mark Johnson', 'Had them install a new irrigation system and it has already cut our water bill by 30%. The smart controller makes adjustments automatically based on weather.', 5],
  ['Lisa Wang', 'The seasonal cleanup crew was thorough and efficient. Our property went from overgrown to magazine-ready in a single afternoon. Signed up for recurring service!', 5],
  ['James Wilson', 'Andrea\'s landscape design was exactly what we envisioned. She took our vague ideas and turned them into a detailed plan that our HOA approved on the first try.', 5],
  ['Emily Davis', 'We hired Urban Palm for outdoor lighting and the difference is night and day — literally. Our home feels so much more inviting and secure now.', 4],
  ['Carlos Rivera', 'Best sod installation we\'ve had. Previous company left gaps everywhere, but Urban Palm\'s crew was meticulous. Our Floratam lawn looks perfect six months later.', 5],
];
for (const t of testimonials) insertTestimonial.run(...t);

// ─── Employees ──────────────────────────────────────────────────────────────
const insertEmployee = db.prepare('INSERT INTO employees (emp_id, name, role, phone, email, status, show_on_website) VALUES (?, ?, ?, ?, ?, ?, ?)');
const employees = [
  ['EMP-001', 'Andrea Rusch', 'Lead Designer', '(321) 231-2094', 'andrea@urbanpalmlandscaping.com', 'Active', 1],
  ['EMP-002', 'Chad Crossley', 'Senior Landscaper', '(321) 231-2095', 'chad@urbanpalmlandscaping.com', 'Active', 1],
  ['EMP-003', 'James Okoro', 'Crew Lead - Installation', '(321) 231-2096', 'james@urbanpalmlandscaping.com', 'Active', 1],
  ['EMP-004', 'Carlos Rivera', 'Crew Lead - Hardscaping', '(321) 231-2097', 'carlos@urbanpalmlandscaping.com', 'Active', 1],
  ['EMP-005', 'Aisha Patel', 'Irrigation Specialist', '(321) 231-2098', 'aisha@urbanpalmlandscaping.com', 'Active', 1],
  ['EMP-006', 'Tom Bradley', 'Junior Landscaper', '(321) 231-2099', 'tom@urbanpalmlandscaping.com', 'On Leave', 0],
  ['EMP-007', 'Maria Santos', 'Landscape Technician', '(321) 231-2100', 'maria@urbanpalmlandscaping.com', 'Active', 0],
  ['EMP-008', 'Derek Hall', 'Equipment Operator', '(321) 231-2101', 'derek@urbanpalmlandscaping.com', 'Active', 0],
  ['EMP-009', 'Samantha Lee', 'Office Manager', '(321) 231-2102', 'samantha@urbanpalmlandscaping.com', 'Active', 1],
  ['EMP-010', 'Kevin Williams', 'Seasonal Technician', '(321) 231-2103', 'kevin@urbanpalmlandscaping.com', 'Active', 0],
];
for (const e of employees) insertEmployee.run(...e);

// ─── Orders ─────────────────────────────────────────────────────────────────
const insertOrder = db.prepare('INSERT INTO orders (order_id, user_id, service, date, status, amount) VALUES (?, ?, ?, ?, ?, ?)');
const orders = [
  ['ORD-001', 2, 'Landscape Delivery & Installation', '2026-01-15', 'Completed', 1250],
  ['ORD-002', 2, 'Seasonal Cleanup', '2026-02-01', 'Completed', 200],
  ['ORD-003', 3, 'Tree & Shrub Care', '2026-02-05', 'Completed', 375],
  ['ORD-004', 3, 'Landscape Design', '2026-02-10', 'Completed', 750],
  ['ORD-005', 4, 'Hardscaping', '2026-02-12', 'In Progress', 4500],
  ['ORD-006', 5, 'Irrigation Systems', '2026-02-14', 'In Progress', 850],
  ['ORD-007', 5, 'Lawn Maintenance', '2026-02-15', 'Scheduled', 120],
  ['ORD-008', 6, 'Landscape Delivery & Installation', '2026-02-18', 'Scheduled', 680],
  ['ORD-009', 7, 'Outdoor Lighting', '2026-02-20', 'Scheduled', 1200],
  ['ORD-010', 8, 'Landscape Design', '2026-02-25', 'Pending Quote', null],
  ['ORD-011', 2, 'Hardscaping', '2026-03-01', 'Pending Quote', null],
  ['ORD-012', 4, 'Irrigation Systems', '2026-03-05', 'Scheduled', 450],
];
for (const o of orders) insertOrder.run(...o);

// ─── Jobs ───────────────────────────────────────────────────────────────────
const insertJob = db.prepare('INSERT INTO jobs (job_id, client, service, assignee, date, status) VALUES (?, ?, ?, ?, ?, ?)');
const jobs = [
  ['JOB-001', 'Sarah Mitchell', 'Landscape Delivery & Installation', 'James Okoro', '2026-01-15', 'Completed'],
  ['JOB-002', 'Sarah Mitchell', 'Seasonal Cleanup', 'Kevin Williams', '2026-02-01', 'Completed'],
  ['JOB-003', 'David Chen', 'Tree & Shrub Care', 'Chad Crossley', '2026-02-05', 'Completed'],
  ['JOB-004', 'David Chen', 'Landscape Design', 'Andrea Rusch', '2026-02-10', 'Completed'],
  ['JOB-005', 'Rachel Torres', 'Hardscaping', 'Carlos Rivera', '2026-02-12', 'In Progress'],
  ['JOB-006', 'Mark Johnson', 'Irrigation Systems', 'Aisha Patel', '2026-02-14', 'In Progress'],
  ['JOB-007', 'Mark Johnson', 'Lawn Maintenance', 'Tom Bradley', '2026-02-15', 'Scheduled'],
  ['JOB-008', 'Lisa Wang', 'Landscape Delivery & Installation', 'James Okoro', '2026-02-18', 'Scheduled'],
  ['JOB-009', 'James Wilson', 'Outdoor Lighting', 'Derek Hall', '2026-02-20', 'Scheduled'],
  ['JOB-010', 'Emily Davis', 'Landscape Design', 'Andrea Rusch', '2026-02-25', 'Scheduled'],
  ['JOB-011', 'Sarah Mitchell', 'Hardscaping', 'Carlos Rivera', '2026-03-01', 'Scheduled'],
  ['JOB-012', 'Rachel Torres', 'Irrigation Systems', 'Aisha Patel', '2026-03-05', 'Scheduled'],
  ['JOB-013', 'Lisa Wang', 'Seasonal Cleanup', 'Maria Santos', '2026-02-15', 'Completed'],
  ['JOB-014', 'David Chen', 'Lawn Maintenance', 'Kevin Williams', '2026-02-22', 'Scheduled'],
];
for (const j of jobs) insertJob.run(...j);

// ─── Invoices ───────────────────────────────────────────────────────────────
const insertInvoice = db.prepare('INSERT INTO invoices (inv_id, client, amount, date, due_date, status) VALUES (?, ?, ?, ?, ?, ?)');
const invoices = [
  ['INV-001', 'Sarah Mitchell', 1250, '2026-01-15', '2026-02-15', 'Paid'],
  ['INV-002', 'Sarah Mitchell', 200, '2026-02-01', '2026-03-01', 'Paid'],
  ['INV-003', 'David Chen', 375, '2026-02-05', '2026-03-05', 'Paid'],
  ['INV-004', 'David Chen', 750, '2026-02-10', '2026-03-10', 'Pending'],
  ['INV-005', 'Rachel Torres', 2250, '2026-02-12', '2026-03-12', 'Pending'],
  ['INV-006', 'Rachel Torres', 2500, '2026-01-20', '2026-02-20', 'Overdue'],
  ['INV-007', 'Mark Johnson', 850, '2026-02-14', '2026-03-14', 'Pending'],
  ['INV-008', 'Mark Johnson', 120, '2026-02-15', '2026-03-15', 'Pending'],
  ['INV-009', 'Lisa Wang', 680, '2026-02-18', '2026-03-18', 'Pending'],
  ['INV-010', 'Lisa Wang', 200, '2026-02-15', '2026-03-15', 'Paid'],
  ['INV-011', 'James Wilson', 1200, '2026-02-20', '2026-03-20', 'Pending'],
];
for (const i of invoices) insertInvoice.run(...i);

// ─── Contact Messages ───────────────────────────────────────────────────────
const insertContact = db.prepare('INSERT INTO contact_messages (name, email, phone, service, message, status, admin_reply, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
const contacts = [
  ['Tom Nguyen', 'tom.nguyen@email.com', '(407) 555-1234', 'Landscape Design', 'Hi, we just bought a new home in Lake Nona and the yard is completely bare. Looking for a full landscape design and installation. Could someone come out for a consultation?', 'Replied', 'Hi Tom! We would love to help with your new home. I have scheduled a free on-site consultation for next Tuesday at 10am. Andrea will walk the property with you. Looking forward to it!', '2026-02-20 09:15:00'],
  ['Jennifer Park', 'jpark@email.com', '(321) 555-5678', 'Irrigation Systems', 'Our sprinkler system is over 10 years old and we keep getting dry patches. Need someone to assess and possibly replace the whole system. What would that cost roughly?', 'Replied', 'Hi Jennifer, thanks for reaching out. A full assessment is $75 which gets credited toward any work. Replacement systems typically run $800-2,500 depending on property size and zones. I will have Aisha call you to schedule.', '2026-02-21 14:30:00'],
  ['Robert Kim', 'robert.kim@email.com', null, 'Hardscaping', 'Interested in getting a quote for a paver patio, roughly 400 sq ft, in our backyard in Winter Park. Also considering a small retaining wall. Available weekdays after 3pm.', 'New', null, '2026-02-24 11:45:00'],
  ['Amanda Foster', 'amanda.foster@email.com', '(407) 555-9012', 'Tree & Shrub Care', 'We have two large oak trees that need trimming — one is growing over the roof and the other is leaning toward the fence. Can you send someone out to take a look?', 'New', null, '2026-02-25 08:20:00'],
  ['Steve Martinez', 'steve.m@email.com', '(321) 555-3456', 'Seasonal Cleanup', 'Need a one-time cleanup for our rental property in Clermont before new tenants move in on March 15. Overgrown beds, dead plants, general mess. Please send a quote ASAP.', 'New', null, '2026-02-26 10:00:00'],
  ['Lisa Patel', 'lisa.patel@email.com', null, 'Outdoor Lighting', 'We love the work you did for our neighbors (the Wilsons on Elm Street). Would like to discuss a similar outdoor lighting setup for our front yard and walkway.', 'New', null, '2026-02-26 13:15:00'],
];
for (const c of contacts) insertContact.run(...c);

// ─── Quote Requests ─────────────────────────────────────────────────────────
const insertQuote = db.prepare('INSERT INTO quote_requests (user_id, service, property_type, timeline, budget, details, address, status, admin_reply, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
const quotes = [
  [3, 'Hardscaping', 'Residential', '1-3 months', '$5,000 - $10,000', 'Looking to build a paver patio (approx 500 sq ft) with a small fire pit area in the center. Would also like built-in seating along one edge. Prefer travertine pavers in a warm tone.', '4521 Oakwood Dr, Orlando, FL 32801', 'Pending', null, '2026-02-18 10:30:00'],
  [2, 'Landscape Design', 'Residential', 'ASAP', '$2,000 - $5,000', 'Want to redesign our front yard to improve curb appeal. Current grass is patchy, beds are overgrown. Want a clean, modern look with native Florida plants and fresh sod.', '892 Palm Ave, Winter Park, FL 32789', 'Approved', 'Hi Sarah! Great project. Andrea has reviewed the property photos and drafted a preliminary design. We will email you the concept this week with a detailed quote. Estimated cost is $3,200.', '2026-02-15 16:00:00'],
  [7, 'Irrigation Systems', 'Residential', '1-3 months', '$1,000 - $2,000', 'New construction home — need a full irrigation system installed for front and back yard. Approximately 0.25 acre lot. Would like smart controller capability and drip lines for garden beds.', '1150 Sorrento Hills Blvd, Sorrento, FL 32776', 'Pending', null, '2026-02-22 09:00:00'],
  [8, 'Landscape Delivery & Installation', 'Residential', 'Flexible', '$500 - $1,000', 'Need 3 pallets of St. Augustine sod delivered and installed. Back yard only, about 1,500 sq ft. Old grass was killed by chinch bugs and needs to be removed first.', '2200 Sunflower Ct, Ocoee, FL 34761', 'Pending', null, '2026-02-24 14:20:00'],
  [6, 'Outdoor Lighting', 'Residential', 'ASAP', '$1,000 - $2,000', 'Would like path lighting along our front walkway (about 60 ft) and uplighting on 4 palm trees. Also need a couple of security flood lights on the garage side. Prefer warm white LED.', '330 Magnolia Ln, Windermere, FL 34786', 'Approved', 'Hi Lisa! Derek reviewed your property and put together a lighting plan. We can do the full package for $1,450 including fixtures, wiring, and a smart timer. Available to install next week!', '2026-02-20 11:30:00'],
];
for (const q of quotes) insertQuote.run(...q);

// ─── Schedule Requests ──────────────────────────────────────────────────────
const insertSchedule = db.prepare('INSERT INTO schedule_requests (user_id, service, date, time, frequency, address, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
const scheduleRequests = [
  [2, 'Lawn Maintenance', '2026-03-01', '9:00 AM', 'Bi-weekly', '892 Palm Ave, Winter Park, FL 32789', 'Please mow, edge, and blow. We have a dog so please make sure the gate is closed when you leave.', '2026-02-20 08:00:00'],
  [5, 'Lawn Maintenance', '2026-03-03', '8:00 AM', 'Weekly', '7800 Lake Shore Dr, Sanford, FL 32771', 'Front and back yard. Skip the side yard along the fence. Prefer morning visits.', '2026-02-21 10:15:00'],
  [4, 'Seasonal Cleanup', '2026-03-10', '10:00 AM', 'One-time', '660 Cypress Creek Rd, Clermont, FL 34711', 'Spring cleanup — remove dead annuals, edge all beds, refresh mulch in front beds, trim hedges.', '2026-02-22 15:30:00'],
  [7, 'Tree & Shrub Care', '2026-03-15', '1:00 PM', 'One-time', '1150 Sorrento Hills Blvd, Sorrento, FL 32776', 'Two queen palms need fronds trimmed. One crape myrtle needs shaping. All in front yard.', '2026-02-24 09:45:00'],
  [8, 'Seasonal Cleanup', '2026-03-08', '9:00 AM', 'One-time', '2200 Sunflower Ct, Ocoee, FL 34761', 'Full spring cleanup before our sod installation. Remove dead grass, weeds, and debris from backyard.', '2026-02-25 11:00:00'],
  [3, 'Lawn Maintenance', '2026-03-05', '8:00 AM', 'Weekly', '4521 Oakwood Dr, Orlando, FL 32801', 'Weekly mowing and edging. We also have a small garden area — please do not mow over the stone border.', '2026-02-26 07:30:00'],
];
for (const s of scheduleRequests) insertSchedule.run(...s);

// ─── Suppliers ──────────────────────────────────────────────────────────────
const insertSupplier = db.prepare('INSERT INTO suppliers (name, contact_name, email, phone, address, website, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
const suppliers = [
  ['Green World Nursery', 'Maria Lopez', 'maria@greenworldnursery.com', '(407) 555-0101', '1200 Plant Ave, Orlando, FL 32803', 'https://greenworldnursery.com', 'Net 30 terms. Bulk discount on orders over $2,000. Best selection of native Florida plants.', 'Active'],
  ['SunState Sod Farm', 'Jake Turner', 'jake@sunstatesod.com', '(407) 555-0202', '8400 Sod Rd, Sanford, FL 32771', 'https://sunstatesod.com', 'Same-day delivery available. Min order 1 pallet. Quality guaranteed — will replace dead sod within 30 days.', 'Active'],
  ['Rock Solid Supply', 'Diane Park', 'diane@rocksolidsupply.com', '(321) 555-0303', '560 Quarry Ln, Clermont, FL 34711', null, 'Pavers, stone, gravel. Delivery Tue/Thu only. 5% contractor discount with account.', 'Active'],
  ['BrightPath Lighting', 'Kevin Marsh', 'kevin@brightpathlighting.com', '(407) 555-0404', '920 Edison Blvd, Orlando, FL 32806', 'https://brightpathlighting.com', 'LED landscape fixtures. Free shipping on orders over $500. 5-year warranty on all products.', 'Active'],
  ['Central FL Irrigation Depot', 'Nancy Cole', 'nancy@cflirrigation.com', '(321) 555-0505', '3100 Water Works Way, Sanford, FL 32773', 'https://cflirrigation.com', 'Full line of Rain Bird and Hunter products. Same-day pickup available. Net 15 terms.', 'Active'],
];
for (const s of suppliers) insertSupplier.run(...s);

// ─── Supplier Inventory ─────────────────────────────────────────────────────
const insertInventory = db.prepare('INSERT INTO supplier_inventory (supplier_id, item_name, sku, category, unit, unit_cost, qty_available, reorder_point, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
const inventory = [
  // Green World Nursery
  [1, 'Foxtail Palm (10 gal)', 'GW-FP10', 'Trees', 'each', 85.00, 24, 5, null],
  [1, 'Croton Gold Dust (3 gal)', 'GW-CG3', 'Plants', 'each', 12.50, 60, 10, null],
  [1, 'Jasmine Confederate (1 gal)', 'GW-JC1', 'Plants', 'each', 8.00, 120, 20, 'Fragrant, popular for hedges'],
  [1, 'Premium Mulch - Brown', 'GW-MBR', 'Mulch', 'cu yd', 35.00, 40, 10, null],
  [1, 'Pygmy Date Palm (7 gal)', 'GW-PDP7', 'Trees', 'each', 65.00, 18, 5, 'Great for accent planting'],
  [1, 'Ixora Nora Grant (3 gal)', 'GW-ING3', 'Plants', 'each', 14.00, 45, 10, 'Red blooms year-round'],
  [1, 'Bird of Paradise (7 gal)', 'GW-BOP7', 'Plants', 'each', 42.00, 12, 3, 'Tropical statement plant'],
  // SunState Sod Farm
  [2, 'Floratam St. Augustine Sod', 'SS-FSA', 'Sod', 'pallet', 185.00, 30, 5, '500 sq ft per pallet'],
  [2, 'Bermuda Celebration Sod', 'SS-BCS', 'Sod', 'pallet', 210.00, 15, 5, 'Full sun recommended'],
  [2, 'Zoysia Empire Sod', 'SS-ZES', 'Sod', 'pallet', 225.00, 8, 3, 'Shade tolerant'],
  [2, 'Bahia Argentine Sod', 'SS-BAS', 'Sod', 'pallet', 160.00, 20, 5, 'Drought tolerant, low maintenance'],
  // Rock Solid Supply
  [3, 'Travertine Pavers 12x12', 'RS-TP12', 'Pavers', 'sq ft', 4.50, 2000, 200, null],
  [3, 'River Rock (1-3 in)', 'RS-RR3', 'Stone', 'ton', 65.00, 12, 3, null],
  [3, 'Retaining Wall Block', 'RS-RWB', 'Stone', 'each', 3.25, 500, 100, null],
  [3, 'Flagstone - Natural', 'RS-FN', 'Stone', 'sq ft', 6.75, 800, 100, 'Irregular shapes, great for pathways'],
  [3, 'Decomposed Granite', 'RS-DG', 'Stone', 'ton', 45.00, 25, 5, 'Gray. Good for paths and fill.'],
  [3, 'Fire Pit Kit - Round 42in', 'RS-FPK', 'Stone', 'each', 320.00, 6, 2, 'Includes blocks, ring, and cap stones'],
  // BrightPath Lighting
  [4, 'LED Path Light - Brass', 'BP-PLB', 'Lighting', 'each', 38.00, 80, 15, 'Warm white 3000K, 12V'],
  [4, 'LED Uplight - Adjustable', 'BP-ULA', 'Lighting', 'each', 52.00, 40, 10, 'For tree and facade uplighting'],
  [4, 'LED Deck Light - Recessed', 'BP-DLR', 'Lighting', 'each', 28.00, 60, 10, 'Flush mount, stainless steel'],
  [4, 'Smart Transformer 300W', 'BP-ST300', 'Lighting', 'each', 185.00, 8, 2, 'WiFi enabled, dusk-to-dawn timer'],
  [4, 'LED Flood Light - 20W', 'BP-FL20', 'Lighting', 'each', 65.00, 20, 5, 'Security/accent, adjustable angle'],
  // Central FL Irrigation Depot
  [5, 'Rain Bird ESP-TM2 Controller', 'CF-RBTM2', 'Irrigation', 'each', 135.00, 10, 3, '6-zone, WiFi smart controller'],
  [5, 'Hunter PGP Ultra Rotor', 'CF-HPGP', 'Irrigation', 'each', 18.50, 200, 30, '40-50 ft radius, adjustable arc'],
  [5, 'Rain Bird 1804 Pop-Up Spray', 'CF-RB1804', 'Irrigation', 'each', 4.25, 500, 50, '4-inch pop-up, multiple nozzles available'],
  [5, 'Drip Tubing 1/2in - 100ft', 'CF-DT100', 'Irrigation', 'roll', 22.00, 35, 8, 'For garden beds and planters'],
  [5, 'PVC Pipe 3/4in - 10ft', 'CF-PVC34', 'Irrigation', 'each', 3.80, 150, 25, 'Schedule 40, for main lines'],
  [5, 'Valve Box - Standard', 'CF-VBS', 'Irrigation', 'each', 12.00, 40, 10, 'Green lid, fits 2-4 valves'],
];
for (const i of inventory) insertInventory.run(...i);

// ─── Job Openings ─────────────────────────────────────────────────────────
const insertJobOpening = db.prepare('INSERT INTO job_openings (title, department, type, location, description, requirements, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
const jobOpenings = [
  ['Landscape Technician', 'Installation', 'Full-time', 'Orlando, FL',
    'Join our installation crew to help deliver and install sod, plants, trees, mulch, and other landscape materials. You will work on residential and commercial properties across Central Florida.',
    'Valid driver\'s license\nAbility to lift 50+ lbs\nExperience with landscaping preferred\nReliable transportation', 'Open'],
  ['Irrigation Specialist', 'Irrigation', 'Full-time', 'Orlando, FL',
    'Design, install, and repair irrigation systems for residential and commercial clients. Work with Rain Bird and Hunter systems including smart controllers and drip irrigation.',
    'Experience with irrigation system installation\nKnowledge of Rain Bird and Hunter products\nAbility to read blueprints\nFlorida irrigation license preferred', 'Open'],
  ['Hardscape Crew Member', 'Hardscaping', 'Full-time', 'Orlando, FL',
    'Help build patios, walkways, retaining walls, fire pits, and outdoor kitchens. Work under an experienced crew lead on projects across the region.',
    'Experience with paver installation preferred\nAbility to operate basic power tools\nPhysical fitness — heavy lifting required\nTeam player with strong work ethic', 'Open'],
  ['Seasonal Maintenance Technician', 'Maintenance', 'Seasonal', 'Orlando, FL',
    'Seasonal position for spring and fall cleanup services. Duties include mowing, edging, mulching, leaf removal, and general property maintenance.',
    'Some landscaping experience preferred\nOwn transportation to job sites\nAvailable for early morning start times\nAble to work in Florida heat', 'Open'],
  ['Landscape Designer (Junior)', 'Design', 'Full-time', 'Orlando, FL',
    'Assist our lead designer in creating landscape plans for residential clients. Responsibilities include site assessments, plant selection, and drafting designs using landscape CAD software.',
    'Degree in landscape architecture or horticulture\nFamiliarity with Florida-native plants\nProficiency in CAD or landscape design software\nStrong communication skills', 'Draft'],
];
for (const jo of jobOpenings) insertJobOpening.run(...jo);

console.log('Database seeded successfully.');
