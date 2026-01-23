import AdminLayout from './AdminLayout';
import { UserPlus, Edit, Trash2, Search, Mail, Phone } from 'lucide-react';
import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';

export default function UsersManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token, user: authUser } = useAuth();
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [creating, setCreating] = useState(false);

  const formatDate = (val?: any) => {
    if (!val) return '—';
    try {
      // handle SQL datetime strings or ISO
      const d = new Date(val);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString();
    } catch (e) { return '—'; }
  };

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

  // filtered list according to search term (name or email) + role + status
  const filteredUsers = useMemo(() => {
    const q = (searchTerm || '').toString().trim().toLowerCase();
    return users.filter(u => {
      const name = String(u.Name ?? u.name ?? '').toLowerCase();
      const email = String(u.Email ?? u.email ?? '').toLowerCase();

      // search match
      const matchesSearch = !q || name.includes(q) || email.includes(q);

      // role filter
      const roleVal = String(u.Role ?? u.role ?? 'user').toLowerCase();
      const matchesRole = selectedRoleFilter === 'all' || roleVal === selectedRoleFilter;

      // status filter: treat missing status as active
      const statusVal = String(u.Status ?? u.status ?? 'active').toLowerCase();
      const matchesStatus = selectedStatusFilter === 'all' || (selectedStatusFilter === 'active' && statusVal !== 'inactive') || (selectedStatusFilter === 'inactive' && statusVal === 'inactive');

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, selectedRoleFilter, selectedStatusFilter]);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/users');
      setUsers(res.data || []);
    } catch (e: any) {
      console.error('Failed to refresh users', e);
    } finally {
      setLoading(false);
    }
  };

  // editing state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<{Name?:string,Email?:string,Role?:string,Status?:string}>({});

  const startEdit = (u: any) => {
    setEditingId(u.Id ?? u.id);
    setEditData({
      Name: u.Name ?? u.name,
      Email: u.Email ?? u.email,
      Role: String(u.Role ?? u.role ?? 'user').toLowerCase(),
      Status: String(u.Status ?? u.status ?? 'active').toLowerCase(),
    });
  };

  const cancelEdit = () => { setEditingId(null); setEditData({}); };

  const saveEdit = async (id: number) => {
    if (!token) { alert('You must be logged in as admin to edit users'); return; }
    try {
      const payload: any = {};
      if (editData.Name) payload.Name = editData.Name;
      if (editData.Email) payload.Email = editData.Email;
      if (editData.Role) payload.Role = editData.Role;
      if (editData.Status) payload.Status = editData.Status;
      const res = await axios.put(`/api/admin/users/${id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(prev => prev.map(u => ((u.Id ?? u.id) === id ? { ...u, ...res.data } : u)));
      cancelEdit();
    } catch (e: any) {
      console.error('Failed to save user edit', e);
      alert('Failed to update user: ' + (e.response?.data?.error || e.message));
    }
  };

  const deleteUser = async (id: number) => {
    if (!token) { alert('You must be logged in as admin to delete users'); return; }
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await axios.delete(`/api/admin/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(prev => prev.filter(u => (u.Id ?? u.id) !== id));
    } catch (e: any) {
      console.error('Failed to delete user', e);
      alert('Failed to delete user: ' + (e.response?.data?.error || e.message));
    }
  };

  // computed stats
  const adminsCount = users.filter(u => String(u.Role ?? u.role ?? '').toLowerCase() === 'admin').length;
  const newThisMonth = (() => {
    const now = new Date();
    return users.filter(u => {
      const raw = u.CreatedAt ?? u.Created_at ?? u.created_at;
      if (!raw) return false;
      const d = new Date(raw);
      if (isNaN(d.getTime())) return false;
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
  })();



  return (
    <AdminLayout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Users Management</h1>
          <button onClick={()=>setShowAddModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
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
            <select value={selectedRoleFilter} onChange={(e)=>setSelectedRoleFilter(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none">
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
            <select value={selectedStatusFilter} onChange={(e)=>setSelectedStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
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
                {!loading && filteredUsers.map((user: any) => {
                  const uid = user.Id ?? user.id;
                  const isEditing = editingId === uid;
                  return (
                  <tr key={uid} className="border-b hover:bg-gray-50 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                          {(user.Name || user.name || 'U').split(' ').map((n:any) => n[0]).join('')}
                        </div>
                        {isEditing ? (
                          <input className="font-medium border-b" value={editData.Name ?? ''} onChange={(e)=>setEditData(d=>({...d, Name: e.target.value}))} />
                        ) : (
                          <span className="font-medium">{user.Name ?? user.name}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail size={14} />
                          {isEditing ? (
                            <input className="ml-2" value={editData.Email ?? ''} onChange={(e)=>setEditData(d=>({...d, Email: e.target.value}))} />
                          ) : (
                            <span>{user.Email ?? user.email}</span>
                          )}
                        </div>
                          {/* Phone removed: show only email as contact */}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <select value={editData.Role ?? (String(user.Role ?? user.role ?? 'user').toLowerCase())} onChange={(e)=>setEditData(d=>({...d, Role: e.target.value}))} className="px-2 py-1 border rounded">
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                      ) : (
                        (() => {
                          const roleVal = String(user.Role ?? user.role ?? 'user').toLowerCase();
                          const isAdmin = roleVal === 'admin';
                          return (
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {roleVal}
                            </span>
                          );
                        })()
                      )}
                    </td>
                    <td className="py-3 px-4">—</td>
                    <td className="py-3 px-4 font-semibold text-green-600">—</td>
                    <td className="py-3 px-4 text-gray-600">{formatDate(user.CreatedAt ?? user.Created_at ?? user.created_at)}</td>
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <select value={editData.Status ?? 'active'} onChange={(e)=>setEditData(d=>({...d, Status: e.target.value}))} className="px-2 py-1 border rounded">
                          <option value="active">active</option>
                          <option value="inactive">inactive</option>
                        </select>
                      ) : (
                        (() => {
                          const statusVal = String(user.Status ?? user.status ?? 'active').toLowerCase();
                          const isInactive = statusVal === 'inactive';
                          return (
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${isInactive ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {statusVal}
                            </span>
                          );
                        })()
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        {isEditing ? (
                          <>
                            <button onClick={()=>saveEdit(uid)} className="px-3 py-1 bg-green-600 text-white rounded">Save</button>
                            <button onClick={cancelEdit} className="px-3 py-1 border rounded">Cancel</button>
                          </>
                        ) : (
                          <>
                            {token && String(authUser?.role || '').toLowerCase() === 'admin' ? (
                              <>
                                <button onClick={()=>startEdit(user)} className="p-2 hover:bg-blue-50 rounded-lg transition">
                                  <Edit size={18} className="text-blue-600" />
                                </button>
                                <button onClick={()=>deleteUser(uid)} className="p-2 hover:bg-red-50 rounded-lg transition">
                                  <Trash2 size={18} className="text-red-600" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button disabled title="Login as admin to edit" className="p-2 opacity-50 rounded-lg">
                                  <Edit size={18} />
                                </button>
                                <button disabled title="Login as admin to delete" className="p-2 opacity-50 rounded-lg">
                                  <Trash2 size={18} />
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )})}
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
            <p className="text-2xl font-bold text-green-600">{users.filter(u => String(u.Status ?? u.status ?? 'active').toLowerCase() !== 'inactive').length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <p className="text-gray-600 text-sm mb-1">New This Month</p>
            <p className="text-2xl font-bold text-blue-600">{newThisMonth}</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <p className="text-gray-600 text-sm mb-1">Admins</p>
            <p className="text-2xl font-bold text-purple-600">{adminsCount}</p>
          </div>
        </div>
      </div>
      <AddUserModal open={showAddModal} onClose={()=>setShowAddModal(false)} onCreated={(u)=>{ setUsers(prev=>[u, ...prev]); }} token={token} />
    </AdminLayout>
  );
}

    // Add User Modal (rendered near end so hooks are in file scope)

    export function AddUserModal({ open, onClose, onCreated, token }: { open: boolean; onClose: ()=>void; onCreated: (u:any)=>void; token?: string | null }){
      const [name, setName] = useState('');
      const [email, setEmail] = useState('');
      const [role, setRole] = useState('user');
      const [loading, setLoading] = useState(false);

      useEffect(()=>{
        if (!open){ setName(''); setEmail(''); setRole('user'); }
      },[open]);

      const [status, setStatus] = useState('active');

      const submit = async () => {
        if (!token) { alert('Admin token required'); return; }
        if (!name || !email) { alert('Name and email required'); return; }
        try {
          setLoading(true);
          const res = await axios.post('/api/admin/users', { name, email, role, status }, { headers: { Authorization: `Bearer ${token}` } });
          if (res.data?.ok) {
            onCreated(res.data.user);
            if (res.data.password) alert('User created. Generated password: ' + res.data.password);
            onClose();
          } else {
            alert(res.data?.error || 'Failed to create user');
          }
        } catch (e: any) {
          console.error('Create user failed', e);
          alert('Create user failed: ' + (e.response?.data?.error || e.message));
        } finally { setLoading(false); }
      };

      if (!open) return null;

      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-30" onClick={onClose} />
          <div className="bg-white rounded-lg shadow-lg p-6 z-10 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New User</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Name</label>
                <input value={name} onChange={(e)=>setName(e.target.value)} className="w-full border px-3 py-2 rounded" />
              </div>
              <div>
                <label className="block text-sm mb-1">Email</label>
                <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="w-full border px-3 py-2 rounded" />
              </div>
              <div>
                <label className="block text-sm mb-1">Role</label>
                <select value={role} onChange={(e)=>setRole(e.target.value)} className="w-full border px-3 py-2 rounded">
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">Status</label>
                <select value={status} onChange={(e)=>setStatus(e.target.value)} className="w-full border px-3 py-2 rounded">
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
              <button onClick={submit} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">{loading ? 'Creating...' : 'Create'}</button>
            </div>
          </div>
        </div>
      );
    }

