import AdminLayout from './AdminLayout';
import { UserPlus, Edit, Trash2, Search, Mail, Phone } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';

export default function UsersManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await axios.get('/api/users');
        if (cancelled) return;
        setUsers(res.data || []);
      } catch (e: any) {
        console.error('Failed to load users', e);
        setError(e.response?.data?.error || e.message || 'Failed to load users');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [token]);



  return (
    <AdminLayout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Users Management</h1>
          <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            <UserPlus size={20} />
            Add New User
          </button>
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none">
              <option>All Roles</option>
              <option>Admin</option>
              <option>Customer</option>
            </select>
            <select className="px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none">
              <option>All Status</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">User</th>
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">Contact</th>
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">Role</th>
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">Orders</th>
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">Total Spent</th>
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">Joined</th>
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">Status</th>
                  <th className="text-left py-4 px-4 text-gray-600 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={8} className="py-6 px-4 text-center">Loading users...</td></tr>}
                {!loading && users.map((user: any) => (
                  <tr key={user.Id ?? user.id} className="border-b hover:bg-gray-50 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                          {(user.Name || user.name || 'U').split(' ').map((n:any) => n[0]).join('')}
                        </div>
                        <span className="font-medium">{user.Name ?? user.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail size={14} />
                          <span>{user.Email ?? user.email}</span>
                        </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone size={14} />
                          <span>{(user.Phone ?? user.phone) || '—'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        (user.Role === 'Admin' || user.role === 'Admin') 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {user.Role ?? user.role ?? 'Customer'}
                      </span>
                    </td>
                    <td className="py-3 px-4">—</td>
                    <td className="py-3 px-4 font-semibold text-green-600">—</td>
                    <td className="py-3 px-4 text-gray-600">—</td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        'bg-green-100 text-green-700'
                      }`}>
                        Active
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
                {!loading && !users.length && <tr><td colSpan={8} className="py-6 px-4 text-center">No users found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <p className="text-gray-600 text-sm mb-1">Total Users</p>
            <p className="text-2xl font-bold text-gray-800">{users.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <p className="text-gray-600 text-sm mb-1">Active Users</p>
            <p className="text-2xl font-bold text-green-600">{users.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <p className="text-gray-600 text-sm mb-1">New This Month</p>
            <p className="text-2xl font-bold text-blue-600">0</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <p className="text-gray-600 text-sm mb-1">Admins</p>
            <p className="text-2xl font-bold text-purple-600">{users.filter(u=> (u.Role||u.role) === 'Admin').length}</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
