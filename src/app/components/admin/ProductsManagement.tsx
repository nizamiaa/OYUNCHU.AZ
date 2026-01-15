import AdminLayout from './AdminLayout';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { useState } from 'react';

export default function ProductsManagement() {
  const [searchTerm, setSearchTerm] = useState('');

  const products = [
    {
      id: 1,
      name: 'PlayStation 5 Console',
      category: 'Consoles',
      price: 499.99,
      stock: 45,
      status: 'In Stock',
      image: 'https://images.unsplash.com/photo-1677694690511-2e0646619c91?w=100'
    },
    {
      id: 2,
      name: 'Xbox Series X Console',
      category: 'Consoles',
      price: 449.99,
      stock: 32,
      status: 'In Stock',
      image: 'https://images.unsplash.com/photo-1709587797077-7a2c94411514?w=100'
    },
    {
      id: 3,
      name: 'Nintendo Switch OLED',
      category: 'Consoles',
      price: 349.99,
      stock: 58,
      status: 'In Stock',
      image: 'https://images.unsplash.com/photo-1676261233849-0755de764396?w=100'
    },
    {
      id: 4,
      name: 'DualSense Controller',
      category: 'Controllers',
      price: 69.99,
      stock: 120,
      status: 'In Stock',
      image: 'https://images.unsplash.com/photo-1611138290962-2c550ffd4002?w=100'
    },
    {
      id: 5,
      name: 'Xbox Wireless Controller',
      category: 'Controllers',
      price: 59.99,
      stock: 8,
      status: 'Low Stock',
      image: 'https://images.unsplash.com/photo-1611138290962-2c550ffd4002?w=100'
    },
    {
      id: 6,
      name: 'Pro Controller',
      category: 'Controllers',
      price: 64.99,
      stock: 0,
      status: 'Out of Stock',
      image: 'https://images.unsplash.com/photo-1611138290962-2c550ffd4002?w=100'
    }
  ];

  return (
    <AdminLayout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Products Management</h1>
          <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            <Plus size={20} />
            Add New Product
          </button>
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none">
              <option>All Categories</option>
              <option>Consoles</option>
              <option>Controllers</option>
              <option>Accessories</option>
            </select>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none">
              <option>All Status</option>
              <option>In Stock</option>
              <option>Low Stock</option>
              <option>Out of Stock</option>
            </select>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">Product</th>
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">Category</th>
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">Price</th>
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">Stock</th>
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">Status</th>
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b hover:bg-gray-50 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <span className="font-medium">{product.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{product.category}</td>
                    <td className="py-3 px-4 font-semibold text-blue-600">${product.price}</td>
                    <td className="py-3 px-4">{product.stock}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          product.status === 'In Stock'
                            ? 'bg-green-100 text-green-700'
                            : product.status === 'Low Stock'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {product.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button className="p-2 hover:bg-blue-50 rounded-lg transition">
                          <Edit size={18} className="text-blue-600" />
                        </button>
                        <button className="p-2 hover:bg-red-50 rounded-lg transition">
                          <Trash2 size={18} className="text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
