import db from './db.js';
import bcrypt from 'bcryptjs';

// Temporarily disable FK checks so we can clear and reseed with known IDs
db.pragma('foreign_keys = OFF');

db.exec(`
  DELETE FROM product_sources;
  DELETE FROM products;
  DELETE FROM announcements;
  DELETE FROM site_settings;
  DELETE FROM taxonomy;
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
  ['Seasonal Cleanup', 'Our spring and fall cleanup services include leaf removal, bed edging, mulch refresh, dead plant removal, and general property tidying to keep your landscape looking sharp year-round.', 'From $200', '🍂'],
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
const insertOrder = db.prepare('INSERT INTO orders (user_id, status, subtotal, tax, total, created_at) VALUES (?, ?, ?, ?, ?, ?)');
const orders = [
  [2, 'Completed', 1168.22, 81.78, 1250.00, '2026-01-15'],
  [2, 'Completed', 186.92, 13.08, 200.00, '2026-02-01'],
  [3, 'Completed', 350.47, 24.53, 375.00, '2026-02-05'],
  [3, 'Completed', 700.93, 49.07, 750.00, '2026-02-10'],
  [4, 'Pending', 4205.61, 294.39, 4500.00, '2026-02-12'],
  [5, 'Pending', 794.39, 55.61, 850.00, '2026-02-14'],
  [5, 'Pending', 112.15, 7.85, 120.00, '2026-02-15'],
  [6, 'Pending', 635.51, 44.49, 680.00, '2026-02-18'],
  [7, 'Pending', 1121.50, 78.50, 1200.00, '2026-02-20'],
  [8, 'Pending', 0, 0, 0, '2026-02-25'],
  [2, 'Pending', 0, 0, 0, '2026-03-01'],
  [4, 'Pending', 420.56, 29.44, 450.00, '2026-03-05'],
];
for (const o of orders) insertOrder.run(...o);



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
const insertSupplier = db.prepare('INSERT INTO suppliers (name, contact_name, email, phone, address, website, operating_hours, delivery_info, delivery_fees, public_access, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
const suppliers = [
  ['Green World Nursery', 'Maria Lopez', 'maria@greenworldnursery.com', '(407) 555-0101', '1200 Plant Ave, Orlando, FL 32803', 'https://greenworldnursery.com', 'Mon-Sat 7am-5pm, Sun 9am-2pm', 'Local delivery within 30 miles. Next-day for orders placed before 2pm.', 'Free on orders over $500, otherwise $75 flat rate', 'Open to public and contractors', 'Net 30 terms. Bulk discount on orders over $2,000. Best selection of native Florida plants.', 'Active'],
  ['SunState Sod Farm', 'Jake Turner', 'jake@sunstatesod.com', '(407) 555-0202', '8400 Sod Rd, Sanford, FL 32771', 'https://sunstatesod.com', 'Mon-Fri 6am-4pm, Sat 7am-12pm', 'Same-day delivery available. Min order 1 pallet.', '$50 per delivery within 25 miles, $1.50/mile beyond', 'Open to public — call ahead for large orders', 'Quality guaranteed — will replace dead sod within 30 days.', 'Active'],
  ['Emerald Coast Turf Co.', 'Brian Holt', 'brian@emeraldcoastturf.com', '(352) 555-0606', '4750 Grass Valley Rd, Ocala, FL 34470', 'https://emeraldcoastturf.com', 'Mon-Fri 6am-5pm, Sat 7am-1pm', 'Next-day delivery available. Min order 1 pallet.', '$60 per delivery within 30 miles, $1.25/mile beyond', 'Open to public and contractors', 'Premium farm-grown sod. 45-day replacement guarantee. Net 15 terms for contractors.', 'Active'],
];
for (const s of suppliers) insertSupplier.run(...s);

// ─── Supplier Inventory ─────────────────────────────────────────────────────
const insertInventory = db.prepare('INSERT INTO supplier_inventory (supplier_id, item_name, sku, unit, unit_cost, retail_cost, qty_available, reorder_point, notes, available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)');
const inventory = [
  // Green World Nursery                               wholesale  retail
  [1, 'Foxtail Palm (10 gal)', 'GW-FP10', 'each',      85.00, 127.50, 24, 5, null],
  [1, 'Croton Gold Dust (3 gal)', 'GW-CG3', 'each',    12.50,  18.75, 60, 10, null],
  [1, 'Jasmine Confederate (1 gal)', 'GW-JC1', 'each',  8.00,  12.00, 120, 20, 'Fragrant, popular for hedges'],
  [1, 'Premium Mulch - Brown', 'GW-MBR', 'cu yd',      35.00,  52.50, 40, 10, null],
  [1, 'Pygmy Date Palm (7 gal)', 'GW-PDP7', 'each',    65.00,  97.50, 18, 5, 'Great for accent planting'],
  [1, 'Ixora Nora Grant (3 gal)', 'GW-ING3', 'each',   14.00,  21.00, 45, 10, 'Red blooms year-round'],
  [1, 'Bird of Paradise (7 gal)', 'GW-BOP7', 'each',   42.00,  63.00, 12, 3, 'Tropical statement plant'],
  // SunState Sod Farm
  [2, 'Floratam St. Augustine Sod', 'SS-FSA', 'pallet', 185.00, 277.50, 30, 5, '500 sq ft per pallet'],
  [2, 'Bermuda Celebration Sod', 'SS-BCS', 'pallet',    210.00, 315.00, 15, 5, 'Full sun recommended'],
  [2, 'Zoysia Empire Sod', 'SS-ZES', 'pallet',          225.00, 337.50, 8, 3, 'Shade tolerant'],
  [2, 'Bahia Argentine Sod', 'SS-BAS', 'pallet',        160.00, 240.00, 20, 5, 'Drought tolerant, low maintenance'],
  // Emerald Coast Turf Co.
  [3, 'Floratam St. Augustine Sod', 'EC-FSA', 'pallet', 180.00, 270.00, 40, 8, '500 sq ft per pallet, farm-fresh cut'],
  [3, 'Bermuda TifTuf Sod', 'EC-BTT', 'pallet',         220.00, 330.00, 20, 5, 'Drought tolerant hybrid bermuda'],
  [3, 'Zoysia Empire Sod', 'EC-ZES', 'pallet',           230.00, 345.00, 12, 4, 'Shade tolerant, fine blade'],
  [3, 'Bahia Argentine Sod', 'EC-BAS', 'pallet',         155.00, 232.50, 25, 5, 'Low maintenance, great for large areas'],
  [3, 'Bermuda Celebration Sod', 'EC-BCS', 'pallet',     215.00, 322.50, 18, 5, 'Dense turf, full sun'],
];
for (const i of inventory) insertInventory.run(...i);

// ─── Catalog Products & Sources ──────────────────────────────────────────
// These are the customer-facing products. Each can be sourced from one or more suppliers.
const insertProduct = db.prepare('INSERT INTO products (name, description, image, unit, retail_price, category_id, available) VALUES (?, ?, ?, ?, ?, ?, 0)');
const insertSource = db.prepare('INSERT INTO product_sources (product_id, supplier_id, inventory_id, unit_cost, priority) VALUES (?, ?, ?, ?, ?)');

// We'll assign category_ids later after taxonomy is seeded, so we insert products after taxonomy below.
// For now, define the product data that we'll use after taxonomy is created.

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

// ─── Taxonomy ──────────────────────────────────────────────────────────────
const insertTaxonomy = db.prepare('INSERT INTO taxonomy (name, description, parent_id, sort_order) VALUES (?, ?, ?, ?)');

// Top-level categories
const plants = insertTaxonomy.run('Plants & Greenery', 'Living plant materials for landscaping projects', null, 0).lastInsertRowid;
const hardscape = insertTaxonomy.run('Hardscape Materials', 'Stone, pavers, and structural landscape materials', null, 1).lastInsertRowid;
const soils = insertTaxonomy.run('Soils & Amendments', 'Growing media, mulch, and soil conditioners', null, 2).lastInsertRowid;
const irrigation = insertTaxonomy.run('Irrigation & Water Management', 'Sprinklers, drip systems, and water management products', null, 3).lastInsertRowid;
const lighting = insertTaxonomy.run('Outdoor Lighting', 'Landscape and architectural lighting products', null, 4).lastInsertRowid;
const turf = insertTaxonomy.run('Turf & Sod', 'Grass varieties for lawns and ground cover', null, 5).lastInsertRowid;
const maintenance = insertTaxonomy.run('Maintenance Supplies', 'Tools, fertilizers, and ongoing care products', null, 6).lastInsertRowid;
const outdoor = insertTaxonomy.run('Outdoor Living', 'Furniture, structures, and outdoor lifestyle features', null, 7).lastInsertRowid;

// Plants & Greenery children
const trees = insertTaxonomy.run('Trees', 'Shade, ornamental, and specimen trees', plants, 0).lastInsertRowid;
const shrubs = insertTaxonomy.run('Shrubs & Hedges', 'Foundation plantings and privacy screens', plants, 1).lastInsertRowid;
insertTaxonomy.run('Perennials', 'Recurring flowering plants for beds and borders', plants, 2);
insertTaxonomy.run('Annuals & Seasonal Color', 'Seasonal blooming plants for rotating displays', plants, 3);
insertTaxonomy.run('Ground Cover', 'Low-growing plants for erosion control and fill areas', plants, 4);
insertTaxonomy.run('Ornamental Grasses', 'Decorative grasses for texture and movement', plants, 5);
insertTaxonomy.run('Tropical & Exotic', 'Tropical foliage and exotic specimen plants', plants, 6);
insertTaxonomy.run('Native Florida Plants', 'Drought-tolerant plants native to the region', plants, 7);

// Trees sub-categories
insertTaxonomy.run('Palm Trees', 'Palms for tropical landscapes', trees, 0);
insertTaxonomy.run('Shade Trees', 'Large canopy trees for shade and cooling', trees, 1);
insertTaxonomy.run('Ornamental Trees', 'Flowering and accent trees', trees, 2);
insertTaxonomy.run('Fruit Trees', 'Citrus and other fruit-bearing trees', trees, 3);

// Shrubs sub-categories
insertTaxonomy.run('Flowering Shrubs', 'Blooming varieties like ixora and hibiscus', shrubs, 0);
insertTaxonomy.run('Evergreen Shrubs', 'Year-round foliage for structure and screening', shrubs, 1);
insertTaxonomy.run('Hedge Plants', 'Dense varieties for formal and informal hedges', shrubs, 2);

// Hardscape Materials children
const pavers = insertTaxonomy.run('Pavers & Paving', 'Patio, driveway, and walkway pavers', hardscape, 0).lastInsertRowid;
const stone = insertTaxonomy.run('Natural Stone', 'Flagstone, boulders, and decorative stone', hardscape, 1).lastInsertRowid;
insertTaxonomy.run('Retaining Wall Systems', 'Blocks and materials for retaining walls', hardscape, 2);
insertTaxonomy.run('Edging & Borders', 'Landscape edging and bed borders', hardscape, 3);
insertTaxonomy.run('Gravel & Aggregates', 'Crushed stone, pea gravel, and decorative rock', hardscape, 4);
insertTaxonomy.run('Sand & Base Materials', 'Leveling sand, polymeric sand, and compactable base', hardscape, 5);

// Pavers sub-categories
insertTaxonomy.run('Travertine Pavers', 'Natural travertine for elegant patios and pool decks', pavers, 0);
insertTaxonomy.run('Brick Pavers', 'Classic clay brick for walkways and driveways', pavers, 1);
insertTaxonomy.run('Concrete Pavers', 'Interlocking concrete for durable surfaces', pavers, 2);

// Natural Stone sub-categories
insertTaxonomy.run('Flagstone', 'Irregular flat stone for natural pathways and patios', stone, 0);
insertTaxonomy.run('Boulders & Accent Rocks', 'Large decorative stones for focal points', stone, 1);
insertTaxonomy.run('River Rock', 'Smooth river stone for beds and dry creek features', stone, 2);

// Soils & Amendments children
insertTaxonomy.run('Topsoil', 'Screened and blended topsoil for planting beds', soils, 0);
insertTaxonomy.run('Mulch', 'Wood, pine, and rubber mulch for beds and pathways', soils, 1);
insertTaxonomy.run('Compost & Organic Matter', 'Composted materials for soil enrichment', soils, 2);
insertTaxonomy.run('Potting & Planting Mix', 'Specialty mixes for containers and raised beds', soils, 3);
insertTaxonomy.run('Fertilizers', 'Granular, liquid, and slow-release plant nutrition', soils, 4);

// Irrigation children
insertTaxonomy.run('Sprinkler Heads & Rotors', 'Pop-up sprays, rotors, and specialty heads', irrigation, 0);
insertTaxonomy.run('Drip Irrigation', 'Drip tubing, emitters, and micro-spray for beds', irrigation, 1);
insertTaxonomy.run('Controllers & Timers', 'Smart and standard irrigation controllers', irrigation, 2);
insertTaxonomy.run('Valves & Valve Boxes', 'Zone valves, solenoids, and access boxes', irrigation, 3);
insertTaxonomy.run('Pipes & Fittings', 'PVC, poly pipe, and connectors', irrigation, 4);
insertTaxonomy.run('Rain Sensors & Accessories', 'Weather sensors and moisture monitors', irrigation, 5);

// Outdoor Lighting children
insertTaxonomy.run('Path & Area Lights', 'Walkway bollards and area illumination', lighting, 0);
insertTaxonomy.run('Uplights & Spotlights', 'Tree, facade, and feature accent lighting', lighting, 1);
insertTaxonomy.run('Deck & Step Lights', 'Recessed and surface-mount deck lighting', lighting, 2);
insertTaxonomy.run('Flood & Security Lights', 'High-output security and area flood lights', lighting, 3);
insertTaxonomy.run('Transformers & Controllers', 'Low-voltage transformers and smart controls', lighting, 4);

// Turf & Sod children
insertTaxonomy.run('St. Augustine', 'Floratam and other St. Augustine varieties', turf, 0);
insertTaxonomy.run('Bermuda Grass', 'Celebration and hybrid bermuda varieties', turf, 1);
insertTaxonomy.run('Zoysia', 'Empire and other shade-tolerant zoysia varieties', turf, 2);
insertTaxonomy.run('Bahia', 'Argentine and Pensacola bahia for low-maintenance lawns', turf, 3);
insertTaxonomy.run('Artificial Turf', 'Synthetic grass for zero-maintenance areas', turf, 4);

// Maintenance Supplies children
insertTaxonomy.run('Weed Control', 'Pre-emergent and post-emergent herbicides', maintenance, 0);
insertTaxonomy.run('Pest & Disease Control', 'Insecticides, fungicides, and biological controls', maintenance, 1);
insertTaxonomy.run('Lawn Care Products', 'Fertilizers, soil conditioners, and turf treatments', maintenance, 2);
insertTaxonomy.run('Pruning & Trimming Tools', 'Hand tools and power equipment for plant care', maintenance, 3);

// Outdoor Living children
insertTaxonomy.run('Fire Features', 'Fire pits, fireplaces, and fire bowls', outdoor, 0);
insertTaxonomy.run('Outdoor Kitchens', 'Built-in grills, counters, and cooking stations', outdoor, 1);
insertTaxonomy.run('Pergolas & Shade Structures', 'Overhead coverage for patios and outdoor rooms', outdoor, 2);
insertTaxonomy.run('Water Features', 'Fountains, ponds, and cascading water elements', outdoor, 3);
insertTaxonomy.run('Outdoor Furniture', 'Seating, dining, and lounge furniture', outdoor, 4);

// ─── Catalog Products (customer-facing) ───────────────────────────────────
// Now that taxonomy is seeded, we can look up leaf category IDs and link products.
// Helper to find a taxonomy leaf by name
const findLeaf = (name) => {
  const row = db.prepare('SELECT id FROM taxonomy WHERE name = ?').get(name);
  return row ? row.id : null;
};

const catalogProducts = [
  // Plants
  { name: 'Foxtail Palm (10 gal)', unit: 'each', retail_price: 127.50, category: 'Palm Trees', sources: [[1, 1, 85.00, 0]] },
  { name: 'Croton Gold Dust (3 gal)', unit: 'each', retail_price: 18.75, category: 'Ornamental Trees', sources: [[1, 2, 12.50, 0]] },
  { name: 'Jasmine Confederate (1 gal)', unit: 'each', retail_price: 12.00, category: 'Hedge Plants', sources: [[1, 3, 8.00, 0]] },
  { name: 'Premium Mulch - Brown', unit: 'cu yd', retail_price: 52.50, category: 'Mulch', sources: [[1, 4, 35.00, 0]] },
  { name: 'Pygmy Date Palm (7 gal)', unit: 'each', retail_price: 97.50, category: 'Palm Trees', sources: [[1, 5, 65.00, 0]] },
  { name: 'Ixora Nora Grant (3 gal)', unit: 'each', retail_price: 21.00, category: 'Flowering Shrubs', sources: [[1, 6, 14.00, 0]] },
  { name: 'Bird of Paradise (7 gal)', unit: 'each', retail_price: 63.00, category: 'Ornamental Trees', sources: [[1, 7, 42.00, 0]] },
  // Sod — SunState Sod Farm
  { name: 'Floratam St. Augustine Sod', unit: 'pallet', retail_price: 277.50, category: 'St. Augustine', sources: [[2, 8, 185.00, 0], [3, 12, 180.00, 1]] },
  { name: 'Bermuda Celebration Sod', unit: 'pallet', retail_price: 315.00, category: 'Bermuda Grass', sources: [[2, 9, 210.00, 0]] },
  { name: 'Zoysia Empire Sod', unit: 'pallet', retail_price: 337.50, category: 'Zoysia', sources: [[2, 10, 225.00, 0], [3, 14, 230.00, 1]] },
  { name: 'Bahia Argentine Sod', unit: 'pallet', retail_price: 240.00, category: 'Bahia', sources: [[2, 11, 160.00, 0], [3, 15, 155.00, 1]] },
  // Sod — Emerald Coast Turf Co. exclusive
  { name: 'Bermuda TifTuf Sod', unit: 'pallet', retail_price: 330.00, category: 'Bermuda Grass', sources: [[3, 13, 220.00, 0]] },
];

for (const p of catalogProducts) {
  const catId = findLeaf(p.category);
  const result = insertProduct.run(p.name, p.description || null, p.image || null, p.unit, p.retail_price, catId);
  const productId = result.lastInsertRowid;
  for (const [supplierId, invId, unitCost, priority] of p.sources) {
    insertSource.run(productId, supplierId, invId, unitCost, priority);
  }
}

// ─── Announcements ─────────────────────────────────────────────────────────
const insertAnnouncement = db.prepare('INSERT INTO announcements (message, link_text, link_url, bg_color, text_color, active) VALUES (?, ?, ?, ?, ?, ?)');
insertAnnouncement.run('Spring Sale — 15% off all plants & sod through March!', 'Shop Now', '/products', '#166534', '#ffffff', 1);
insertAnnouncement.run('Free delivery on orders over $500 this month.', 'Learn More', '/products', '#1e40af', '#ffffff', 0);

// ─── Delivery Fees & Checkout Settings ─────────────────────────────────────
const insertSetting = db.prepare('INSERT INTO site_settings (key, value) VALUES (?, ?)');
insertSetting.run('delivery_fee', '75');
insertSetting.run('installation_fee', '150');
insertSetting.run('delivery_minimum', '50');

console.log('Database seeded successfully.');
