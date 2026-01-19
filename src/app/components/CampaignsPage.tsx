import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

type Product = {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  rating?: number;
  reviews?: number;
  imageUrl?: string;
  discount?: number;
};

export default function CampaignsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get('/api/products/top-discount');
        const normalized = (res.data || []).map((p: any) => ({
          id: p.Id ?? p.id,
          name: p.Name ?? p.name,
          price: p.Price ?? p.price,
          originalPrice: p.OriginalPrice ?? p.originalPrice,
          rating: p.Rating ?? p.rating,
          reviews: p.Reviews ?? p.reviews,
          imageUrl: p.ImageUrl ?? p.imageUrl,
          discount: p.Discount ?? p.discount,
        }));
        setProducts(normalized);
      } catch (err) {
        console.error('Campaigns load failed', err);
        setError('Failed to load campaigns');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) return <div className="p-6">Loading campaigns...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-blue-900">Campaigns — Discounted Products</h1>
        <Link to="/products" className="text-blue-600 hover:text-orange-500">View all products</Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((p) => (
          <Link key={p.id} to={`/products/${p.id}`} className="block bg-white rounded-lg shadow p-4 hover:shadow-lg transition">
            <div className="h-48 bg-gray-100 rounded overflow-hidden mb-3">
              <img src={p.imageUrl || '/placeholder.png'} alt={p.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg text-gray-800">{p.name}</h3>
                <div className="text-sm text-gray-500">{p.reviews ?? 0} reviews • Rating {p.rating ?? '-'}</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-blue-600">{Number(p.price).toFixed(2)} ₼</div>
                {p.originalPrice && <div className="text-sm text-gray-400 line-through">{Number(p.originalPrice).toFixed(2)} ₼</div>}
                {p.discount && <div className="text-sm text-orange-500 font-semibold">-{p.discount}%</div>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
