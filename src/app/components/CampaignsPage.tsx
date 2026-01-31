import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { BadgePercent, ChevronRight } from 'lucide-react';

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
  const { t } = useTranslation();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await axios.get('/api/products/top-discount');

        const normalized: Product[] = (res.data || []).map((p: any) => ({
          id: Number(p.Id ?? p.id ?? 0),
          name: (p.Name ?? p.name ?? '').toString(),
          price: Number(p.Price ?? p.price ?? 0) || 0,
          originalPrice: (p.OriginalPrice ?? p.originalPrice) ? Number(p.OriginalPrice ?? p.originalPrice) : undefined,
          rating: (p.Rating ?? p.rating) ? Number(p.Rating ?? p.rating) : undefined,
          reviews: (p.Reviews ?? p.reviews) ? Number(p.Reviews ?? p.reviews) : undefined,
          imageUrl: p.ImageUrl ?? p.imageUrl ?? undefined,
          discount: (p.Discount ?? p.discount) ? Number(p.Discount ?? p.discount) : undefined,
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

  const hasProducts = products && products.length > 0;

  const headerStats = useMemo(() => {
    const count = products.length;
    const maxDiscount = Math.max(0, ...(products.map(p => Number(p.discount || 0))));
    return { count, maxDiscount };
  }, [products]);

  if (loading) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <div className="h-6 w-40 bg-gray-100 rounded mb-3" />
          <div className="h-4 w-64 bg-gray-100 rounded mb-5" />
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="h-40 sm:h-48 bg-gray-100" />
                <div className="p-3 sm:p-4">
                  <div className="h-4 bg-gray-100 rounded mb-2" />
                  <div className="h-4 w-24 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) return <div className="container mx-auto p-6 text-red-600">{error}</div>;

  return (
    <div className="container mx-auto p-4 sm:p-6">
      {/* Hero */}
      <div className="bg-white rounded-2xl border shadow-sm p-4 sm:p-6 mb-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-snug">
              {t('campaignsPage.title', 'Kampaniyalar — Endirimli Məhsullar')}
            </h1>

            <p className="text-sm sm:text-base text-gray-600 mt-2 max-w-[46ch]">
              {t('campaignsPage.subtitle', 'Ən yaxşı endirimlər və məhdud sayda fürsətlər.')}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-gray-800 text-sm whitespace-nowrap">
                <BadgePercent size={16} />
                <span className="font-semibold">{headerStats.count}</span>
                <span className="text-gray-600">{t('products', 'məhsul')}</span>
              </span>

              {hasProducts && headerStats.maxDiscount > 0 && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-50 text-orange-700 text-sm whitespace-nowrap">
                  <span className="font-semibold">{t('upTo', 'Up to')}</span>
                  <span className="font-extrabold">-{headerStats.maxDiscount}%</span>
                </span>
              )}
            </div>
          </div>

          <Link
            to="/products?discounted=1"
            className="inline-flex items-center gap-1 text-blue-600 hover:text-orange-500 font-semibold self-start sm:self-auto whitespace-nowrap"
          >
            {t('campaignsPage.viewAll', 'Bütün məhsullara bax')}
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      {/* Grid */}
      {!hasProducts ? (
        <div className="text-gray-600">{t('header.noResultsFound')}</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {products.map((p) => {
            const price = Number(p.price || 0);
            const oldPrice = p.originalPrice ? Number(p.originalPrice) : undefined;
            const discount = p.discount ? Number(p.discount) : 0;

            return (
              <Link
                key={p.id}
                to={`/products/${p.id}`}
                className="block bg-white rounded-2xl border shadow-sm hover:shadow-md transition overflow-hidden group"
              >
                {/* image */}
                <div className="relative bg-white flex items-center justify-center">
                  <img
                    src={p.imageUrl || '/placeholder.png'}
                    alt={p.name}
                    className="w-full h-36 sm:h-48 object-contain p-3 sm:p-5 group-hover:scale-[1.02] transition"
                    loading="lazy"
                  />

                  {discount > 0 && (
                    <span className="absolute top-2 right-2 bg-orange-500 text-white px-2 py-1 rounded-full text-[11px] sm:text-xs font-bold">
                      -{discount}%
                    </span>
                  )}
                </div>

                {/* content */}
                <div className="p-3 sm:p-4">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 line-clamp-2">
                    {p.name}
                  </h3>

                  <div className="mt-1 text-[11px] sm:text-xs text-gray-500">
                    {(p.reviews ?? 0)} {t('reviews') || 'reviews'}
                    {p.rating ? ` • ${t('rating') || 'Rating'} ${p.rating}` : ''}
                  </div>

                  <div className="mt-3 flex items-end justify-between gap-2">
                    <div>
                      <div className="text-base sm:text-lg font-bold text-blue-600 leading-tight">
                        {price.toFixed(2)} ₼
                      </div>
                      {oldPrice ? (
                        <div className="text-xs sm:text-sm text-gray-400 line-through">
                          {oldPrice.toFixed(2)} ₼
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
