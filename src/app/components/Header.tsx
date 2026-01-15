import { Search, Heart, ShoppingCart, Menu, User, Globe } from 'lucide-react';
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

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      {/* Top Header */}
      <div className="bg-blue-600 text-white py-2 px-4">
        <div className="container mx-auto flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="text-2xl font-bold">
            GameZone
          </Link>

          {/* Middle: Campaigns & Affiliates */}
          <div className="flex gap-6">
            <button className="hover:text-orange-400 transition">Campaigns</button>
            <button className="hover:text-orange-400 transition">Affiliates</button>
          </div>

          {/* Right: Login/Register & Language */}
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 hover:text-orange-400 transition">
              <User size={20} />
              <span>Login / Register</span>
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
          {/* Categories Directory */}
          <div className="relative group">
            <button className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition">
              <Menu size={20} />
              <span>All Categories</span>
            </button>
            
            {/* Dropdown Menu */}
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

          {/* Search Bar */}
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

          {/* Favorites & Cart */}
          <div className="flex items-center gap-4">
            <button className="relative p-2 hover:bg-gray-100 rounded-lg transition">
              <Heart size={24} className="text-blue-600" />
              <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                0
              </span>
            </button>
            <Link to="/basket" className="relative p-2 hover:bg-gray-100 rounded-lg transition">
              <ShoppingCart size={24} className="text-blue-600" />
              <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                0
              </span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
