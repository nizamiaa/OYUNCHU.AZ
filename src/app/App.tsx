import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { CartProvider } from "./components/CartContext";

import Header from "./components/Header";
import HomePage from "./components/HomePage";
import AllProductsPage from "./components/AllProductsPage";
import CartPage from "./components/CartPage";

export default function App() {
  return (
    <CartProvider>
      <Router>
        <Header />

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<AllProductsPage />} />
          <Route path="/checkout/cart" element={<CartPage />} />
        </Routes>
      </Router>
    </CartProvider>
  );
}
