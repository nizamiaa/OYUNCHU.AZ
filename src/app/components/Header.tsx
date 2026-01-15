import { Search, Heart, ShoppingCart, Menu, User, Globe } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Header() {
  const categories = [
    'PlayStation 5',
    'Xbox Series X/S',
    'Nintendo Switch',
    'Controllers',
    'Games',
    'Accessories'
  ];

  const [modal, setModal] = useState<{ open: boolean; mode: 'login' | 'register' }>({
    open: false,
    mode: 'login'
  });

  // 🔒 Scroll lock when modal open
  useEffect(() => {
    document.body.style.overflow = modal.open ? 'hidden' : 'auto';
  }, [modal.open]);

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      {/* Top Header */}
      <div className="bg-blue-600 text-white py-2 px-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold">
            Oyunchu
          </Link>

          <div className="flex gap-6">
            <button className="hover:text-orange-400 transition">Campaigns</button>
            <button className="hover:text-orange-400 transition">Affiliates</button>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setModal({ open: true, mode: 'login' })}
              className="flex items-center gap-2 hover:text-orange-400 transition"
            >
              <User size={20} />
              <span>Login</span>
            </button>

            <button className="flex items-center gap-2 hover:text-orange-400 transition">
              <Globe size={20} />
              <span>EN</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Header */}
      <div className="bg-white py-3 px-4 border-b">
        <div className="container mx-auto flex justify-between items-center">
          {/* Categories */}
          <div className="relative group">
            <button className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition">
              <Menu size={20} />
              <span>All Categories</span>
            </button>

            <div className="absolute hidden group-hover:block top-full left-0 mt-1 bg-white shadow-xl rounded-lg w-64 py-2 border">
              {categories.map((category, index) => (
                <button
                  key={index}
                  className="block w-full text-left px-4 py-2 hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 mx-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Search for consoles, games, accessories..."
                className="w-full px-4 py-2 pr-12 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition">
                <Search size={20} />
              </button>
            </div>
          </div>

          {/* Icons */}
          <div className="flex items-center gap-4">
            <button className="relative p-2 hover:bg-gray-100 rounded-lg transition">
              <Heart size={24} className="text-blue-600" />
              <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                0
              </span>
            </button>
            <button className="relative p-2 hover:bg-gray-100 rounded-lg transition">
              <ShoppingCart size={24} className="text-blue-600" />
              <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                0
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 🔥 MODAL + BLUR */}
      {modal.open && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center">
          {/* Blur Overlay */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
            onClick={() => setModal({ ...modal, open: false })}
          />

          {/* Modal */}
          <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {modal.mode === 'login' ? 'Login' : 'Register'}
              </h3>
              <button
                className="text-gray-500 hover:text-black"
                onClick={() => setModal({ ...modal, open: false })}
              >
                ✕
              </button>
            </div>

            {modal.mode === 'login' ? (
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" required className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Password</label>
                  <input type="password" required className="w-full px-3 py-2 border rounded" />
                </div>
                <button className="w-full bg-blue-600 text-white py-2 rounded">
                  Sign in
                </button>
                <p className="text-sm text-center">
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    className="text-blue-600 underline"
                    onClick={() => setModal({ open: true, mode: 'register' })}
                  >
                    Register
                  </button>
                </p>
              </form>
            ) : (
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input type="text" required className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" required className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Password</label>
                  <input type="password" required className="w-full px-3 py-2 border rounded" />
                </div>
                <button className="w-full bg-blue-600 text-white py-2 rounded">
                  Create account
                </button>
                <p className="text-sm text-center">
                  Already have an account?{' '}
                  <button
                    type="button"
                    className="text-blue-600 underline"
                    onClick={() => setModal({ open: true, mode: 'login' })}
                  >
                    Login
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
