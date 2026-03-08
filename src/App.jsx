import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SiteSettingsProvider, useSiteSettings } from './context/SiteSettingsContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './components/ui/Toast';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Sidebar from './components/layout/Sidebar';
import Breadcrumbs from './components/ui/Breadcrumbs';
import ErrorBoundary from './components/ErrorBoundary';
import ScrollToTop from './components/ScrollToTop';
import BackToTop from './components/BackToTop';
import AnnouncementBanner from './components/AnnouncementBanner';
import NotFound from './pages/NotFound';
import Spinner from './components/ui/Spinner';

// Lazy-loaded public pages
const Home = lazy(() => import('./pages/public/Home'));
const Services = lazy(() => import('./pages/public/Services'));
const About = lazy(() => import('./pages/public/About'));
const Contact = lazy(() => import('./pages/public/Contact'));
const Portfolio = lazy(() => import('./pages/public/Portfolio'));
const Careers = lazy(() => import('./pages/public/Careers'));
const Products = lazy(() => import('./pages/public/Products'));
const Resources = lazy(() => import('./pages/public/Resources'));
const Cart = lazy(() => import('./pages/public/Cart'));
const Checkout = lazy(() => import('./pages/public/Checkout'));
const PublicRequestQuote = lazy(() => import('./pages/public/RequestQuote'));
const Login = lazy(() => import('./pages/Login'));

// Lazy-loaded customer pages
const CustomerDashboard = lazy(() => import('./pages/customer/CustomerDashboard'));
const RequestQuote = lazy(() => import('./pages/customer/RequestQuote'));
const MyQuotes = lazy(() => import('./pages/customer/MyQuotes'));
const MyJobs = lazy(() => import('./pages/customer/MyJobs'));
const MyInvoices = lazy(() => import('./pages/customer/MyInvoices'));
const MyAccount = lazy(() => import('./pages/customer/MyAccount'));
const MyOrders = lazy(() => import('./pages/customer/MyOrders'));

// Lazy-loaded admin pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const ManageJobs = lazy(() => import('./pages/admin/ManageJobs'));
const ManageEmployees = lazy(() => import('./pages/admin/ManageEmployees'));
const AdminSchedule = lazy(() => import('./pages/admin/AdminSchedule'));
const Invoices = lazy(() => import('./pages/admin/Invoices'));
const QuoteRequests = lazy(() => import('./pages/admin/QuoteRequests'));
const ContactMessages = lazy(() => import('./pages/admin/ContactMessages'));
const ManageServices = lazy(() => import('./pages/admin/ManageServices'));
const ManageSuppliers = lazy(() => import('./pages/admin/ManageSuppliers'));
const SupplierInventory = lazy(() => import('./pages/admin/SupplierInventory'));
const ManageJobOpenings = lazy(() => import('./pages/admin/ManageJobOpenings'));
const ManageTaxonomy = lazy(() => import('./pages/admin/ManageTaxonomy'));
const ManageResources = lazy(() => import('./pages/admin/ManageResources'));
const ManageTestimonials = lazy(() => import('./pages/admin/ManageTestimonials'));
const ManageCoupons = lazy(() => import('./pages/admin/ManageCoupons'));
const SiteSettings = lazy(() => import('./pages/admin/SiteSettings'));

import './App.css';

const customerNav = [
  { path: '/portal', label: 'Dashboard', icon: '\u2630' },
  { path: '/portal/quote', label: 'Request Quote', icon: '\u2709' },
  { path: '/portal/quotes', label: 'My Quotes', icon: '\uD83D\uDCDD' },
  { path: '/portal/jobs', label: 'My Jobs', icon: '\uD83D\uDCBC' },
  { path: '/portal/orders', label: 'My Orders', icon: '\uD83D\uDED2' },
  { path: '/portal/invoices', label: 'My Invoices', icon: '\uD83D\uDCB0' },
  { path: '/portal/account', label: 'My Account', icon: '\uD83D\uDC64' },
];

const adminNav = [
  { path: '/admin', label: 'Dashboard', icon: '\u2630' },
  { path: '/admin/services', label: 'Services', icon: '\uD83C\uDF3F' },
  { path: '/admin/jobs', label: 'Manage Jobs', icon: '\uD83D\uDCBC' },
  { path: '/admin/employees', label: 'Employees', icon: '\uD83D\uDC65' },
  { path: '/admin/suppliers', label: 'Suppliers', icon: '\uD83D\uDE9A' },
  { path: '/admin/inventory', label: 'Inventory', icon: '\uD83D\uDCE6' },
  { path: '/admin/taxonomy', label: 'Taxonomy', icon: '\uD83C\uDF33' },
  { path: '/admin/schedule', label: 'Schedule', icon: '\uD83D\uDCC5' },
  { path: '/admin/invoices', label: 'Invoices', icon: '\uD83D\uDCB0' },
  { path: '/admin/quotes', label: 'Quote Requests', icon: '\u2709' },
  { path: '/admin/messages', label: 'Messages', icon: '\uD83D\uDCAC' },
  { path: '/admin/testimonials', label: 'Testimonials', icon: '\u2B50' },
  { path: '/admin/resources', label: 'Resources', icon: '\uD83D\uDCDA' },
  { path: '/admin/job-openings', label: 'Job Openings', icon: '\uD83D\uDCCB' },
  { path: '/admin/coupons', label: 'Coupons', icon: '\uD83C\uDFF7\uFE0F' },
  { path: '/admin/settings', label: 'Site Settings', icon: '\u2699\uFE0F' },
];

function ProtectedRoute({ allowedRole }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRole && user.role !== allowedRole && user.role !== 'admin') return <Navigate to="/" replace />;
  return <Outlet />;
}

function AnimatedOutlet() {
  const location = useLocation();
  return (
    <div className="page-animate" key={location.pathname}>
      <Suspense fallback={<Spinner />}>
        <Outlet />
      </Suspense>
    </div>
  );
}

function PageGuard({ children }) {
  const location = useLocation();
  const { isPageVisible, loaded } = useSiteSettings();
  if (!loaded) return null;
  if (!isPageVisible(location.pathname)) return <Navigate to="/" replace />;
  return children;
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
          <SiteSettingsProvider>
          <CartProvider>
          <ToastProvider>
            <ErrorBoundary>
            <Header />
            <AnnouncementBanner />
            <ScrollToTop />
            <BackToTop />
            <Routes>
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/services" element={<PageGuard><Services /></PageGuard>} />
                <Route path="/portfolio" element={<PageGuard><Portfolio /></PageGuard>} />
                <Route path="/about" element={<PageGuard><About /></PageGuard>} />
                <Route path="/contact" element={<PageGuard><Contact /></PageGuard>} />
                <Route path="/careers" element={<PageGuard><Careers /></PageGuard>} />
                <Route path="/products" element={<PageGuard><Products /></PageGuard>} />
                <Route path="/resources" element={<PageGuard><Resources /></PageGuard>} />
                <Route path="/quote" element={<PublicRequestQuote />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/login" element={<Login />} />
              </Route>

              <Route element={<ProtectedRoute allowedRole="customer" />}>
                <Route element={<PortalLayout />}>
                  <Route path="/portal" element={<CustomerDashboard />} />
                  <Route path="/portal/quote" element={<RequestQuote />} />
                  <Route path="/portal/quotes" element={<MyQuotes />} />
                  <Route path="/portal/jobs" element={<MyJobs />} />
                  <Route path="/portal/orders" element={<MyOrders />} />
                  <Route path="/portal/invoices" element={<MyInvoices />} />
                  <Route path="/portal/account" element={<MyAccount />} />
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
                  <Route path="/admin/taxonomy" element={<ManageTaxonomy />} />
                  <Route path="/admin/schedule" element={<AdminSchedule />} />
                  <Route path="/admin/invoices" element={<Invoices />} />
                  <Route path="/admin/quotes" element={<QuoteRequests />} />
                  <Route path="/admin/messages" element={<ContactMessages />} />
                  <Route path="/admin/testimonials" element={<ManageTestimonials />} />
                  <Route path="/admin/resources" element={<ManageResources />} />
                  <Route path="/admin/job-openings" element={<ManageJobOpenings />} />
                  <Route path="/admin/coupons" element={<ManageCoupons />} />
                  <Route path="/admin/settings" element={<SiteSettings />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
            </ErrorBoundary>
          </ToastProvider>
          </CartProvider>
          </SiteSettingsProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
