import AdminLayout from './AdminLayout';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';

export default function ProductsManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token, user } = useAuth();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        // Try admin products (requires token). If unauthorized, fall back to public products.
        let res;
        try {
          res = await axios.get('/api/admin/products', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        } catch (e: any) {
          // If unauthorized or forbidden, fallback to public products list
          if (e.response && (e.response.status === 401 || e.response.status === 403)) {
            console.warn('Admin products unauthorized, falling back to public /api/products');
            res = await axios.get('/api/products');
          } else {
            throw e;
          }
        }
        if (cancelled) return;
        setProducts(res.data || []);
      } catch (e: any) {
        console.error('Failed to load products', e);
        setError(e.response?.data?.error || e.message || 'Failed to load products');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [token]);

  const filtered = (products || []).filter((p: any) => {
    const name = (p.Name ?? p.name ?? '').toString().toLowerCase();
    return !searchTerm.trim() || name.includes(searchTerm.toLowerCase());
  });

  const [editing, setEditing] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');

  const handleDelete = async (product: any) => {
    if ((user?.role ?? user?.Role) !== 'admin') {
      return alert('Only admins can delete products. Please login as an admin.');
    }
    if (!confirm(`Delete product "${product.Name ?? product.name}"? This cannot be undone.`)) return;
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.delete(`/api/admin/products/${product.Id ?? product.id}`, { headers });
      setProducts(prev => prev.filter((p:any) => (p.Id ?? p.id) !== (product.Id ?? product.id)));
    } catch (e:any) {
      console.error('Delete failed', e);
      alert(e.response?.data?.error || e.message || 'Failed to delete product');
    }
  };

  const handleEdit = (product: any) => {
    if ((user?.role ?? user?.Role) !== 'admin') {
      return alert('Only admins can edit products. Please login as an admin.');
    }
    setEditing(product);
    setEditName(product.Name ?? product.name ?? '');
    setEditPrice(String(product.Price ?? product.price ?? ''));
  };

  const saveEdit = async () => {
    if (!editing) return;
    const id = editing.Id ?? editing.id;
    const price = parseFloat(editPrice as string);
    if (isNaN(price)) return alert('Invalid price');
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const body: any = { Name: editName, Price: price };
      const res = await axios.put(`/api/admin/products/${id}`, body, { headers });
      setProducts(prev => prev.map((p:any) => ((p.Id ?? p.id) === id ? res.data : p)));
      setEditing(null);
    } catch (e:any) {
      console.error('Save failed', e);
      alert(e.response?.data?.error || e.message || 'Failed to save product');
    }
  };

  const cancelEdit = () => {
    setEditing(null);
  };

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
                {loading && <tr><td colSpan={6} className="py-6 px-4 text-center">Loading products...</td></tr>}
                {!loading && filtered.map((product: any) => (
                  <tr key={product.Id ?? product.id} className="border-b hover:bg-gray-50 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.ImageUrl ?? product.imageUrl}
                          alt={product.Name ?? product.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <span className="font-medium">{product.Name ?? product.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{product.Category ?? product.category ?? '—'}</td>
                    <td className="py-3 px-4 font-semibold text-blue-600">
                      {(() => {
                        const price = parseFloat(product.price);
                        return !isNaN(price) ? `$${price.toFixed(2)}` : '—';
                      })()}
                    </td>
                    <td className="py-3 px-4">{product.Stock ?? product.stock ?? '—'}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          (product.Status === 'In Stock' || (product.Stock ?? product.stock) > 0)
                            ? 'bg-green-100 text-green-700'
                            : (product.Stock ?? product.stock) === 0
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                        {product.Status ?? ((product.Stock ?? product.stock) > 0 ? 'In Stock' : 'Out of Stock')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        { (user?.role ?? user?.Role) === 'admin' ? (
                          <>
                            <button className="p-2 hover:bg-blue-50 rounded-lg transition" onClick={() => handleEdit(product)}>
                              <Edit size={18} className="text-blue-600" />
                            </button>
                            <button className="p-2 hover:bg-red-50 rounded-lg transition" onClick={() => handleDelete(product)}>
                              <Trash2 size={18} className="text-red-600" />
                            </button>
                          </>
                        ) : (
                          <div className="text-sm text-gray-400">Admin only</div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && !filtered.length && <tr><td colSpan={6} className="py-6 px-4 text-center">No products found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        {/* Edit modal */}
        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
              <h3 className="text-lg font-semibold mb-4">Edit product</h3>
              <div className="mb-3">
                <label className="block text-sm text-gray-600 mb-1">Name</label>
                <input value={editName} onChange={(e)=>setEditName(e.target.value)} className="w-full border px-3 py-2 rounded" />
              </div>
              <div className="mb-3">
                <label className="block text-sm text-gray-600 mb-1">Price</label>
                <input value={editPrice} onChange={(e)=>setEditPrice(e.target.value)} className="w-full border px-3 py-2 rounded" />
              </div>
              <div className="flex justify-end gap-2">
                <button className="px-4 py-2 rounded bg-gray-100" onClick={cancelEdit}>Cancel</button>
                <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={saveEdit}>Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
