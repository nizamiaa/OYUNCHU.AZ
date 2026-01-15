import AdminLayout from './AdminLayout';
import { TrendingUp, ShoppingBag, Users, DollarSign } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const stats = [
    { label: 'Total Sales', value: '$45,231', change: '+12.5%', icon: DollarSign, color: 'bg-blue-500' },
    { label: 'Orders', value: '1,234', change: '+8.2%', icon: ShoppingBag, color: 'bg-orange-500' },
    { label: 'Customers', value: '856', change: '+15.3%', icon: Users, color: 'bg-green-500' },
    { label: 'Growth', value: '23%', change: '+5.1%', icon: TrendingUp, color: 'bg-purple-500' }
  ];

  const salesData = [
    { month: 'Jan', sales: 4000, orders: 240 },
    { month: 'Feb', sales: 3000, orders: 180 },
    { month: 'Mar', sales: 5000, orders: 300 },
    { month: 'Apr', sales: 4500, orders: 270 },
    { month: 'May', sales: 6000, orders: 360 },
    { month: 'Jun', sales: 5500, orders: 330 }
  ];

  const topProducts = [
    { name: 'PlayStation 5 Console', sales: 450, revenue: '$224,550' },
    { name: 'Xbox Series X', sales: 320, revenue: '$143,968' },
    { name: 'Nintendo Switch OLED', sales: 280, revenue: '$97,972' },
    { name: 'DualSense Controller', sales: 520, revenue: '$36,395' }
  ];

  return (
    <AdminLayout>
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard Overview</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <Icon size={24} className="text-white" />
                  </div>
                  <span className="text-green-600 text-sm font-semibold">{stat.change}</span>
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
                  <th className="text-left py-3 px-4 text-gray-600">Units Sold</th>
                  <th className="text-left py-3 px-4 text-gray-600">Revenue</th>
                  <th className="text-left py-3 px-4 text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-medium">{product.name}</td>
                    <td className="py-3 px-4">{product.sales}</td>
                    <td className="py-3 px-4 font-semibold text-blue-600">{product.revenue}</td>
                    <td className="py-3 px-4">
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                        In Stock
                      </span>
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
