import AdminLayout from './AdminLayout';
import { Eye, Search } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';

export default function OrdersManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/admin/orders', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (cancelled) return;
        setOrders(res.data || []);
      } catch (e: any) {
        console.error('Failed to load orders', e);
        setError(e.response?.data?.error || e.message || 'Failed to load orders');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [token]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Delivered': 'bg-green-100 text-green-700',
      'Processing': 'bg-blue-100 text-blue-700',
      'Shipped': 'bg-purple-100 text-purple-700',
      'Pending': 'bg-yellow-100 text-yellow-700',
      'Cancelled': 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <AdminLayout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Orders Management</h1>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              Export Orders
            </button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search orders by ID or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none">
              <option>All Status</option>
              <option>Pending</option>
              <option>Processing</option>
              <option>Shipped</option>
              <option>Delivered</option>
              <option>Cancelled</option>
            </select>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none">
              <option>All Payments</option>
              <option>Credit Card</option>
              <option>PayPal</option>
              <option>Bank Transfer</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">Order ID</th>
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">Customer</th>
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">Date</th>
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">Items</th>
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">Total</th>
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">Payment</th>
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">Status</th>
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={8} className="py-6 px-4 text-center">Loading orders...</td></tr>}
                {!loading && error && <tr><td colSpan={8} className="py-6 px-4 text-center text-red-600">{error}</td></tr>}
                {!loading && !orders.length && !error && <tr><td colSpan={8} className="py-6 px-4 text-center">No orders available. If you have an Orders table, ensure its name and schema match expected fields.</td></tr>}
                {!loading && orders.map((order: any) => (
                  <tr key={order.Id ?? order.id} className="border-b hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-blue-600">{order.Id ?? order.id}</td>
                    <td className="py-3 px-4">{order.CustomerName ?? order.customer ?? order.UserName ?? '—'}</td>
                    <td className="py-3 px-4 text-gray-600">{(order.CreatedAt || order.Created_at || order.date) ? new Date(order.CreatedAt || order.Created_at || order.date).toLocaleDateString() : '—'}</td>
                    <td className="py-3 px-4">{order.ItemsCount ?? order.items ?? '—'}</td>
                    <td className="py-3 px-4 font-semibold">{order.Total ? `$${Number(order.Total).toFixed(2)}` : (order.total ? `$${Number(order.total).toFixed(2)}` : '—')}</td>
                    <td className="py-3 px-4 text-gray-600">{order.PaymentMethod ?? order.payment ?? '—'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.Status ?? order.status ?? 'Pending')}`}>
                        {order.Status ?? order.status ?? 'Pending'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button className="p-2 hover:bg-blue-50 rounded-lg transition">
                        <Eye size={18} className="text-blue-600" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <p className="text-gray-600 text-sm mb-1">Total Orders</p>
            <p className="text-2xl font-bold text-gray-800">1,234</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <p className="text-gray-600 text-sm mb-1">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">45</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <p className="text-gray-600 text-sm mb-1">Processing</p>
            <p className="text-2xl font-bold text-blue-600">89</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <p className="text-gray-600 text-sm mb-1">Delivered</p>
            <p className="text-2xl font-bold text-green-600">1,045</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
