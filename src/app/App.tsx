import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import AdminDashboard from './components/admin/AdminDashboard';
import ProductsManagement from './components/admin/ProductsManagement';
import OrdersManagement from './components/admin/OrdersManagement';
import UsersManagement from './components/admin/UsersManagement';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import BasketPage from './components/BasketPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/admin/products" element={<ProductsManagement />} />
        <Route path="/admin/orders" element={<OrdersManagement />} />
        <Route path="/admin/users" element={<UsersManagement />} />
        <Route path="/basket" element={<BasketPage />} />
      </Routes>
    </Router>
  );
}
