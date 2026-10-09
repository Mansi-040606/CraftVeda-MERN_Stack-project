import { Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Artisans from './pages/Artisans';
import ArtisanProfile from './pages/ArtisanProfile';
import Workshops from './pages/Workshops';
import Cart from './pages/Cart';
import Wishlist from './pages/Wishlist';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import GISearch from './pages/GISearch';
import About from './pages/About';
import Donate from './pages/Donate';
import Auth from './pages/Auth';
import Admin from './pages/Admin';
import AdminUsers from './pages/Admin/Users';
import AdminOrders from './pages/Admin/Orders';
import AdminProducts from './pages/Admin/Products';
import AdminApplications from './pages/Admin/Applications';
import AdminWorkshops from './pages/Admin/Workshops';
import AdminDonations from './pages/Admin/Donations';
import AdminGITags from './pages/Admin/GITags';
import AdminReviews from './pages/Admin/Reviews';
import ToastHost from './components/Toast';
import CustomerDashboard from './pages/CustomerDashboard';
import ArtisanDashboard from './pages/ArtisanDashboard';
import BecomeArtisan from './pages/BecomeArtisan';

function App() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/artisans" element={<Artisans />} />
          <Route path="/artisan/:id" element={<ArtisanProfile />} />
          <Route path="/workshops" element={<Workshops />} />
          <Route path="/workshop/:id" element={<Workshops />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/order/:id" element={<Orders />} />
          <Route path="/gi-search" element={<GISearch />} />
          <Route path="/about" element={<About />} />
          <Route path="/donate" element={<Donate />} />
          <Route path="/auth" element={<Auth />} />
          
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <Admin />
            </ProtectedRoute>
          } />
          <Route path="/admin/dashboard" element={
            <ProtectedRoute allowedRoles={['ADMIN']}><Admin /></ProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedRoute allowedRoles={['ADMIN']}><AdminUsers /></ProtectedRoute>
          } />
          <Route path="/admin/orders" element={
            <ProtectedRoute allowedRoles={['ADMIN']}><AdminOrders /></ProtectedRoute>
          } />
          <Route path="/admin/products" element={
            <ProtectedRoute allowedRoles={['ADMIN']}><AdminProducts /></ProtectedRoute>
          } />
          <Route path="/admin/applications" element={
            <ProtectedRoute allowedRoles={['ADMIN']}><AdminApplications /></ProtectedRoute>
          } />
          <Route path="/admin/artisans" element={
            <ProtectedRoute allowedRoles={['ADMIN']}><AdminApplications /></ProtectedRoute>
          } />
          <Route path="/admin/workshops" element={
            <ProtectedRoute allowedRoles={['ADMIN']}><AdminWorkshops /></ProtectedRoute>
          } />
          <Route path="/admin/donations" element={
            <ProtectedRoute allowedRoles={['ADMIN']}><AdminDonations /></ProtectedRoute>
          } />
          <Route path="/admin/gi-tags" element={
            <ProtectedRoute allowedRoles={['ADMIN']}><AdminGITags /></ProtectedRoute>
          } />
          <Route path="/admin/reviews" element={
            <ProtectedRoute allowedRoles={['ADMIN']}><AdminReviews /></ProtectedRoute>
          } />
          
          <Route path="/customer/dashboard" element={
            <ProtectedRoute allowedRoles={['CUSTOMER']}>
              <CustomerDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/artisan/dashboard" element={
            <ProtectedRoute allowedRoles={['ARTISAN']}>
              <ArtisanDashboard />
            </ProtectedRoute>
          } />
          
          <Route path="/become-artisan" element={
            <ProtectedRoute allowedRoles={['CUSTOMER']}>
              <BecomeArtisan />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
      <Footer />
      <ToastHost />
    </div>
  );
}

export default App;