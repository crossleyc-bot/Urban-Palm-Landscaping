export const services = [
  {
    id: 1,
    name: 'Lawn Maintenance',
    description: 'Regular mowing, edging, and lawn health management to keep your yard pristine.',
    price: 'From $75/visit',
    icon: '🌿',
  },
  {
    id: 2,
    name: 'Landscape Design',
    description: 'Custom landscape architecture tailored to your property and lifestyle.',
    price: 'From $500',
    icon: '🎨',
  },
  {
    id: 3,
    name: 'Tree & Shrub Care',
    description: 'Professional pruning, trimming, and health assessments for all your plants.',
    price: 'From $150',
    icon: '🌳',
  },
  {
    id: 4,
    name: 'Irrigation Systems',
    description: 'Design, installation, and repair of efficient irrigation and sprinkler systems.',
    price: 'From $300',
    icon: '💧',
  },
  {
    id: 5,
    name: 'Hardscaping',
    description: 'Patios, walkways, retaining walls, and outdoor living spaces built to last.',
    price: 'From $1,000',
    icon: '🧱',
  },
  {
    id: 6,
    name: 'Seasonal Cleanup',
    description: 'Spring and fall cleanup services including leaf removal and bed preparation.',
    price: 'From $200',
    icon: '🍂',
  },
];

export const teamMembers = [
  { id: 1, name: 'Andrea Baugh', role: 'Founder & Lead Designer', experience: '15 years' },
  { id: 2, name: 'Maria Santos', role: 'Operations Manager', experience: '10 years' },
  { id: 3, name: 'James Okoro', role: 'Senior Landscaper', experience: '8 years' },
  { id: 4, name: 'Aisha Patel', role: 'Irrigation Specialist', experience: '6 years' },
];

export const testimonials = [
  {
    id: 1,
    name: 'Sarah Mitchell',
    text: 'Urban Palm completely transformed our backyard. The design team listened to every detail and delivered beyond expectations.',
    rating: 5,
  },
  {
    id: 2,
    name: 'David Chen',
    text: 'Reliable, professional, and creative. Our lawn has never looked better since we started their maintenance plan.',
    rating: 5,
  },
  {
    id: 3,
    name: 'Rachel Torres',
    text: 'The hardscaping work they did on our patio was outstanding. Great craftsmanship and fair pricing.',
    rating: 4,
  },
];

export const mockOrders = [
  { id: 'ORD-001', service: 'Lawn Maintenance', date: '2026-02-10', status: 'Completed', amount: 75 },
  { id: 'ORD-002', service: 'Tree & Shrub Care', date: '2026-02-14', status: 'In Progress', amount: 200 },
  { id: 'ORD-003', service: 'Irrigation Systems', date: '2026-02-20', status: 'Scheduled', amount: 450 },
  { id: 'ORD-004', service: 'Landscape Design', date: '2026-03-01', status: 'Pending Quote', amount: null },
];

export const mockJobs = [
  { id: 'JOB-001', client: 'Sarah Mitchell', service: 'Lawn Maintenance', assignee: 'James Okoro', date: '2026-02-16', status: 'In Progress' },
  { id: 'JOB-002', client: 'David Chen', service: 'Tree & Shrub Care', assignee: 'James Okoro', date: '2026-02-17', status: 'Scheduled' },
  { id: 'JOB-003', client: 'Rachel Torres', service: 'Hardscaping', assignee: 'Carlos Rivera', date: '2026-02-18', status: 'Scheduled' },
  { id: 'JOB-004', client: 'Mark Johnson', service: 'Irrigation Systems', assignee: 'Aisha Patel', date: '2026-02-19', status: 'Scheduled' },
  { id: 'JOB-005', client: 'Lisa Wang', service: 'Seasonal Cleanup', assignee: 'James Okoro', date: '2026-02-15', status: 'Completed' },
];

export const mockEmployees = [
  { id: 'EMP-001', name: 'Andrea Baugh', role: 'Lead Designer', phone: '(555) 100-1001', email: 'andrea@urbanpalmlandscaping.com', status: 'Active' },
  { id: 'EMP-002', name: 'Maria Santos', role: 'Operations Manager', phone: '(555) 100-1002', email: 'maria@urbanpalmlandscaping.com', status: 'Active' },
  { id: 'EMP-003', name: 'James Okoro', role: 'Senior Landscaper', phone: '(555) 100-1003', email: 'james@urbanpalmlandscaping.com', status: 'Active' },
  { id: 'EMP-004', name: 'Aisha Patel', role: 'Irrigation Specialist', phone: '(555) 100-1004', email: 'aisha@urbanpalmlandscaping.com', status: 'Active' },
  { id: 'EMP-005', name: 'Tom Bradley', role: 'Junior Landscaper', phone: '(555) 100-1005', email: 'tom@urbanpalmlandscaping.com', status: 'On Leave' },
];

export const mockInvoices = [
  { id: 'INV-001', client: 'Sarah Mitchell', amount: 75, date: '2026-02-10', dueDate: '2026-03-10', status: 'Paid' },
  { id: 'INV-002', client: 'David Chen', amount: 200, date: '2026-02-14', dueDate: '2026-03-14', status: 'Pending' },
  { id: 'INV-003', client: 'Rachel Torres', amount: 2500, date: '2026-01-20', dueDate: '2026-02-20', status: 'Overdue' },
  { id: 'INV-004', client: 'Mark Johnson', amount: 450, date: '2026-02-15', dueDate: '2026-03-15', status: 'Pending' },
  { id: 'INV-005', client: 'Lisa Wang', amount: 200, date: '2026-02-15', dueDate: '2026-03-15', status: 'Paid' },
];
