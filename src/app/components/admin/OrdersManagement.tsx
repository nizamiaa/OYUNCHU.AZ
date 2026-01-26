import AdminLayout from './AdminLayout';
import { Eye, Search, Trash } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../AuthContext';

export default function OrdersManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [paymentFilter, setPaymentFilter] = useState('All Payments');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();
  const [expandedOrder, setExpandedOrder] = useState<number | string | null>(null);
  const navigate = useNavigate();
  const [deletingId, setDeletingId] = useState<number | string | null>(null);

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

  // Derived stats from orders array
  const stats = React.useMemo(() => {
    const total = orders.length;
    const byStatus: Record<string, number> = {};
    let totalAmount = 0;
    for (const o of orders) {
      const s = (o.Status || o.status || 'Pending');
      byStatus[s] = (byStatus[s] || 0) + 1;
      const t = Number(o.Total ?? o.total ?? 0) || 0;
      totalAmount += t;
    }
    return { total, byStatus, totalAmount };
  }, [orders]);

  // compute filtered list for display (search + filters)
  const displayedOrders = React.useMemo(() => {
    const q = (searchTerm || '').trim().toLowerCase();
    return orders.filter(o => {
      // status filter
      if (statusFilter && statusFilter !== 'All Status') {
        const s = String(o.Status || o.status || '').toLowerCase();
        if (s !== statusFilter.toLowerCase()) return false;
      }
      // payment filter
      if (paymentFilter && paymentFilter !== 'All Payments') {
        const p = String(o.PaymentMethod || o.payment || o.Payment || '').toLowerCase();
        if (p !== paymentFilter.toLowerCase()) return false;
      }
      if (!q) return true;
      // search by id or customer
      const idStr = String(o.Id ?? o.id ?? '');
      if (idStr.includes(q)) return true;
      const nameParts = [] as string[];
      if (o.CustomerName) nameParts.push(o.CustomerName);
      if (o.customer) nameParts.push(o.customer);
      if (o.UserName) nameParts.push(o.UserName);
      if (o.name) nameParts.push(o.name);
      if (o.surname) nameParts.push(o.surname);
      const name = nameParts.join(' ').toLowerCase();
      if (name.includes(q)) return true;
      return false;
    });
  }, [orders, searchTerm, statusFilter, paymentFilter]);

  const toggleExpand = (id: number | string | undefined | null) => {
    if (!id) return setExpandedOrder(null);
    setExpandedOrder(prev => (prev === id ? null : id));
  };

  return (
    <AdminLayout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Orders Management</h1>
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
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">Mağaza</th>
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">Şəhər</th>
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">Date</th>
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">Items</th>
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">Total</th>
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">Payment</th>
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">Status</th>
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={9} className="py-6 px-4 text-center">Loading orders...</td></tr>}
                {!loading && error && <tr><td colSpan={9} className="py-6 px-4 text-center text-red-600">{error}</td></tr>}
                {!loading && !orders.length && !error && <tr><td colSpan={9} className="py-6 px-4 text-center">No orders available. If you have an Orders table, ensure its name and schema match expected fields.</td></tr>}
                {!loading && displayedOrders.map((order: any) => {
                  const idKey = order.Id ?? order.id;
                  return (
                  <React.Fragment key={idKey}>
                    <tr className="border-b hover:bg-gray-50 transition">
                      <td className="py-3 px-4 font-mono font-semibold text-blue-600">{idKey}</td>
                      <td className="py-3 px-4">{
                        (() => {
                          const nameParts = [] as string[];
                          if (order.CustomerName) nameParts.push(order.CustomerName);
                          if (order.customer) nameParts.push(order.customer);
                          if (order.UserName) nameParts.push(order.UserName);
                          if (order.name) nameParts.push(order.name);
                          if (order.surname) nameParts.push(order.surname);
                          const display = nameParts.filter(Boolean).join(' ').trim();
                          return display || '—';
                        })()
                      }</td>
                      <td className="py-3 px-4 text-gray-600">{order.BranchName || order.Branch || order.StoreName || order.Store || order.branchName || order.branch || '—'}</td>
                      <td className="py-3 px-4 text-gray-600">{order.City || order.city || order.CityName || order.cityName || '—'}</td>
                      <td className="py-3 px-4 text-gray-600">{
                        (() => {
                          const rawDate = order.CreatedAt || order.Created_at || order.date || order.createdAt || order.created_at || order.created || order.created_at;
                          if (!rawDate) return '—';
                          try {
                            return new Date(rawDate).toLocaleString();
                          } catch (e) {
                            return String(rawDate);
                          }
                        })()
                      }</td>
                      <td className="py-3 px-4">{
                        (() => {
                          const raw = order.ItemsCount ?? order.items;
                          if (raw == null) return '—';
                          if (Array.isArray(raw)) return raw.length;
                          if (typeof raw === 'number') return raw;
                          if (typeof raw === 'string') return raw;
                          if (typeof raw === 'object') {
                            if (raw.length && typeof raw.length === 'number') return raw.length;
                            return Object.keys(raw).length || '1';
                          }
                          return String(raw);
                        })()
                      }</td>
                      <td className="py-3 px-4 font-semibold">{order.Total ? `${Number(order.Total).toFixed(2)} ₼` : (order.total ? `${Number(order.total).toFixed(2)} ₼` : '—')}</td>
                      <td className="py-3 px-4 text-gray-600">{order.PaymentMethod ?? order.payment ?? '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.Status ?? order.status ?? 'Pending')}`}>
                          {order.Status ?? order.status ?? 'Pending'}
                        <td className="py-3 px-4 text-gray-600">{order.BranchName || order.Branch || order.StoreName || order.Store || order.branchName || order.branch || '—'}</td>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => navigate(`/admin/orders/details/${idKey}`)} className="p-2 hover:bg-blue-50 rounded-lg transition">
                            <Eye size={18} className="text-blue-600" />
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const ok = window.confirm(`Sifarişi silmək istədiyinizə əminsiniz? (#${idKey})`);
                                if (!ok) return;
                                setDeletingId(idKey);
                                await axios.delete(`/api/admin/orders/${idKey}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
                                setOrders(prev => prev.filter(o => String(o.Id ?? o.id) !== String(idKey)));
                              } catch (e: any) {
                                console.error('Delete order failed', e);
                                setError(e?.response?.data?.error || e.message || 'Failed to delete order');
                              } finally {
                                setDeletingId(null);
                              }
                            }}
                            className="p-2 hover:bg-red-50 rounded-lg transition text-red-600"
                            title="Delete order"
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {expandedOrder === idKey && (
                      <tr className="bg-gray-50">
                        <td colSpan={9} className="py-4 px-6 text-sm text-gray-700">
                          <div className="font-semibold mb-2">Order items</div>
                          {Array.isArray(order.items) ? (
                            <ul className="list-disc pl-6">
                              {order.items.map((it: any, i: number) => (
                                <li key={i}>{(it.name || it.title || `Product ${it.id || i}`)} — {it.qty ?? it.quantity ?? 1} × {it.price ? `${Number(it.price).toFixed(2)} ₼` : (it.price ? `${Number(it.price).toFixed(2)} ₼` : '—')}</li>
                              ))}
                            </ul>
                          ) : (
                            <pre className="whitespace-pre-wrap">{JSON.stringify(order.items || order, null, 2)}</pre>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )})}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats (derived from fetched orders) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <p className="text-gray-600 text-sm mb-1">Total Orders</p>
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <p className="text-gray-600 text-sm mb-1">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.byStatus['Pending'] || stats.byStatus['pending'] || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <p className="text-gray-600 text-sm mb-1">Processing</p>
            <p className="text-2xl font-bold text-blue-600">{stats.byStatus['Processing'] || stats.byStatus['processing'] || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <p className="text-gray-600 text-sm mb-1">Delivered</p>
            <p className="text-2xl font-bold text-green-600">{stats.byStatus['Delivered'] || stats.byStatus['delivered'] || 0}</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
