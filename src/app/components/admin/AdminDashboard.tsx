import AdminLayout from './AdminLayout';
import { TrendingUp, ShoppingBag, Users, DollarSign } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({ totalProducts: 0, totalUsers: 0, totalReviews: 0, topProducts: [], monthly: [] });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/admin/stats', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (canceled) return;
        setStats(res.data);
      } catch (e: any) {
        console.error('Failed to load admin stats', e);
        setError(e.response?.data?.error || e.message || 'Failed to load stats');
      } finally {
        if (!canceled) setLoading(false);
      }
    };
    load();
    return () => { canceled = true; };
  }, [token]);

  if (loading) return <AdminLayout><div className="p-6">Loading dashboard...</div></AdminLayout>;
  if (error) return <AdminLayout><div className="p-6 text-red-600">{error}</div></AdminLayout>;

  const statItems = [
    { label: 'Total Products', value: stats.totalProducts, icon: DollarSign, color: 'bg-blue-500' },
    { label: 'Reviews', value: stats.totalReviews, icon: ShoppingBag, color: 'bg-orange-500' },
    { label: 'Customers', value: stats.totalUsers, icon: Users, color: 'bg-green-500' },
    { label: 'Growth', value: '—', icon: TrendingUp, color: 'bg-purple-500' }
  ];

  const salesData = stats.monthly && stats.monthly.length ? stats.monthly : [
    { month: 'Jan', sales: 0, orders: 0 },
    { month: 'Feb', sales: 0, orders: 0 },
    { month: 'Mar', sales: 0, orders: 0 },
    { month: 'Apr', sales: 0, orders: 0 },
    { month: 'May', sales: 0, orders: 0 },
    { month: 'Jun', sales: 0, orders: 0 }
  ];

  const topProducts = stats.topProducts || [];

  return (
    <AdminLayout>
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard Overview</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statItems.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <Icon size={24} className="text-white" />
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Sales Chart */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Sales Overview</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Orders Chart */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Orders Overview</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="orders" fill="#F97316" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products Table */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Top Selling Products</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 text-gray-600">Product Name</th>
                  <th className="text-left py-3 px-4 text-gray-600">Rating</th>
                  <th className="text-left py-3 px-4 text-gray-600">Reviews</th>
                  <th className="text-left py-3 px-4 text-gray-600">Price</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product: any, index: number) => (
                  <tr key={index} className="border-b hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-medium">{product.Name ?? product.name}</td>
                    <td className="py-3 px-4">{product.Rating ?? product.rating ?? 0}</td>
                    <td className="py-3 px-4">{product.Reviews ?? product.reviews ?? 0}</td>
                    <td className="py-3 px-4 font-semibold text-blue-600">{product.Price ? `$${Number(product.Price).toFixed(2)}` : '—'}</td>
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
