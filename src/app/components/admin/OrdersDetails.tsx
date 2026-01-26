import React, { useEffect, useState } from 'react';
import AdminLayout from './AdminLayout';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../AuthContext';

export default function OrdersDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrichedItems, setEnrichedItems] = useState<any[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/admin/orders/${id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (cancelled) return;
        setOrder(res.data || null);
      } catch (e: any) {
        setError(e.response?.data?.error || e.message || 'Failed to load order');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id, token]);

  // Enrich items with product name/image when possible (fetch product by id)
  useEffect(() => {
    if (!order || !Array.isArray(order.items) || !order.items.length) {
      setEnrichedItems(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const items = order.items || [];
        const ids = Array.from(new Set(items.map((it: any) => it.id).filter(Boolean)));
        if (!ids.length) {
          // nothing to fetch
          setEnrichedItems(items);
          return;
        }

        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const results = await Promise.allSettled(ids.map((pid: any) => axios.get(`/api/products/${pid}`, { headers })));
        const prodById: Record<string, any> = {};
        results.forEach((r, idx) => {
          const pid = String(ids[idx]);
          if (r.status === 'fulfilled' && r.value?.data) {
            prodById[pid] = r.value.data;
          }
        });

        const merged = items.map((it: any) => {
          const pid = String(it.id || it.ProductId || '');
          const prod = prodById[pid];
          return {
            ...it,
            name: it.name || it.title || (prod && (prod.Name || prod.name)) || `Product ${it.id || ''}`,
            imageUrl: it.imageUrl || it.image || (prod && (prod.ImageUrl || prod.imageUrl || prod.Image)) || '/images/placeholder.png'
          };
        });
        if (!cancelled) setEnrichedItems(merged);
      } catch (e) {
        setEnrichedItems(order.items);
      }
    })();

    return () => { cancelled = true; };
  }, [order, token]);

  if (loading) return <AdminLayout><div className="p-8">Loading...</div></AdminLayout>;
  if (error) return <AdminLayout><div className="p-8 text-red-600">{error}</div></AdminLayout>;
  if (!order) return <AdminLayout><div className="p-8">Order not found</div></AdminLayout>;

  const customerName = order.CustomerName || order.customer || order.UserName || `${order.name || ''} ${order.surname || ''}`.trim() || '—';
  const customerEmail = order.Email || order.email || order.customerEmail || order.userEmail || '';
  const created = order.CreatedAt || order.Created_at || order.date || order.createdAt || order.created_at || order.created || null;
  const displayItems = enrichedItems ?? (Array.isArray(order.items) ? order.items : Array.isArray(order.OrderItems) ? order.OrderItems : []);

  const getImage = (img: any) => {
    if (!img) return '/placeholder.png';
    const s = String(img || '');
    if (/^https?:\/\//i.test(s)) return s;
    if (s.startsWith('/')) return s;
    return `/${s}`;
  };

  const fmt = (v: any) => (Number.isFinite(Number(v)) ? `${Number(v).toFixed(2)} ₼` : '—');

  const statusText = String(order.Status || order.status || order.statusText || '').trim();
  const paymentStatus = String(order.PaymentStatus || order.paymentStatus || order.payment || '').trim();

  return (
    <AdminLayout>
      <div className="p-6">
        <button onClick={() => navigate(-1)} className="mb-4 text-sm text-blue-600">← Back</button>
        <h2 className="text-2xl font-semibold mb-4">Order Details — {String(id)}</h2>

        <div className="bg-white rounded-lg p-6 mb-6 border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Customer</p>
              <p className="font-semibold">{customerName}</p>
              {customerEmail ? <div className="text-sm text-gray-500">{customerEmail}</div> : null}
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="font-semibold">{order.Phone || order.phone || '—'}</p>
              <p className="text-sm text-gray-600 mt-2">Şəhər</p>
              <p className="font-semibold">{order.City || order.city || order.CityName || order.cityName || '—'}</p>
              <p className="text-sm text-gray-600 mt-2">Address</p>
              <p className="font-semibold">{order.Address || order.address || '—'}</p>
              {(
                order.BranchName || order.Branch || order.StoreName || order.Store || order.BranchId || order.StoreId
              ) ? (
                <>
                  <p className="text-sm text-gray-600 mt-2">Mağaza</p>
                  <p className="font-semibold">{order.BranchName || order.Branch || order.StoreName || order.Store || order.BranchId || order.StoreId}</p>
                </>
              ) : null}
            </div>
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="font-semibold">{created ? new Date(created).toLocaleString() : '—'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Status</p>
                  <div className="inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium" style={{ background: statusText.toLowerCase() === 'completed' ? '#ECFDF5' : statusText.toLowerCase() === 'cancelled' ? '#FFF1F2' : '#EFF6FF', color: statusText.toLowerCase() === 'completed' ? '#03543F' : statusText.toLowerCase() === 'cancelled' ? '#9F1239' : '#1E3A8A' }}>{statusText || 'Pending'}</div>
                </div>
              </div>

              <div className="mt-3">
                <p className="text-sm text-gray-600">Payment</p>
                <p className="font-semibold">{order.PaymentMethod || order.payment || '—'}</p>
                <p className="text-sm text-gray-500">{paymentStatus ? `Status: ${paymentStatus}` : ''}</p>
              </div>

              <div className="mt-3">
                <p className="text-sm text-gray-600">Delivery</p>
                <p className="font-semibold">{order.DeliveryMethod || order.deliveryMethod || '—'}</p>
              </div>
            </div>
          </div>
          {order.Note || order.note || order.Notes ? (
            <div className="mt-4 text-sm text-gray-700">{order.Note || order.note || order.Notes}</div>
          ) : null}
        </div>
        <div className="bg-white rounded-lg p-6 border">
          <h3 className="font-semibold mb-3">Items</h3>
          {Array.isArray(displayItems) && displayItems.length ? (
            (() => {
              const items = displayItems;
              const subtotal = items.reduce((s: number, it: any) => s + ((Number(it.price) || 0) * (Number(it.qty ?? it.quantity) || 1)), 0);
              return (
                <>
                  <div className="space-y-4">
                    {items.map((it: any, i: number) => (
                      <div key={i} className="flex items-center gap-4 py-3 border-b last:border-b-0">
                        <img src={getImage(it.imageUrl || it.image || it.ImageUrl)} alt={it.name || it.title || `Product ${it.id || i}`} className="w-20 h-20 object-cover rounded" />
                        <div className="flex-1">
                          <div className="font-semibold">{it.name || it.title || `Product ${it.id || i}`}</div>
                          <div className="text-sm text-gray-500 mt-1">Qty: {it.qty ?? it.quantity ?? 1}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">{it.price ? fmt(it.price) : '—'}</div>
                          <div className="text-lg font-semibold mt-1">{it.price ? fmt((Number(it.price) * (Number(it.qty ?? it.quantity) || 1)).toFixed(2)) : '—'}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between text-sm text-gray-600 mb-2"><span>Ümumi məbləğ:</span><span>{fmt(order.Subtotal ?? order.subtotal ?? subtotal)}</span></div>
                    <div className="flex justify-between text-sm text-gray-600"><span>Endirim:</span><span className="text-red-600">{fmt(order.Discount ?? order.discount ?? 0)}</span></div>
                    <div className="flex justify-between text-lg font-semibold mt-3"><span>Yekun məbləğ:</span><span>{fmt(order.Total ?? order.total ?? (subtotal - (order.Discount ?? order.discount ?? 0)))}</span></div>
                  </div>
                </>
              );
            })()
          ) : (
            <pre className="whitespace-pre-wrap">{JSON.stringify(order, null, 2)}</pre>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
