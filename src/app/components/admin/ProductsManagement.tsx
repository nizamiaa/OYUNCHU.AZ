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

  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedAvailability, setSelectedAvailability] = useState('');

  const filtered = (products || []).filter((p: any) => {
    const name = (p.Name ?? p.name ?? '').toString().toLowerCase();
    const matchesSearch = !searchTerm.trim() || name.includes(searchTerm.toLowerCase());
    const categoryVal = (p.Category ?? p.category ?? '').toString();
    const matchesCategory = !selectedCategory || selectedCategory === '' || categoryVal === selectedCategory;
    // derive display availability (Var or Yoxdur) using same logic as table
    const availabilityRaw = p.Availability ?? '';
    const availability = availabilityRaw.toString().trim().toLowerCase();
    const statusRaw = (p.Status ?? '').toString().trim();
    const hasStockNum = (p.Stock ?? p.stock) != null;
    const hasStock = Number(p.Stock ?? p.stock ?? 0) > 0;
    let displayAvail = 'Var';
    if (availability) {
      displayAvail = (availability === 'var' || availability === 'available' || availability === 'in stock') ? 'Var' : 'Yoxdur';
    } else if (statusRaw) {
      displayAvail = statusRaw.toLowerCase() === 'in stock' ? 'Var' : 'Yoxdur';
    } else if (hasStockNum) {
      displayAvail = hasStock ? 'Var' : 'Yoxdur';
    } else {
      displayAvail = 'Var';
    }
    const matchesAvailability = !selectedAvailability || selectedAvailability === '' || displayAvail === selectedAvailability;
    return matchesSearch && matchesCategory && matchesAvailability;
  });

  const [editing, setEditing] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editOriginalPrice, setEditOriginalPrice] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSubCategory, setEditSubCategory] = useState('');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newOriginalPrice, setNewOriginalPrice] = useState('');
  const [newAvailable, setNewAvailable] = useState('var');
  const [newImage, setNewImage] = useState('');
  const [newSubCategory, setNewSubCategory] = useState('');
  const [editAvailable, setEditAvailable] = useState('var');

  const handleDelete = async (product: any) => {
    if ((user?.role) !== 'admin') {
      return alert('Only admins can delete products. Please login as an  admin.');
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
    if ((user?.role) !== 'admin') {
      return alert('Only admins can edit products. Please login as an admin.');
    }
    setEditing(product);
    setEditName(product.Name ?? product.name ?? '');
    setEditPrice(String(product.Price ?? product.price ?? ''));
    setEditOriginalPrice(String(product.OriginalPrice ?? product.originalPrice ?? ''));
    setEditAvailable((product.Stock ?? product.stock ?? 0) > 0 ? 'var' : 'yoxdur');
    setEditImage(product.ImageUrl ?? product.imageUrl ?? '');
    setEditCategory(product.Category ?? product.category ?? '');
    setEditSubCategory(product.SubCategory ?? product.Sub_Category ?? product.subCategory ?? product.subcategory ?? '');
  };

  const saveEdit = async () => {
    if (!editing) return;
    const id = editing.Id ?? editing.id;
    const price = parseFloat(editPrice as string);
    if (isNaN(price)) return alert('Invalid price');
    const originalPrice = parseFloat(editOriginalPrice as string);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const body: any = { Name: editName, Price: price };
      if (!isNaN(originalPrice)) body.OriginalPrice = originalPrice;
      // availability -> Status (send Availability flag only, not numeric Stock)
      body.Status = editAvailable === 'var' ? 'In Stock' : 'Out of Stock';
      body.Availability = editAvailable;
      if (editImage && editImage.toString().trim()) body.ImageUrl = editImage;
      if (editCategory && editCategory.toString().trim()) body.Category = editCategory;
      if (editSubCategory && editSubCategory.toString().trim()) body.SubCategory = editSubCategory;
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
          <button onClick={() => { setAdding(true); setNewName(''); setNewPrice(''); setNewImage(''); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
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
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none">
              <option value="">All Categories</option>
              {Array.from(new Set((products || []).map((p:any) => (p.Category ?? p.category ?? '').toString()).filter(Boolean))).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select value={selectedAvailability} onChange={(e) => setSelectedAvailability(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none">
              <option value="">Hamısı</option>
              <option value="Var">Var</option>
              <option value="Yoxdur">Yoxdur</option>
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
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">SubCategory</th>
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">Price</th>
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">Availability</th>
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={5} className="py-6 px-4 text-center">Loading products...</td></tr>}
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
                    <td className="py-3 px-4 text-gray-600">{product.SubCategory ?? product.Sub_Category ?? product.subCategory ?? product.subcategory ?? '—'}</td>
                    <td className="py-3 px-4 font-semibold text-blue-600">
                      {(() => {
                        const price = parseFloat(product.price);
                        return !isNaN(price) ? `$${price.toFixed(2)}` : '—';
                      })()}
                    </td>
                    <td className="py-3 px-4">
                        {(() => {
                          // Prefer explicit Availability flag if present, then Status or numeric Stock.
                          const availabilityRaw = product.Availability ?? '';
                          const availability = availabilityRaw.toString().trim().toLowerCase();
                          const statusRaw = (product.Status ?? '').toString().trim();
                          const hasStockNum = (product.Stock ?? product.stock) != null;
                          const hasStock = Number(product.Stock ?? product.stock ?? 0) > 0;

                          let displayIsVar: boolean;
                          if (availability) {
                            displayIsVar = (availability === 'var' || availability === 'available' || availability === 'in stock');
                          } else if (statusRaw) {
                            displayIsVar = statusRaw.toLowerCase() === 'in stock';
                          } else if (hasStockNum) {
                            displayIsVar = hasStock;
                          } else {
                            // No explicit info — default to Var per request
                            displayIsVar = true;
                          }

                          return (
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${displayIsVar ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {displayIsVar ? 'Var' : 'Yoxdur'}
                            </span>
                          );
                        })()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        { (user?.role) === 'admin' ? (
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
                {!loading && !filtered.length && <tr><td colSpan={5} className="py-6 px-4 text-center">No products found.</td></tr>}
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
              <div className="mb-3">
                <label className="block text-sm text-gray-600 mb-1">Original Price</label>
                <input value={editOriginalPrice} onChange={(e)=>setEditOriginalPrice(e.target.value)} className="w-full border px-3 py-2 rounded" />
              </div>
              <div className="mb-3 text-sm text-gray-600">
                {(() => {
                  const p = parseFloat(editPrice as string);
                  const o = parseFloat(editOriginalPrice as string);
                  if (!isNaN(p) && !isNaN(o) && o > 0 && p < o) {
                    const disc = Math.round(((o - p) / o) * 100);
                    return (<div>Auto discount: <span className="font-semibold">{disc}%</span></div>);
                  }
                  return (<div>Auto discount: <span className="font-semibold">0%</span></div>);
                })()}
              </div>
              <div className="mb-3">
                <label className="block text-sm text-gray-600 mb-1">Availability</label>
                <select value={editAvailable} onChange={e=>setEditAvailable(e.target.value)} className="w-full border px-3 py-2 rounded">
                  <option value="var">Var</option>
                  <option value="yoxdur">Yoxdur</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="block text-sm text-gray-600 mb-1">SubCategory</label>
                <input value={editSubCategory} onChange={(e)=>setEditSubCategory(e.target.value)} className="w-full border px-3 py-2 rounded" />
              </div>
              <div className="mb-3">
                <label className="block text-sm text-gray-600 mb-1">Category</label>
                <input value={editCategory} onChange={(e)=>setEditCategory(e.target.value)} className="w-full border px-3 py-2 rounded" />
              </div>
              <div className="mb-3">
                <label className="block text-sm text-gray-600 mb-1">Image</label>
                <input value={editImage} onChange={(e)=>setEditImage(e.target.value)} className="w-full border px-3 py-2 rounded" />
              </div>
              <div className="flex justify-end gap-2">
                <button className="px-4 py-2 rounded bg-gray-100" onClick={cancelEdit}>Cancel</button>
                <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={saveEdit}>Save</button>
              </div>
            </div>
          </div>
        )}
        {/* Add modal */}
        {adding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
              <h3 className="text-lg font-semibold mb-4">Add new product</h3>
              <div className="mb-3">
                <label className="block text-sm text-gray-600 mb-1">Name</label>
                <input value={newName} onChange={(e)=>setNewName(e.target.value)} className="w-full border px-3 py-2 rounded" />
              </div>
              <div className="mb-3">
                <label className="block text-sm text-gray-600 mb-1">Price</label>
                <input value={newPrice} onChange={(e)=>setNewPrice(e.target.value)} className="w-full border px-3 py-2 rounded" />
              </div>
              <div className="mb-3">
                <label className="block text-sm text-gray-600 mb-1">Original Price</label>
                <input value={newOriginalPrice} onChange={(e)=>setNewOriginalPrice(e.target.value)} className="w-full border px-3 py-2 rounded" />
                              <label className="block text-sm text-gray-600 mb-1">Availability</label>
                              <select value={newAvailable} onChange={e=>setNewAvailable(e.target.value)} className="w-full border px-3 py-2 rounded">
                                <option value="var">Var</option>
                                <option value="yoxdur">Yoxdur</option>
                              </select>
              </div>
              <div className="mb-3 text-sm text-gray-600">
                {(() => {
                  const p = parseFloat(newPrice as string);
                  const o = parseFloat(newOriginalPrice as string);
                  if (!isNaN(p) && !isNaN(o) && o > 0 && p < o) {
                    const disc = Math.round(((o - p) / o) * 100);
                    return (<div>Auto discount: <span className="font-semibold">{disc}%</span></div>);
                  }
                  return (<div>Auto discount: <span className="font-semibold">0%</span></div>);
                })()}
              </div>
              <div className="mb-3">
                <label className="block text-sm text-gray-600 mb-1">Image</label>
                <input value={newImage} onChange={(e)=>setNewImage(e.target.value)} className="w-full border px-3 py-2 rounded" />
              </div>
              <div className="mb-3">
                <label className="block text-sm text-gray-600 mb-1">SubCategory</label>
                <input value={newSubCategory} onChange={(e)=>setNewSubCategory(e.target.value)} className="w-full border px-3 py-2 rounded" />
              </div>
              <div className="flex justify-end gap-2">
                <button className="px-4 py-2 rounded bg-gray-100" onClick={() => setAdding(false)}>Cancel</button>
                <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={async () => {
                  const price = parseFloat(newPrice as string);
                  if (!newName?.toString().trim()) return alert('Name required');
                  if (isNaN(price)) return alert('Invalid price');
                  const headers = token ? { Authorization: `Bearer ${token}` } : {};
                  const originalPrice = parseFloat(newOriginalPrice as string);
                  const body: any = { Name: newName, Price: price, ImageUrl: newImage || undefined };
                  if (!isNaN(originalPrice)) body.OriginalPrice = originalPrice;
                  // send Status and Availability only (no numeric Stock)
                  body.Status = newAvailable === 'var' ? 'In Stock' : 'Out of Stock';
                  body.Availability = newAvailable;
                  if (newSubCategory && newSubCategory.toString().trim()) body.SubCategory = newSubCategory;
                  try {
                    const res = await axios.post('/api/admin/products', body, { headers });
                    setProducts(prev => [res.data, ...(prev || [])]);
                    setAdding(false);
                    return;
                  } catch (e:any) {
                    console.warn('Create via relative path failed, will try direct backend:', e?.response?.status || e?.code || e?.message);
                    // try direct backend as fallback (useful when dev server proxy not available)
                    try {
                      const backendUrl = 'http://localhost:4000/api/admin/products';
                      const res2 = await axios.post(backendUrl, body, { headers });
                      setProducts(prev => [res2.data, ...(prev || [])]);
                      setAdding(false);
                      return;
                    } catch (e2:any) {
                      console.error('Create fallback failed', e2);
                      alert(e2.response?.data?.error || e2.message || 'Failed to create product');
                    }
                  }
                }}>Create</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
