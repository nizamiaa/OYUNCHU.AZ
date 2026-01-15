import AdminLayout from './AdminLayout';
import { Eye, Search } from 'lucide-react';
import { useState } from 'react';

export default function OrdersManagement() {
  const [searchTerm, setSearchTerm] = useState('');

  const orders = [
    {
      id: '#ORD-1001',
      customer: 'John Doe',
      date: '2026-01-11',
      items: 3,
      total: 589.97,
      status: 'Delivered',
      payment: 'Credit Card'
    },
    {
      id: '#ORD-1002',
      customer: 'Jane Smith',
      date: '2026-01-11',
      items: 1,
      total: 499.99,
      status: 'Processing',
      payment: 'PayPal'
    },
    {
      id: '#ORD-1003',
      customer: 'Mike Johnson',
      date: '2026-01-10',
      items: 2,
      total: 419.98,
      status: 'Shipped',
      payment: 'Credit Card'
    },
    {
      id: '#ORD-1004',
      customer: 'Sarah Williams',
      date: '2026-01-10',
      items: 5,
      total: 824.95,
      status: 'Pending',
      payment: 'Bank Transfer'
    },
    {
      id: '#ORD-1005',
      customer: 'Tom Brown',
      date: '2026-01-09',
      items: 1,
      total: 349.99,
      status: 'Delivered',
      payment: 'Credit Card'
    },
    {
      id: '#ORD-1006',
      customer: 'Emily Davis',
      date: '2026-01-09',
      items: 4,
      total: 679.96,
      status: 'Cancelled',
      payment: 'PayPal'
    }
  ];

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
                {orders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50 transition">
                    <td className="py-3 px-4 font-mono font-semibold text-blue-600">{order.id}</td>
                    <td className="py-3 px-4">{order.customer}</td>
                    <td className="py-3 px-4 text-gray-600">{order.date}</td>
                    <td className="py-3 px-4">{order.items}</td>
                    <td className="py-3 px-4 font-semibold">${order.total.toFixed(2)}</td>
                    <td className="py-3 px-4 text-gray-600">{order.payment}</td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
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
