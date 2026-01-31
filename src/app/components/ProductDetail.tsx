import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { ShoppingCart, Heart, Star } from 'lucide-react';
import AuthPromptModal from './AuthPromptModal';
import { useCart } from './CartContext';
import { useWishlist } from './WishlistContext';
import { useAuth } from './AuthContext';
import { useTranslation } from 'react-i18next';

type Product = {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  imageUrl?: string;
  rating?: number;
  reviews?: number;
  discount?: number;
};

type ReviewItem = {
  id?: number;
  name: string;
  rating: number;
  text: string;
  date: string;
  adminReply?: string | null;
  adminReplyAt?: string | null;
};

const formatPrice = (v: any) => {
  const n = Number(v);
  if (!isFinite(n)) return '— ₼';
  return `${n.toFixed(2)} ₼`;
};

const formatRating = (val: any) => {
  const n = Number(val);
  if (!isFinite(n) || n <= 0) return '0';
  const s = n.toFixed(1);
  return s.endsWith('.0') ? String(Math.trunc(n)) : s;
};


// robust datetime parser
const parseDateToLocalISO = (val: any) => {
  if (!val) return new Date().toISOString();
  if (val instanceof Date) return val.toISOString();
  const s = String(val).trim();

  // ISO
  if (/\d{4}-\d{2}-\d{2}T/.test(s)) {
    try { return new Date(s).toISOString(); } catch { return new Date().toISOString(); }
  }

  // SQL: YYYY-MM-DD HH:MM:SS
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]) - 1;
    const day = Number(m[3]);
    const hh = Number(m[4]);
    const mm = Number(m[5]);
    const ss = Number(m[6]);
    const dt = new Date(year, month, day, hh, mm, ss);
    return dt.toISOString();
  }

  try { return new Date(s).toISOString(); } catch { return new Date().toISOString(); }
};


export default function ProductDetail() {
  const { id } = useParams();
  const pid = Number(id);

  const { t } = useTranslation();
  const { addToCart } = useCart();
  const { add: addToWishlist, remove: removeFromWishlist, contains: inWishlist } = useWishlist();
  const { user, token } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);

  const mapServerProduct = (p: any): Product => ({
    id: Number(p.Id ?? p.id ?? 0),
    name: p.Name ?? p.name ?? '',
    price: p.Price !== undefined && p.Price !== null ? Number(p.Price) : 0,
    originalPrice:
      p.OriginalPrice !== undefined && p.OriginalPrice !== null
        ? Number(p.OriginalPrice)
        : undefined,
    imageUrl: p.ImageUrl ?? p.imageUrl ?? '',
    discount: p.Discount !== undefined && p.Discount !== null ? Number(p.Discount) : 0,
    rating: p.Rating !== undefined && p.Rating !== null ? Number(p.Rating) : 0,
    reviews: p.Reviews !== undefined && p.Reviews !== null ? Number(p.Reviews) : 0,
  });

  const mapServerReviews = (list: any[]): ReviewItem[] =>
    (list || []).map((r: any) => ({
      id: r.Id ?? r.id,
      name: r.UserName || 'Anonymous',
      rating: Number(r.Rating || 0),
      text: r.Comment || '',
      date: parseDateToLocalISO(r.CreatedAt),
      adminReply: (r.AdminReply ?? r.AdminReplyText) || null,
      adminReplyAt: r.AdminReplyAt || r.AdminReplyDate || null,
    }));

  const loadProduct = async () => {
    if (!isFinite(pid) || pid <= 0) {
      setLoading(false);
      setError(t('productNotFound', 'Product not found'));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1) Single product
      try {
        const res = await axios.get(`/api/products/${pid}`);
        const p = res.data;

        const missingCore = !p || (!(p.Id || p.id) && !(p.Name || p.name));
        if (missingCore) throw new Error('Incomplete product response');

        const normalized = mapServerProduct(p);
        setProduct(normalized);

        const list = Array.isArray(p.ReviewsList) ? mapServerReviews(p.ReviewsList) : [];
        setReviews(list);

        // focus first review that has admin reply
        const adminIdx = list.findIndex((x) => x.adminReply);
        setCurrentReviewIndex(adminIdx >= 0 ? adminIdx : 0);

        return;
      } catch {
        // 2) Fallback list
        const res2 = await axios.get('/api/products');
        const found = (res2.data || []).find((pp: any) => (pp.Id ?? pp.id) === pid);
        if (!found) {
          setError(t('productNotFound', 'Product not found'));
          setProduct(null);
          setReviews([]);
        } else {
          setProduct({
            id: Number(found.Id ?? found.id),
            name: found.Name ?? found.name,
            price: Number(found.Price ?? found.price ?? 0),
            originalPrice: found.OriginalPrice ?? found.originalPrice,
            imageUrl: found.ImageUrl ?? found.imageUrl,
            rating: found.Rating ?? found.rating,
            reviews: found.Reviews ?? found.reviews,
            discount: found.Discount ?? found.discount,
          });
          setReviews([]); // list endpoint doesn't include reviews list
        }
      }
    } catch (e: any) {
      console.error(e);
      setError(e?.message || t('loadingFailed', 'Failed loading product'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);

  // Auto rotate visible review
  useEffect(() => {
    const len = reviews.length;
    if (len <= 1) {
      setCurrentReviewIndex(0);
      return;
    }
    const timer = setInterval(() => {
      setCurrentReviewIndex((i) => (i + 1) % len);
    }, 4000);
    return () => clearInterval(timer);
  }, [reviews]);

  // Refresh reviews periodically so admin replies appear without reload
  useEffect(() => {
    if (!isFinite(pid) || pid <= 0) return;

    let cancelled = false;

    const refresh = async () => {
      try {
        const res = await axios.get(`/api/products/${pid}`);
        if (cancelled) return;
        if (res.data) {
          setProduct(mapServerProduct(res.data));
          if (Array.isArray(res.data.ReviewsList)) {
            const list = mapServerReviews(res.data.ReviewsList);
            setReviews(list);
          }
        }
      } catch {
        // silent
      }
    };

    const tmr = setInterval(refresh, 15000);
    return () => {
      cancelled = true;
      clearInterval(tmr);
    };
  }, [pid]);

  const avgRating = useMemo(() => Number(product?.rating ?? 0), [product]);
  const totalReviewsCount = useMemo(() => Number(product?.reviews ?? 0), [product]);

  const submitReview = async () => {
    if (!user || !token) {
      setShowAuthModal(true);
      return;
    }
    if (reviewRating <= 0) return;

    try {
      const res = await axios.post(
        `/api/products/${pid}/reviews`,
        { rating: reviewRating, text: reviewText },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.ok) {
        setReviewText('');
        setReviewRating(5);

        // reload product so aggregates + list are fresh
        await loadProduct();
      }
    } catch (e) {
      console.error('Submit review failed', e);
      // burada istəsən message göstərə bilərik, amma UI-ni qarışdırmıram
    }
  };

  if (loading) return <div className="p-6">{t('loading', 'Loading...')}</div>;
  if (error || !product) return <div className="p-6 text-red-600">{error ?? t('productNotFound', 'Product not found')}</div>;

  const showing = reviews.length <= 1 ? reviews : [reviews[currentReviewIndex]];

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MAIN */}
        <div className="lg:col-span-2 bg-white rounded-xl border p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <ImageWithFallback
                src={product.imageUrl || ''}
                alt={product.name}
                className="w-full h-72 sm:h-80 object-cover rounded-xl border"
              />
            </div>

            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 break-words">
                {product.name}
              </h1>

              <div className="flex flex-wrap items-center gap-3 mb-3">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={i < Math.round(avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                    />
                  ))}
                </div>
                <div className="text-sm text-gray-700 font-semibold">{formatRating(avgRating)} / 5</div>
                <div className="text-sm text-gray-500">({totalReviewsCount} {t('reviews', 'reviews')})</div>
              </div>

              {product.discount && product.discount > 0 && (
                <div className="inline-flex items-center bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold mb-3">
                  -{product.discount}%
                </div>
              )}

              <div className="text-2xl sm:text-3xl font-bold text-blue-600">
                {formatPrice(product.price)}
              </div>

              {product.originalPrice != null &&
                isFinite(Number(product.originalPrice)) &&
                Number(product.originalPrice) > Number(product.price) && (
                  <div className="text-sm text-gray-400 line-through mt-1">
                    {formatPrice(product.originalPrice)}
                  </div>
                )}

              <div className="flex flex-wrap gap-2 mt-5">
                <button
                  onClick={() =>
                    addToCart({
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      imageUrl: product.imageUrl,
                      oldPrice: product.originalPrice,
                    } as any)
                  }
                  className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                >
                  {t('addToCart', 'Add to Cart')}
                  <ShoppingCart size={16} />
                </button>

                <button
                  onClick={() => {
                    if (inWishlist(product.id)) removeFromWishlist(product.id);
                    else addToWishlist({ id: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl });
                  }}
                  className="inline-flex items-center justify-center px-3 py-2 rounded-lg border hover:bg-gray-50"
                  aria-label="wishlist"
                >
                  <Heart
                    size={18}
                    className={inWishlist(product.id) ? 'text-red-500' : 'text-gray-600'}
                    fill={inWishlist(product.id) ? 'currentColor' : 'none'}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* REVIEWS */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-3">{t('reviews', 'Reviews')}</h3>

            <div className="space-y-4">
              {reviews.length === 0 && <div className="text-gray-500 text-sm">{t('noReviewsYet', 'No reviews yet')}</div>}

              {showing.map((r, idx) => (
                <div key={r.id ?? idx} className="border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-semibold text-gray-900">{r.name}</div>
                    <div className="text-xs text-gray-500">{new Date(r.date).toLocaleString()}</div>
                  </div>

                  <div className="flex items-center gap-1 mt-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={i < Number(r.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                      />
                    ))}
                  </div>

                  {r.text ? <div className="mt-2 text-sm text-gray-700 break-words">{r.text}</div> : null}

                  {r.adminReply && (
                    <div className="mt-3 p-3 bg-gray-50 border-l-4 border-blue-400 rounded">
                      <div className="text-xs text-gray-600">
                        Admin cavabı{r.adminReplyAt ? ` — ${new Date(r.adminReplyAt).toLocaleString()}` : ''}
                      </div>
                      <div className="text-sm mt-1 text-gray-800 break-words">{r.adminReply}</div>
                    </div>
                  )}
                </div>
              ))}

              {reviews.length > 1 && (
                <div className="flex gap-2 justify-center pt-1">
                  {reviews.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentReviewIndex(i)}
                      className={`${i === currentReviewIndex ? 'bg-blue-600' : 'bg-gray-300'} w-2.5 h-2.5 rounded-full`}
                      aria-label={`Go to review ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* WRITE REVIEW */}
            <div className="mt-6">
              <h4 className="font-semibold mb-3">{t('writeReview', 'Write a review')}</h4>

              <div className="flex items-center gap-2 mb-2">
                <div className="text-sm text-gray-700">{t('yourRating', 'Your rating')}:</div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const val = i + 1;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setReviewRating(val)}
                        className="p-1"
                        aria-label={`Rate ${val}`}
                      >
                        <Star size={18} className={val <= reviewRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="w-full border rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                rows={4}
                placeholder={t('writeReview2', 'Write your review...')}
              />

              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={submitReview}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                >
                  {t('submit', 'Submit')}
                </button>
                <button
                  onClick={() => {
                    setReviewText('');
                    setReviewRating(5);
                  }}
                  className="px-4 py-2 border rounded-lg text-sm font-semibold hover:bg-gray-50"
                >
                  {t('clear', 'Clear')}
                </button>
              </div>

              <AuthPromptModal open={showAuthModal} variant={'auth'} onClose={() => setShowAuthModal(false)} />
            </div>
          </div>
        </div>

        {/* SIDEBAR */}
        <aside className="bg-white rounded-xl border p-5 h-fit">
          <h4 className="font-semibold mb-3">{t('productDetail.shortInfo', 'Short info')}</h4>

          <div className="text-sm text-gray-700 flex justify-between py-1">
            <span>{t('price', 'Price')}:</span>
            <span className="font-semibold">{formatPrice(product.price)}</span>
          </div>

          {product.originalPrice != null &&
            isFinite(Number(product.originalPrice)) &&
            Number(product.originalPrice) > Number(product.price) && (
              <div className="text-sm text-gray-700 flex justify-between py-1">
                <span>{t('productDetail.oldPrice', 'Old price')}:</span>
                <span className="line-through text-gray-400">{formatPrice(product.originalPrice)}</span>
              </div>
            )}

          {product.discount ? (
            <div className="text-sm text-gray-700 flex justify-between py-1 mt-1">
              <span>{t('productDetail.discount', 'Discount')}:</span>
              <span className="text-red-600 font-semibold">{product.discount}%</span>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
