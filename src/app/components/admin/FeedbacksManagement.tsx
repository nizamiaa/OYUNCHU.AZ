import AdminLayout from './AdminLayout';
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../AuthContext';

export default function FeedbacksManagement() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      setLoading(true);
      if (!token) {
        setError('Zəhmət olmasa admin hesabı ilə daxil olun');
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get('/api/admin/feedbacks', { headers: { Authorization: `Bearer ${token}` } });
        if (canceled) return;
        setFeedbacks(res.data || []);
      } catch (e: any) {
        console.error('Failed to load feedbacks', e);
        const serverMsg = e?.response?.data?.error;
        const status = e?.response?.status;
        setError(serverMsg ? `${serverMsg}` : `Failed to load feedbacks (${status || 'error'})`);
      } finally {
        if (!canceled) setLoading(false);
      }
    };
    load();
    return () => { canceled = true; };
  }, [token]);

  return (
    <AdminLayout>
      <div>
        <h1 className="text-2xl font-bold mb-4">User Feedbacks</h1>

        {loading && <div>Loading feedbacks...</div>}
        {error && <div className="text-red-600">{error}</div>}

        {!loading && !error && (
          <div className="bg-white rounded-lg shadow p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 px-3 text-left">Product</th>
                    <th className="py-2 px-3 text-left">User</th>
                    <th className="py-2 px-3 text-left">Rating</th>
                    <th className="py-2 px-3 text-left">Comment</th>
                    <th className="py-2 px-3 text-left">Created</th>
                    <th className="py-2 px-3 text-left">Approved</th>
                  </tr>
                </thead>
                <tbody>
                  {feedbacks.map((f) => (
                    <tr key={f.Id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3 font-medium">{f.ProductName ?? `#${f.ProductId}`}</td>
                      <td className="py-2 px-3">{f.UserName || 'Anonymous'}</td>
                      <td className="py-2 px-3">{f.Rating}</td>
                      <td className="py-2 px-3 max-w-xl break-words">{f.Comment}</td>
                      <td className="py-2 px-3">{f.CreatedAt ? new Date(f.CreatedAt).toLocaleString() : '—'}</td>
                      <td className="py-2 px-3">{f.IsApproved ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
