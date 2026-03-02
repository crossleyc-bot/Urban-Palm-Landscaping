import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './components/ui/Toast';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Sidebar from './components/layout/Sidebar';
import Breadcrumbs from './components/ui/Breadcrumbs';
import NotFound from './pages/NotFound';

import Home from './pages/public/Home';
import Services from './pages/public/Services';
import About from './pages/public/About';
import Contact from './pages/public/Contact';
import Portfolio from './pages/public/Portfolio';
import Careers from './pages/public/Careers';
import Products from './pages/public/Products';
import Login from './pages/Login';

import CustomerDashboard from './pages/customer/CustomerDashboard';
import RequestQuote from './pages/customer/RequestQuote';
import ScheduleService from './pages/customer/ScheduleService';
import OrderHistory from './pages/customer/OrderHistory';

import AdminDashboard from './pages/admin/AdminDashboard';
import ManageJobs from './pages/admin/ManageJobs';
import ManageEmployees from './pages/admin/ManageEmployees';
import AdminSchedule from './pages/admin/AdminSchedule';
import Invoices from './pages/admin/Invoices';
import QuoteRequests from './pages/admin/QuoteRequests';
import ScheduleRequests from './pages/admin/ScheduleRequests';
import ContactMessages from './pages/admin/ContactMessages';
import ManageServices from './pages/admin/ManageServices';
import ManageSuppliers from './pages/admin/ManageSuppliers';
import SupplierInventory from './pages/admin/SupplierInventory';
import ManageJobOpenings from './pages/admin/ManageJobOpenings';
import ManageProductCategories from './pages/admin/ManageProductCategories';
import ManageTaxonomy from './pages/admin/ManageTaxonomy';
import SiteSettings from './pages/admin/SiteSettings';

import './App.css';

const customerNav = [
  { path: '/portal', label: 'Dashboard', icon: '\u2630' },
  { path: '/portal/quote', label: 'Request Quote', icon: '\u2709' },
  { path: '/portal/schedule', label: 'Schedule Service', icon: '\uD83D\uDCC5' },
  { path: '/portal/orders', label: 'Order History', icon: '\uD83D\uDCCB' },
];

const adminNav = [
  { path: '/admin', label: 'Dashboard', icon: '\u2630' },
  { path: '/admin/services', label: 'Services', icon: '\uD83C\uDF3F' },
  { path: '/admin/jobs', label: 'Manage Jobs', icon: '\uD83D\uDCBC' },
  { path: '/admin/employees', label: 'Employees', icon: '\uD83D\uDC65' },
  { path: '/admin/suppliers', label: 'Suppliers', icon: '\uD83D\uDE9A' },
  { path: '/admin/inventory', label: 'Inventory', icon: '\uD83D\uDCE6' },
  { path: '/admin/product-categories', label: 'Product Categories', icon: '\uD83C\uDFF7\uFE0F' },
  { path: '/admin/taxonomy', label: 'Taxonomy', icon: '\uD83C\uDF33' },
  { path: '/admin/schedule', label: 'Schedule', icon: '\uD83D\uDCC5' },
  { path: '/admin/invoices', label: 'Invoices', icon: '\uD83D\uDCB0' },
  { path: '/admin/quotes', label: 'Quote Requests', icon: '\u2709' },
  { path: '/admin/schedule-requests', label: 'Schedule Requests', icon: '\uD83D\uDCC6' },
  { path: '/admin/messages', label: 'Messages', icon: '\uD83D\uDCAC' },
  { path: '/admin/job-openings', label: 'Job Openings', icon: '\uD83D\uDCCB' },
  { path: '/admin/settings', label: 'Site Settings', icon: '\u2699\uFE0F' },
];

function ProtectedRoute({ allowedRole }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRole && user.role !== allowedRole) return <Navigate to="/" replace />;
  return <Outlet />;
}

function AnimatedOutlet() {
  const location = useLocation();
  return (
    <div className="page-animate" key={location.pathname}>
      <Outlet />
    </div>
  );
}

function PortalLayout() {
  return (
    <div className="app-layout">
      <Sidebar items={customerNav} title="Customer Portal" />
      <main className="app-main">
        <Breadcrumbs />
        <AnimatedOutlet />
      </main>
    </div>
  );
}

function AdminLayout() {
  return (
    <div className="app-layout">
      <Sidebar items={adminNav} title="Admin Panel" />
      <main className="app-main">
        <Breadcrumbs />
        <AnimatedOutlet />
      </main>
    </div>
  );
}

function PublicLayout() {
  return (
    <>
      <main>
        <AnimatedOutlet />
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <Header />
            <Routes>
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/services" element={<Services />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/careers" element={<Careers />} />
                <Route path="/products" element={<Products />} />
                <Route path="/login" element={<Login />} />
              </Route>

              <Route element={<ProtectedRoute allowedRole="customer" />}>
                <Route element={<PortalLayout />}>
                  <Route path="/portal" element={<CustomerDashboard />} />
                  <Route path="/portal/quote" element={<RequestQuote />} />
                  <Route path="/portal/schedule" element={<ScheduleService />} />
                  <Route path="/portal/orders" element={<OrderHistory />} />
                </Route>
              </Route>

              <Route element={<ProtectedRoute allowedRole="admin" />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/services" element={<ManageServices />} />
                  <Route path="/admin/jobs" element={<ManageJobs />} />
                  <Route path="/admin/employees" element={<ManageEmployees />} />
                  <Route path="/admin/suppliers" element={<ManageSuppliers />} />
                  <Route path="/admin/inventory" element={<SupplierInventory />} />
                  <Route path="/admin/product-categories" element={<ManageProductCategories />} />
                  <Route path="/admin/taxonomy" element={<ManageTaxonomy />} />
                  <Route path="/admin/schedule" element={<AdminSchedule />} />
                  <Route path="/admin/invoices" element={<Invoices />} />
                  <Route path="/admin/quotes" element={<QuoteRequests />} />
                  <Route path="/admin/schedule-requests" element={<ScheduleRequests />} />
                  <Route path="/admin/messages" element={<ContactMessages />} />
                  <Route path="/admin/job-openings" element={<ManageJobOpenings />} />
                  <Route path="/admin/settings" element={<SiteSettings />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
