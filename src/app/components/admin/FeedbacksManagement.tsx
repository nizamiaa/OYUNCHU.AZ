import AdminLayout from './AdminLayout';
import React, { useEffect, useState } from 'react';
import { Trash } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../AuthContext';

export default function FeedbacksManagement() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [posting, setPosting] = useState<Record<string, boolean>>({});

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
                      <th className="py-2 px-3 text-left">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {feedbacks.map((f) => (
                      <tr key={f.Id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-3 font-medium">{f.ProductName ?? `#${f.ProductId}`}</td>
                        <td className="py-2 px-3">{f.UserName || 'Anonymous'}</td>
                        <td className="py-2 px-3">{f.Rating}</td>
                        <td className="py-2 px-3 max-w-xl break-words">
                          <div className="mb-2">{f.Comment}</div>
                          {f.AdminReply && (
                            <div className="mt-2 p-2 bg-gray-50 border-l-4 border-blue-400">
                              <div className="text-xs text-gray-600">Admin reply{f.AdminReplyAt ? ` — ${new Date(f.AdminReplyAt).toLocaleString()}` : ''}</div>
                              <div className="text-sm mt-1">{f.AdminReply}</div>
                            </div>
                          )}

                          <div className="mt-2">
                            <textarea
                              value={replyDrafts[f.Id] ?? ''}
                              onChange={(e) => setReplyDrafts(prev => ({ ...prev, [f.Id]: e.target.value }))}
                              placeholder="Write a reply to this feedback..."
                              className="w-full border rounded p-2 text-sm"
                              rows={2}
                            />
                            <div className="mt-1">
                              <button
                                onClick={async () => {
                                  const txt = (replyDrafts[f.Id] || '').trim();
                                  if (!txt) return;
                                  setPosting(p => ({ ...p, [f.Id]: true }));
                                  try {
                                    const res = await axios.post(`/api/admin/feedbacks/${f.Id}/reply`, { reply: txt }, { headers: { Authorization: `Bearer ${token}` } });
                                    const created = res.data && res.data.reply ? res.data.reply : null;
                                    if (created) {
                                      setFeedbacks(prev => prev.map(it => it.Id === f.Id ? { ...it, AdminReply: created.ReplyText || txt, AdminReplyAt: created.CreatedAt || new Date().toISOString() } : it));
                                      setReplyDrafts(prev => ({ ...prev, [f.Id]: '' }));
                                    }
                                  } catch (err: any) {
                                    console.error('Failed to post reply', err);
                                    const serverMsg = err?.response?.data?.error;
                                    setError(serverMsg ? String(serverMsg) : 'Failed to post reply');
                                  } finally {
                                    setPosting(p => ({ ...p, [f.Id]: false }));
                                  }
                                }}
                                disabled={posting[f.Id]}
                                className="mt-1 inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded text-sm"
                              >
                                {posting[f.Id] ? 'Posting...' : 'Post Reply'}
                              </button>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3">{f.CreatedAt ? new Date(f.CreatedAt).toLocaleString() : '—'}</td>
                        <td className="py-2 px-3">{f.IsApproved ? 'Yes' : 'No'}</td>
                        <td className="py-2 px-3">
                          <button
                            onClick={async () => {
                              try {
                                const ok = window.confirm('Feedback-u silmək istədiyinizə əminsiniz?');
                                if (!ok) return;
                                await axios.delete(`/api/admin/feedbacks/${f.Id}`, { headers: { Authorization: `Bearer ${token}` } });
                                setFeedbacks(prev => prev.filter(it => it.Id !== f.Id));
                              } catch (err: any) {
                                console.error('Delete feedback failed', err);
                                setError(err?.response?.data?.error || err.message || 'Failed to delete feedback');
                              }
                            }}
                            className="p-2 rounded hover:bg-red-50 text-red-600"
                            title="Delete feedback"
                          >
                            <Trash size={16} />
                          </button>
                        </td>
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
