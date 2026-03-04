import db from './db.js';
import bcrypt from 'bcryptjs';

// Temporarily disable FK checks so we can clear and reseed with known IDs
db.pragma('foreign_keys = OFF');

db.exec(`
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
  ['Rock Solid Supply', 'Diane Park', 'diane@rocksolidsupply.com', '(321) 555-0303', '560 Quarry Ln, Clermont, FL 34711', null, 'Mon-Fri 7am-5pm', 'Delivery Tue/Thu only. Schedule 48 hours in advance.', '$95 per load within service area', 'Contractors only — must have account on file', 'Pavers, stone, gravel. 5% contractor discount with account.', 'Active'],
  ['BrightPath Lighting', 'Kevin Marsh', 'kevin@brightpathlighting.com', '(407) 555-0404', '920 Edison Blvd, Orlando, FL 32806', 'https://brightpathlighting.com', 'Mon-Fri 8am-6pm', 'Ships via UPS/FedEx. 3-5 business days standard.', 'Free shipping on orders over $500, otherwise $12.95', 'Online orders only — no walk-in showroom', 'LED landscape fixtures. 5-year warranty on all products.', 'Active'],
  ['Central FL Irrigation Depot', 'Nancy Cole', 'nancy@cflirrigation.com', '(321) 555-0505', '3100 Water Works Way, Sanford, FL 32773', 'https://cflirrigation.com', 'Mon-Fri 7am-5:30pm, Sat 8am-1pm', 'Same-day pickup available. Local delivery next business day.', '$45 flat rate local delivery', 'Open to public and contractors. Contractor counter for quick pickup.', 'Full line of Rain Bird and Hunter products. Net 15 terms.', 'Active'],
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
  // Rock Solid Supply
  [3, 'Travertine Pavers 12x12', 'RS-TP12', 'sq ft',     4.50,   6.75, 2000, 200, null],
  [3, 'River Rock (1-3 in)', 'RS-RR3', 'ton',           65.00,  97.50, 12, 3, null],
  [3, 'Retaining Wall Block', 'RS-RWB', 'each',          3.25,   4.88, 500, 100, null],
  [3, 'Flagstone - Natural', 'RS-FN', 'sq ft',           6.75,  10.13, 800, 100, 'Irregular shapes, great for pathways'],
  [3, 'Decomposed Granite', 'RS-DG', 'ton',             45.00,  67.50, 25, 5, 'Gray. Good for paths and fill.'],
  [3, 'Fire Pit Kit - Round 42in', 'RS-FPK', 'each',   320.00, 480.00, 6, 2, 'Includes blocks, ring, and cap stones'],
  // BrightPath Lighting
  [4, 'LED Path Light - Brass', 'BP-PLB', 'each',       38.00,  57.00, 80, 15, 'Warm white 3000K, 12V'],
  [4, 'LED Uplight - Adjustable', 'BP-ULA', 'each',     52.00,  78.00, 40, 10, 'For tree and facade uplighting'],
  [4, 'LED Deck Light - Recessed', 'BP-DLR', 'each',    28.00,  42.00, 60, 10, 'Flush mount, stainless steel'],
  [4, 'Smart Transformer 300W', 'BP-ST300', 'each',    185.00, 277.50, 8, 2, 'WiFi enabled, dusk-to-dawn timer'],
  [4, 'LED Flood Light - 20W', 'BP-FL20', 'each',       65.00,  97.50, 20, 5, 'Security/accent, adjustable angle'],
  // Central FL Irrigation Depot
  [5, 'Rain Bird ESP-TM2 Controller', 'CF-RBTM2', 'each', 135.00, 202.50, 10, 3, '6-zone, WiFi smart controller'],
  [5, 'Hunter PGP Ultra Rotor', 'CF-HPGP', 'each',      18.50,  27.75, 200, 30, '40-50 ft radius, adjustable arc'],
  [5, 'Rain Bird 1804 Pop-Up Spray', 'CF-RB1804', 'each', 4.25,   6.38, 500, 50, '4-inch pop-up, multiple nozzles available'],
  [5, 'Drip Tubing 1/2in - 100ft', 'CF-DT100', 'roll',  22.00,  33.00, 35, 8, 'For garden beds and planters'],
  [5, 'PVC Pipe 3/4in - 10ft', 'CF-PVC34', 'each',       3.80,   5.70, 150, 25, 'Schedule 40, for main lines'],
  [5, 'Valve Box - Standard', 'CF-VBS', 'each',          12.00,  18.00, 40, 10, 'Green lid, fits 2-4 valves'],
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

console.log('Database seeded successfully.');
