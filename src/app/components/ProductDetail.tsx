import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { ShoppingCart, Heart, Star } from 'lucide-react';
import AuthPromptModal from './AuthPromptModal';
import { useCart } from './CartContext';
import { useWishlist } from './WishlistContext';
import { useAuth } from './AuthContext';

type Product = {
  id: number;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  imageUrl?: string;
  rating?: number;
  reviews?: number;
  discount?: number;
};

export default function ProductDetail(){
  const { id } = useParams();
  const pid = Number(id);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { addToCart } = useCart();
  const { add: addToWishlist, remove: removeFromWishlist, contains: inWishlist } = useWishlist();
  const { user, token } = useAuth();

  // Reviews persisted in localStorage per product
  const reviewsKey = `reviews_${pid}`;
  const [reviews, setReviews] = useState<Array<{name:string,rating:number,text:string,date:string,adminReply?: string | null, adminReplyAt?: string | null}>>([]);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);

  useEffect(() => {
    const len = reviews?.length || 0;
    if (len <= 1) {
      setCurrentReviewIndex(0);
      return;
    }
    const id = setInterval(() => {
      setCurrentReviewIndex(i => (i + 1) % Math.max(1, (reviews || []).length));
    }, 4000);
    return () => clearInterval(id);
  }, [reviews]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        // Try single product endpoint first
        try {
          const res = await axios.get(`/api/products/${pid}`);
          console.log('PRODUCT RAW', res.data);
          const p = res.data;

          // If the response is incomplete (missing id or name), fall back to fetching the product list
          const missingCore = !p || (!(p.Id || p.id) && !(p.Name || p.name));
          if (missingCore) throw new Error('Incomplete product response');

          const normalized = {
            id: Number(p.Id ?? p.id ?? 0),
            name: p.Name ?? p.name ?? '',
            description: p.Description ?? p.description ?? '',
            price: p.Price !== undefined && p.Price !== null ? Number(p.Price) : 0,
            originalPrice: p.OriginalPrice !== undefined && p.OriginalPrice !== null ? Number(p.OriginalPrice) : 0,
            imageUrl: p.ImageUrl ?? p.imageUrl ?? '',
            discount: p.Discount !== undefined && p.Discount !== null ? Number(p.Discount) : 0,
            rating: p.Rating !== undefined && p.Rating !== null ? Number(p.Rating) : 0,
            reviews: p.Reviews !== undefined && p.Reviews !== null ? Number(p.Reviews) : 0,
         };

          setProduct(normalized);
          // if backend returned reviews list, use it
          if (res.data && Array.isArray(res.data.ReviewsList)) {
            const mapped = res.data.ReviewsList.map((r:any) => ({
              name: r.UserName || 'Anonymous',
              rating: r.Rating || 0,
              text: r.Comment || '',
              date: parseDateToLocalISO(r.CreatedAt),
              adminReply: (r.AdminReply ?? r.AdminReplyText) || null,
              adminReplyAt: r.AdminReplyAt || r.AdminReplyDate || null,
            }));

            // merge with any locally stored reviews to survive refresh/moderation
            try {
              const rawLocal = localStorage.getItem(reviewsKey);
              const localList = rawLocal ? JSON.parse(rawLocal) : [];
              const merged = [...mapped];
              for (const loc of (localList || [])) {
                const exists = merged.some((m:any) => m.name === loc.name && (m.text === loc.text || m.date === loc.date));
                if (!exists) merged.push(loc);
              }
              setReviews(merged);
              // focus on any review that already has an admin reply so reply is visible
              const adminIdx = merged.findIndex((m:any) => m.adminReply);
              if (adminIdx >= 0) setCurrentReviewIndex(adminIdx);
              // persist merged so local pending reviews remain
              try { localStorage.setItem(reviewsKey, JSON.stringify(merged)); } catch (e) {}
              // do not block users from submitting multiple reviews; allow duplicates
            } catch (e) {
              setReviews(mapped);
              // focus admin reply if present
              const adminIdx2 = mapped.findIndex((m:any) => m.adminReply);
              if (adminIdx2 >= 0) setCurrentReviewIndex(adminIdx2);
              // allow multiple reviews per user — don't mark as reviewed
            }
          }
        } catch (err) {
          // fallback: fetch all and find product
          const res2 = await axios.get('/api/products');
          const found = (res2.data || []).find((p:any) => (p.Id ?? p.id) === pid || p.id === pid || p.Id === pid);
          if (found) {
            setProduct({
              id: found.Id ?? found.id,
              name: found.Name ?? found.name,
              description: found.Description ?? found.description,
              price: found.Price ?? found.price,
              originalPrice: found.OriginalPrice ?? found.originalPrice,
              imageUrl: found.ImageUrl ?? found.imageUrl,
              rating: found.Rating ?? found.rating,
              reviews: found.Reviews ?? found.reviews,
              discount: found.Discount ?? found.discount,
            });
          } else {
            setError('Product not found');
          }
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed loading product');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [pid]);

  useEffect(() => {
    // only load local reviews if we don't already have server-provided reviews
    if (reviews.length) return;
    try {
      const raw = localStorage.getItem(reviewsKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        setReviews(parsed);
        const adminIdxLocal = (parsed || []).findIndex((m:any) => m.adminReply);
        if (adminIdxLocal >= 0) setCurrentReviewIndex(adminIdxLocal);
      }
    } catch (err) {
      console.error('Failed to load reviews', err);
    }
  }, [reviewsKey]);

  // update hasReviewed when reviews or user change (covers local-storage reviews)
  // do not block users from submitting multiple reviews; keep form available

  const avgRating = useMemo(() => {
  const r = reviews || [];
  const productRating = Number(product?.rating ?? 0);
  const productReviews = Number(product?.reviews ?? 0);

  const total = r.reduce((sum, rev) => sum + Number(rev.rating || 0), 0) + productRating * productReviews;
  const count = r.length + productReviews;

  return count ? +(total / count).toFixed(1) : 0;
}, [reviews, product]);


  const submitReview = async () => {
    if (!user || !token) {
      setShowAuthModal(true);
      return;
    }

    // allow submitting rating-only reviews; only block if rating not set
    if (reviewRating <= 0) return;

    try {
      const res = await axios.post(`/api/products/${pid}/reviews`, { rating: reviewRating, text: reviewText }, {
        headers: { Authorization: `Bearer ${token}` }
      });

        if (res.data && res.data.ok) {
        const inserted = res.data.review;
        const newEntry = { name: inserted.UserName || user.name || 'You', rating: inserted.Rating || reviewRating, text: inserted.Comment || reviewText, date: parseDateToLocalISO(inserted.CreatedAt), adminReply: inserted.AdminReply ?? null, adminReplyAt: inserted.AdminReplyAt ?? null };
        const next = [...reviews, newEntry];
        setReviews(next);
        // prefer showing any review that already has an admin reply; otherwise show the newly added review
        const adminIdxNew = next.findIndex((m:any) => m.adminReply);
        setCurrentReviewIndex(adminIdxNew >= 0 ? adminIdxNew : next.length - 1);
        // persist so it remains after refresh (in case server doesn't immediately return it)
        try { localStorage.setItem(reviewsKey, JSON.stringify(next)); } catch (e) {}
        // update local product aggregate view
        setProduct(p => p ? { ...p, rating: res.data.avgRating ?? p.rating, reviews: res.data.reviewCount ?? (p.reviews ?? 0) } : p);
        setReviewText(''); setReviewRating(5);
      } else {
        // fallback: store locally
        const entry = { name: user?.name ?? 'Guest', rating: reviewRating, text: reviewText, date: new Date().toISOString(), adminReply: null, adminReplyAt: null };
        const next = [...reviews, entry];
        setReviews(next);
        const adminIdxF = next.findIndex((m:any) => m.adminReply);
        setCurrentReviewIndex(adminIdxF >= 0 ? adminIdxF : next.length - 1);
        try { localStorage.setItem(reviewsKey, JSON.stringify(next)); } catch (e) {}
        setReviewText(''); setReviewRating(5);
      }
    } catch (err) {
      console.error('Submit review failed', err);
      // fallback to local storage if server fails
      const entry = { name: user?.name ?? 'Guest', rating: reviewRating, text: reviewText, date: new Date().toISOString(), adminReply: null, adminReplyAt: null };
      const next = [...reviews, entry];
      setReviews(next);
      const adminIdxErr = next.findIndex((m:any) => m.adminReply);
      setCurrentReviewIndex(adminIdxErr >= 0 ? adminIdxErr : next.length - 1);
      try { localStorage.setItem(reviewsKey, JSON.stringify(next)); } catch (e) {}
      setReviewText(''); setReviewRating(5);
    }
  };

  if (loading) return <div className="p-6">Loading product...</div>;
  if (error || !product) return <div className="p-6 text-red-600">{error ?? 'Product not found'}</div>;
    const formatPrice = (v: any) => {
    const n = Number(v);
    if (!isFinite(n)) return '— ₼';
    return `${n.toFixed(2)} ₼`;
    };

    // Parse various DB timestamp formats into an ISO string representing the same local time
    const parseDateToLocalISO = (val: any) => {
      if (!val) return new Date().toISOString();
      if (val instanceof Date) return val.toISOString();
      const s = String(val).trim();
      // If already ISO with timezone, keep as-is
      if (/\d{4}-\d{2}-\d{2}T/.test(s)) {
        try { return new Date(s).toISOString(); } catch { return new Date().toISOString(); }
      }
      // Match SQL-style 'YYYY-MM-DD HH:MM:SS' (with optional milliseconds)
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
      if (m) {
        const year = Number(m[1]), month = Number(m[2]) - 1, day = Number(m[3]);
        const hh = Number(m[4]), mm = Number(m[5]), ss = Number(m[6]);
        const dt = new Date(year, month, day, hh, mm, ss); // local time
        return dt.toISOString();
      }
      // Fallback
      try { return new Date(s).toISOString(); } catch { return new Date().toISOString(); }
    };

    const maskName = (name?: string) => {
      if (!name) return 'An****';
      const s = String(name).trim();
      if (s.length <= 2) return s;
      return s.slice(0,2) + '*'.repeat(s.length - 2);
    };


  return (
    <div className="container mx-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-lg p-6">
          <div className="flex gap-6">
            <ImageWithFallback src={product.imageUrl || ''} alt={product.name} className="w-80 h-80 object-cover rounded" />
            <div>
              <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={16} className={i < Math.round(avgRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                  ))}
                </div>
                <div className="text-sm text-gray-700 font-semibold">{avgRating} / 5</div>
                <div className="text-sm text-gray-500">({reviews.length + (product.reviews ?? 0)} reviews)</div>
              </div>
              {product.discount && product.discount > 0 && (
                <div className="inline-block bg-orange-500 text-white px-3 py-1 rounded mb-3">-{product.discount}%</div>
              )}
              <div className="text-3xl font-bold text-blue-600 mb-4">{formatPrice(product.price)}</div>
              {product.originalPrice != null && isFinite(Number(product.originalPrice)) && (
                <div className="text-sm text-gray-400 line-through mb-4">{formatPrice(product.originalPrice)}</div>
              )}
              <div className="flex gap-3">
                <button onClick={() => addToCart({ id: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl })} className="bg-blue-600 text-white px-4 py-2 rounded">Add to Cart <ShoppingCart size={14} className="inline-block ml-2"/></button>
                <button onClick={() => {
                  if (inWishlist(product.id)) removeFromWishlist(product.id); else addToWishlist({ id: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl });
                }} className="px-4 py-2 rounded border">
                  <Heart size={16} className={inWishlist(product.id) ? 'text-red-500' : 'text-gray-600'} fill={inWishlist(product.id) ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-3">Məhsul haqqında</h3>
            <p className="text-gray-700">{product.description}</p>
          </div>
          
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-3">Rəylər</h3>

            <div className="space-y-4">
              {reviews.length === 0 && <div className="text-gray-500">Hələ heç bir rəy yoxdur. Sizin rəyiniz faydalı olacaq.</div>}
              {(reviews.length <= 1 ? reviews : [(reviews || [])[currentReviewIndex]]).map((r, idx) => (
                <div key={idx} className="border rounded p-3">
                  <div className="flex items-center justify-between">
                      <div className="font-semibold">{maskName(r.name)}</div>
                    <div className="text-sm text-gray-500">{new Date(r.date).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2 text-yellow-400 mt-2">
                    {Array.from({length: r.rating}).map((_,i)=>(<Star key={i} size={14}/>))}
                  </div>
                  <div className="mt-2 text-gray-700">{r.text}</div>
                  {r.adminReply && (
                    <div className="mt-3 p-3 bg-gray-50 border-l-4 border-blue-400">
                      <div className="text-xs text-gray-600">Admin cavabı{r.adminReplyAt ? ` — ${new Date(r.adminReplyAt).toLocaleString()}` : ''}</div>
                      <div className="text-sm mt-1 text-gray-800">{r.adminReply}</div>
                    </div>
                  )}
                </div>
              ))}

              {reviews.length > 1 && (
                <div className="flex gap-2 mt-3 justify-center">
                  {reviews.map((_, i) => (
                    <button key={i} onClick={() => setCurrentReviewIndex(i)} className={`${i === currentReviewIndex ? 'bg-blue-600' : 'bg-gray-300'} w-3 h-3 rounded-full`} aria-label={`Go to review ${i+1}`} />
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6">
              <h4 className="font-semibold mb-3">Rəy yaz</h4>

              <div className="flex items-center gap-2 mb-2">
                <div className="text-sm">Sizin qiymətiniz:</div>
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

              <textarea value={reviewText} onChange={(e)=>setReviewText(e.target.value)} className="w-full border rounded p-2" rows={4} placeholder="Rəyinizi yazın... (isteğe bağlı)" />
              <div className="flex gap-3 mt-2">
                <button onClick={submitReview} className="bg-blue-600 text-white px-4 py-2 rounded">Göndər</button>
                <button onClick={()=>{setReviewText(''); setReviewRating(5);}} className="px-4 py-2 border rounded">Təmizlə</button>
              </div>
            </div>

            <AuthPromptModal open={showAuthModal} variant={'auth'} onClose={() => setShowAuthModal(false)} />
          </div>
        </div>

        <aside className="bg-white rounded-lg p-6">
          <h4 className="font-semibold mb-3">Qısa məlumat</h4>
          <div className="text-sm text-gray-600">Qiymət: <span className="font-semibold float-right">{formatPrice(product.price)}</span></div>
          {product.originalPrice != null && isFinite(Number(product.originalPrice)) && <div className="text-sm text-gray-600">Köhnə qiymət: <span className="line-through float-right">{formatPrice(product.originalPrice)}</span></div>}
          {product.discount && <div className="text-sm text-gray-600 mt-2">Endirim: <span className="text-red-600 float-right">{product.discount}%</span></div>}
        </aside>
      </div>
    </div>
  );
}
