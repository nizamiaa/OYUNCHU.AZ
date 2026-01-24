import { BrowserRouter as Router, Routes, Route, Outlet } from "react-router-dom";
import { CartProvider } from "./components/CartContext";
import { AuthProvider } from './components/AuthContext';
import { WishlistProvider } from './components/WishlistContext';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';

import Header from "./components/Header";
import HomePage from "./components/HomePage";
import AllProductsPage from "./components/AllProductsPage";
import CampaignsPage from './components/CampaignsPage';
import BranchesPage from './components/BranchesPage';
import CheckoutPage from './components/CheckoutPage';
import CartPage from "./components/CartPage";
import WishlistPage from './components/WishlistPage';
import ProductDetail from './components/ProductDetail';

import AdminDashboard from './components/admin/AdminDashboard';
import ProductsManagement from './components/admin/ProductsManagement';
import OrdersManagement from './components/admin/OrdersManagement';
import UsersManagement from './components/admin/UsersManagement';
import FeedbacksManagement from './components/admin/FeedbacksManagement';
import OrdersDetails from './components/admin/OrdersDetails';

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
        <Router>
          <Routes>
            <Route element={<><Header /><Outlet /></>}>
              <Route path="/" element={<HomePage />} />
              <Route path="/products" element={<AllProductsPage />} />
              <Route path="/campaigns" element={<CampaignsPage />} />
              <Route path="/branches" element={<BranchesPage />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/checkout/cart" element={<CartPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/wishlist" element={<WishlistPage />} />
            </Route>

            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/checkout/complete" element={<div className="p-8 max-w-4xl mx-auto"><div className="bg-white rounded-lg p-12 text-center border"><h2 className="text-2xl font-semibold mb-4">Sifariş qəbul edildi</h2><p className="text-gray-600">Sifarişiniz qeydə alındı. Tezliklə operatorlarımız sizinlə əlaqə saxlayacaq.</p></div></div>} />

            {/* Admin routes without header */}
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/products" element={<ProductsManagement />} />
            <Route path="/admin/orders" element={<OrdersManagement />} />
            <Route path="/admin/orders/details/:id" element={<OrdersDetails />} />
            <Route path="/admin/feedbacks" element={<FeedbacksManagement />} />
            <Route path="/admin/users" element={<UsersManagement />} />
          </Routes>
        </Router>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}
