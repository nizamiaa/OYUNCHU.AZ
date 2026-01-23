import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { CartProvider } from "./components/CartContext";
import { AuthProvider } from './components/AuthContext';
import { WishlistProvider } from './components/WishlistContext';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';

import Header from "./components/Header";
import HomePage from "./components/HomePage";
import AllProductsPage from "./components/AllProductsPage";
import CampaignsPage from './components/CampaignsPage';
import CartPage from "./components/CartPage";
import WishlistPage from './components/WishlistPage';
import ProductDetail from './components/ProductDetail';

import AdminDashboard from './components/admin/AdminDashboard';
import ProductsManagement from './components/admin/ProductsManagement';
import OrdersManagement from './components/admin/OrdersManagement';
import UsersManagement from './components/admin/UsersManagement';
import FeedbacksManagement from './components/admin/FeedbacksManagement';

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
        <Router>
          <Header />

          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<AllProductsPage />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/checkout/cart" element={<CartPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/products" element={<ProductsManagement />} />
            <Route path="/admin/orders" element={<OrdersManagement />} />
            <Route path="/admin/feedbacks" element={<FeedbacksManagement />} />
            <Route path="/admin/users" element={<UsersManagement />} />
            <Route path="/wishlist" element={<WishlistPage />} />
          </Routes>
        </Router>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}
