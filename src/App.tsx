import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/layout/Layout';

import Home from './pages/Home';
import Shop from './pages/Shop';
import Categories from './pages/Categories';
import CategoryDetails from './pages/CategoryDetails';
import BookDetails from './pages/BookDetails';
import Search from './pages/Search';
import About from './pages/About';
import Contact from './pages/Contact';
import FAQ from './pages/FAQ';
import Blog from './pages/Blog';
import BlogDetails from './pages/BlogDetails';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';

import DashboardLayout from './components/dashboard/DashboardLayout';
import DashboardOverview from './pages/dashboard/Overview';
import PurchasedBooks from './pages/dashboard/PurchasedBooks';
import Downloads from './pages/dashboard/Downloads';
import Wishlist from './pages/dashboard/Wishlist';
import Orders from './pages/dashboard/Orders';
import Profile from './pages/dashboard/Profile';
import Security from './pages/dashboard/Security';

import Cart from './pages/Cart';
import Checkout from './pages/Checkout';

import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminBooks from './pages/admin/AdminBooks';
import AdminCategories from './pages/admin/AdminCategories';
import AdminOrders from './pages/admin/AdminOrders';
import AdminPayments from './pages/admin/AdminPayments';
import AdminUsers from './pages/admin/AdminUsers';
import AdminReviews from './pages/admin/AdminReviews';
import AdminCoupons from './pages/admin/AdminCoupons';
import AdminBlog from './pages/admin/AdminBlog';
import AdminSettings from './pages/admin/AdminSettings';
import AdminPaymentMethods from './pages/admin/AdminPaymentMethods';
import AdminTickets from './pages/admin/AdminTickets';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminPackages from './pages/admin/AdminPackages';

import PackageDetails from './pages/PackageDetails';
import Packages from './pages/Packages';

function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-8xl font-extrabold text-emerald-700">404</p>
      <h1 className="mt-4 text-2xl font-bold text-ink-900">Page Not Found</h1>
      <p className="mt-2 text-ink-500">The page you are looking for does not exist or has been moved.</p>
      <a href="/" className="btn-primary mt-6">Back to Home</a>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <WishlistProvider>
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/shop" element={<Shop />} />
                  <Route path="/categories" element={<Categories />} />
                  <Route path="/category/:slug" element={<CategoryDetails />} />
                  <Route path="/book/:slug" element={<BookDetails />} />
                  <Route path="/packages" element={<Packages />} />
                  <Route path="/package/:slug" element={<PackageDetails />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:slug" element={<BlogDetails />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/dashboard" element={<DashboardLayout />}>
                    <Route index element={<DashboardOverview />} />
                    <Route path="books" element={<PurchasedBooks />} />
                    <Route path="purchased-books" element={<PurchasedBooks />} />
                    <Route path="downloads" element={<Downloads />} />
                    <Route path="wishlist" element={<Wishlist />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="security" element={<Security />} />
                  </Route>
                  <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="books" element={<AdminBooks />} />
                    <Route path="packages" element={<AdminPackages />} />
                    <Route path="categories" element={<AdminCategories />} />
                    <Route path="orders" element={<AdminOrders />} />
                    <Route path="payments" element={<AdminPayments />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="reviews" element={<AdminReviews />} />
                    <Route path="coupons" element={<AdminCoupons />} />
                    <Route path="blog" element={<AdminBlog />} />
                    <Route path="settings" element={<AdminSettings />} />
                    <Route path="payment-methods" element={<AdminPaymentMethods />} />
                    <Route path="tickets" element={<AdminTickets />} />
                    <Route path="notifications" element={<AdminNotifications />} />
                  </Route>
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </WishlistProvider>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
