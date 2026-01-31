import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ShoppingCart, Heart, Star, X } from 'lucide-react';
import { useWishlist } from './WishlistContext';
import { useAuth } from './AuthContext';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useTranslation } from 'react-i18next';
import { useCart } from './CartContext';

type Product = {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  rating?: number;
  reviews?: number;
  imageUrl?: string;
  discount?: number;
  category?: string | null;
  subCategory?: string | null;
  description?: string | null;
};

export default function AllProductsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const [products, setProducts] = useState<Product[]>([]);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sortOption, setSortOption] = useState<string>(() => {
    const p = new URLSearchParams(location.search).get('sort');
    return p || '';
  });

  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    const p = new URLSearchParams(location.search).get('category');
    return p || '';
  });

  const [minPriceFilter, setMinPriceFilter] = useState<number | null>(null);
  const [maxPriceFilter, setMaxPriceFilter] = useState<number | null>(null);
  const [availableMinPrice, setAvailableMinPrice] = useState<number>(0);
  const [availableMaxPrice, setAvailableMaxPrice] = useState<number>(10000);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);

  const { addToCart } = useCart();
  const { add: addToWishlist, remove: removeFromWishlist, contains: inWishlist } = useWishlist();
  const auth = useAuth();

  const sheetRef = useRef<HTMLDivElement>(null);

  // Close filter sheet when clicking outside
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!filtersOpen) return;
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        setFiltersOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [filtersOpen]);

  // Scroll lock for sheets/modals
  useEffect(() => {
    document.body.style.overflow = (filtersOpen || loginPromptOpen) ? 'hidden' : 'auto';
  }, [filtersOpen, loginPromptOpen]);

  // Load products on query change
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams(location.search);
        const rawSub = params.get('subCategory') || params.get('subcategory') || '';
        const categoryFilter = params.get('category') || params.get('Category') || null;

        const multiSep = rawSub && (rawSub.includes(',') || rawSub.includes('|'));

        let url = '/api/products';
        if (categoryFilter) {
          url = `/api/products?category=${encodeURIComponent(categoryFilter)}`;
        } else if (rawSub && !multiSep) {
          url = `/api/products?subCategory=${encodeURIComponent(rawSub)}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const normalized: Product[] = (data || []).map((p: any) => ({
          id: Number(p.Id ?? p.id ?? p.ProductId ?? 0),
          name: p.Name ?? p.name ?? p.Title ?? '',
          description: p.Description ?? p.description ?? null,
          price: Number(p.Price ?? p.price ?? p.PriceValue ?? 0) || 0,
          originalPrice: Number(p.OriginalPrice ?? p.originalPrice ?? p.OldPrice ?? 0) || undefined,
          rating: Number(p.Rating ?? p.rating ?? 0) || 0,
          reviews: Number(p.Reviews ?? p.reviews ?? 0) || 0,
          imageUrl: p.ImageUrl ?? p.imageUrl ?? p.Image ?? undefined,
          discount: Number(p.Discount ?? p.discount ?? 0) || 0,
          category: p.Category ?? p.category ?? null,
          subCategory: p.SubCategory ?? p.Sub_Category ?? p.subCategory ?? p.subcategory ?? null,
        }));

        const specialParam = params.get('special') || null;
        if (specialParam === 'best-sellers') {
          const all = normalized.slice();
          const byDesc = all.slice().sort((a, b) => (b.price || 0) - (a.price || 0));
          const top3 = byDesc.slice(0, 3);

          const byAsc = all.slice().sort((a, b) => (a.price || 0) - (b.price || 0));
          const n = byAsc.length;
          const medianIndex = Math.floor((n - 1) / 2);
          let start = Math.max(0, medianIndex - 2);
          if (start + 5 > n) start = Math.max(0, n - 5);

          let median5 = byAsc.slice(start, start + 5);
          median5 = median5.filter(m => !top3.some(t => t.id === m.id));

          setProducts([...top3, ...median5]);
        } else {
          if (rawSub && multiSep) {
            const parts = rawSub
              .split(/[,|]/)
              .map(s => s.trim())
              .filter(Boolean)
              .map(s => s.toLowerCase());

            let filtered = normalized.filter(p => {
              const sc = (p.subCategory ?? '').toString().toLowerCase();
              return parts.includes(sc);
            });

            const discounted = params.get('discounted');
            if (discounted) filtered = filtered.filter(p => Number(p.discount || 0) > 0);

            setProducts(filtered);
          } else {
            const discounted = params.get('discounted');
            if (discounted) setProducts(normalized.filter(p => Number(p.discount || 0) > 0));
            else setProducts(normalized);
          }
        }

        // Dynamic category list
        try {
          const cats = Array.from(
            new Set(
              (normalized || [])
                .map((p) => (p.category || '').toString())
                .filter(Boolean)
            )
          ).sort();
          setCategoriesList(cats);

          const paramsCat = new URLSearchParams(location.search).get('category');
          if (paramsCat) setSelectedCategory(paramsCat);
        } catch {}

        // Price bounds + read from query
        try {
          const p2 = new URLSearchParams(location.search);
          const minParam = p2.get('minPrice');
          const maxParam = p2.get('maxPrice');
          setAvailableMinPrice(0);
          setAvailableMaxPrice(10000);
          setMinPriceFilter(minParam !== null ? Number(minParam) : null);
          setMaxPriceFilter(maxParam !== null ? Number(maxParam) : null);
        } catch {}
      } catch (err: any) {
        setError(err?.message || 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [location.search]);

  // Sync price to URL (debounced) + no history spam
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(location.search);

      if (minPriceFilter === null || Number.isNaN(minPriceFilter)) params.delete('minPrice');
      else params.set('minPrice', String(minPriceFilter));

      if (maxPriceFilter === null || Number.isNaN(maxPriceFilter)) params.delete('maxPrice');
      else params.set('maxPrice', String(maxPriceFilter));

      const next = `/products?${params.toString()}`;
      const current = `/products?${new URLSearchParams(location.search).toString()}`;

      if (next !== current) navigate(next, { replace: true });
    }, 350);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minPriceFilter, maxPriceFilter, location.search]);

  // Similar products when Playstation 5 page
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const rawSub = params.get('subCategory') || params.get('subcategory') || '';
    const isPS5Page = rawSub.toLowerCase().includes('playstation 5');

    if (!isPS5Page) {
      setSimilarProducts([]);
      return;
    }

    (async () => {
      try {
        const res = await fetch('/api/products?subCategory=PS5 Oyun');
        if (!res.ok) return setSimilarProducts([]);

        const data = await res.json();
        const normalized = (data || []).map((p: any) => ({
          id: Number(p.Id ?? p.id ?? 0),
          name: p.Name ?? p.name ?? '',
          price: Number(p.Price ?? p.price ?? 0) || 0,
          imageUrl: p.ImageUrl ?? p.imageUrl ?? p.Image ?? undefined,
        }));

        setSimilarProducts(normalized.slice(0, 12));
      } catch {
        setSimilarProducts([]);
      }
    })();
  }, [location.search]);

  // Title from query
  const pageTitle = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const rawSubForTitle = params.get('subCategory') || params.get('subcategory') || '';
    const categoryParamForTitle = params.get('category') || params.get('Category') || null;

    let title = t('allProducts');
    const specialParam = params.get('special') || null;
    if (specialParam === 'best-sellers') title = t('bestSellers');

    if (categoryParamForTitle) {
      title = decodeURIComponent(categoryParamForTitle);
    } else if (rawSubForTitle) {
      const decoded = decodeURIComponent(rawSubForTitle);
      const multi = decoded.includes(',') || decoded.includes('|');

      if (multi) {
        const parts = decoded.split(/[,|]/).map(s => s.trim()).filter(Boolean).map(s => s.toLowerCase());
        const hasPS3 = parts.some(p => /playstation\s*3/i.test(p));
        const hasPS4 = parts.some(p => /playstation\s*4/i.test(p));
        const hasPS5 = parts.some(p => /playstation\s*5/i.test(p));
        if (hasPS3 && hasPS4 && hasPS5) title = 'PlayStations';
        else title = parts.map(s => s.replace(/(^|\s)\S/g, c => c.toUpperCase())).join(' / ');
      } else {
        title = decoded;
      }
    }

    return title;
  }, [location.search, t]);

  const displayedProducts = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const categoryParam = (params.get('category') || '').toString().trim().toLowerCase();
    const tokens = categoryParam.split(/[^a-z0-9]+/i).filter(Boolean);

    let list = (products || []).filter((p) => {
      if (!categoryParam) return true;
      const hay = `${p.name || ''} ${p.category || ''} ${p.description || ''}`.toLowerCase();
      return tokens.length === 0 ? true : tokens.some(tok => hay.includes(tok));
    });

    if (minPriceFilter !== null) list = list.filter(p => (p.price || 0) >= (minPriceFilter || 0));
    if (maxPriceFilter !== null) list = list.filter(p => (p.price || 0) <= (maxPriceFilter || Number.MAX_SAFE_INTEGER));

    if (sortOption === 'price-asc') list = list.slice().sort((a, b) => (a.price || 0) - (b.price || 0));
    if (sortOption === 'price-desc') list = list.slice().sort((a, b) => (b.price || 0) - (a.price || 0));

    return list;
  }, [products, location.search, minPriceFilter, maxPriceFilter, sortOption]);

  const applyCategory = (v: string) => {
    setSelectedCategory(v);
    const params = new URLSearchParams(location.search);
    if (v) params.set('category', v);
    else params.delete('category');
    params.delete('subCategory');
    navigate(`/products?${params.toString()}`, { replace: true });
  };

  const applySort = (v: string) => {
    setSortOption(v);
    const params = new URLSearchParams(location.search);
    if (v) params.set('sort', v);
    else params.delete('sort');
    navigate(`/products?${params.toString()}`, { replace: true });
  };

  const resetAll = () => {
    setSortOption('');
    setSelectedCategory('');
    setMinPriceFilter(null);
    setMaxPriceFilter(null);
    navigate('/products', { replace: true });
  };

  if (loading) return <div className="container mx-auto p-6">{t('loading')}</div>;
  if (error) return <div className="container mx-auto p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-blue-900 mb-4 sm:mb-6">{pageTitle}</h1>

      {/* MOBILE: Filter bar */}
      <div className="md:hidden flex items-center gap-2 mb-4">
        <button
          onClick={() => setFiltersOpen(true)}
          className="flex-1 bg-gray-100 text-gray-800 px-4 py-2 rounded-lg"
        >
          {t('filters')}
        </button>

        <select
          value={sortOption}
          onChange={(e) => applySort(e.target.value)}
          className="w-44 border rounded-lg px-3 py-2 text-sm"
        >
          <option value="" disabled>{t('sort')}</option>
          <option value="price-asc">{t('price-asc')}</option>
          <option value="price-desc">{t('price-desc')}</option>
        </select>
      </div>

      {/* DESKTOP: Controls */}
      <div className="hidden md:flex md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600">{t('category')}</label>
          <select
            value={selectedCategory}
            onChange={(e) => applyCategory(e.target.value)}
            className="border rounded-full px-4 py-2 text-sm"
          >
            <option value="">{t('category')}</option>
            {categoriesList.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600">{t('sort')}</label>
          <select
            value={sortOption}
            onChange={(e) => applySort(e.target.value)}
            className="border rounded-full px-4 py-2 text-sm"
          >
            <option value="" disabled>{t('sort')}</option>
            <option value="price-asc">{t('price-asc')}</option>
            <option value="price-desc">{t('price-desc')}</option>
          </select>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">{t('price-range')}</div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={minPriceFilter ?? ''}
              onChange={(e) => setMinPriceFilter(e.target.value === '' ? null : Number(e.target.value))}
              min={availableMinPrice}
              max={availableMaxPrice}
              className="w-24 border rounded px-2 py-1 text-sm"
            />
            <span className="text-sm">—</span>
            <input
              type="number"
              value={maxPriceFilter ?? ''}
              onChange={(e) => setMaxPriceFilter(e.target.value === '' ? null : Number(e.target.value))}
              min={availableMinPrice}
              max={availableMaxPrice}
              className="w-24 border rounded px-2 py-1 text-sm"
            />
          </div>
        </div>

        <button
          onClick={resetAll}
          className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 text-sm"
        >
          {t('reset-filters')}
        </button>
      </div>

      {/* MOBILE: Filter Bottom Sheet */}
      {filtersOpen && (
        <div className="md:hidden fixed inset-0 z-[9999]">
          <div className="absolute inset-0 bg-black/40" />
          <div
            ref={sheetRef}
            className="absolute left-0 right-0 bottom-0 bg-white rounded-t-2xl shadow-2xl p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold">{t('filters')}</div>
              <button
                onClick={() => setFiltersOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-600 block mb-2">{t('category')}</label>
              <select
                value={selectedCategory}
                onChange={(e) => applyCategory(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">{t('category')}</option>
                {categoriesList.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-600 block mb-2">{t('price-range')}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={minPriceFilter ?? ''}
                  onChange={(e) => setMinPriceFilter(e.target.value === '' ? null : Number(e.target.value))}
                  min={availableMinPrice}
                  max={availableMaxPrice}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Min"
                />
                <span className="text-sm">—</span>
                <input
                  type="number"
                  value={maxPriceFilter ?? ''}
                  onChange={(e) => setMaxPriceFilter(e.target.value === '' ? null : Number(e.target.value))}
                  min={availableMinPrice}
                  max={availableMaxPrice}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Max"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { resetAll(); setFiltersOpen(false); }}
                className="flex-1 bg-gray-100 text-gray-800 px-4 py-3 rounded-lg"
              >
                {t('reset-filters')}
              </button>
              <button
                onClick={() => setFiltersOpen(false)}
                className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg"
              >
                {t('apply')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EMPTY */}
      {displayedProducts.length === 0 ? (
        <div className="text-gray-600">{t('header.noResultsFound')}</div>
      ) : (
        <>
          {/* ✅ Mobil 2 sütun, kompakt kartlar */}
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {displayedProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-xl shadow hover:shadow-lg transition overflow-hidden group cursor-pointer"
                onClick={() => navigate(`/products/${product.id}`)}
              >
                {/* IMAGE */}
                <div className="relative bg-white flex items-center justify-center">
                  <ImageWithFallback
                    src={product.imageUrl || ''}
                    alt={product.name}
                    className="w-full h-36 sm:h-48 md:h-56 lg:h-64 object-contain p-3 sm:p-6 group-hover:scale-105 transition duration-300"
                  />

                  {product.discount && product.discount > 0 && (
                    <span className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-orange-500 text-white px-2 sm:px-3 py-1 rounded-full text-[11px] sm:text-sm font-bold">
                      -{product.discount}%
                    </span>
                  )}

                  <button
                    className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-white p-2 rounded-full shadow hover:bg-red-50 transition"
                    onClick={(e) => {
                      e.stopPropagation();

                      if (!auth.isAuthenticated) {
                        setLoginPromptOpen(true);
                        return;
                      }

                      if (inWishlist(product.id)) removeFromWishlist(product.id);
                      else {
                        addToWishlist({
                          id: product.id,
                          name: product.name,
                          price: product.price,
                          imageUrl: product.imageUrl
                        });
                      }
                    }}
                    aria-label="Wishlist"
                  >
                    <Heart
                      size={18}
                      className={inWishlist(product.id) ? 'text-red-500' : 'text-gray-400'}
                      fill={inWishlist(product.id) ? 'currentColor' : 'none'}
                    />
                  </button>
                </div>

                {/* CONTENT */}
                <div className="p-3 sm:p-4">
                  <h3 className="font-semibold sm:font-bold text-sm sm:text-lg text-gray-800 mb-2 line-clamp-2">
                    {product.name}
                  </h3>

                  {/* Rating: mobilde yüngül */}
                  <div className="flex items-center gap-2 mb-2 sm:mb-3">
                    <div className="hidden sm:flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={16}
                          className={
                            product.rating && i < Math.round(product.rating)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }
                        />
                      ))}
                    </div>
                    <span className="text-xs sm:text-sm text-gray-500">
                      ({product.reviews ?? 0})
                    </span>
                  </div>

                  {/* PRICE */}
                  <div className="flex items-end justify-between gap-2 mb-3">
                    <div>
                      <div className="text-sm sm:text-base font-bold text-blue-600 leading-tight">
                        {`${Number(product.price).toFixed(2)} ₼`}
                      </div>
                      {product.originalPrice ? (
                        <div className="text-xs sm:text-base text-gray-400 line-through">
                          {`${Number(product.originalPrice).toFixed(2)} ₼`}
                        </div>
                      ) : null}
                    </div>

                    {/*  Mobil ikon-only add-to-cart */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart({
                          id: product.id,
                          name: product.name,
                          price: product.price,
                          imageUrl: product.imageUrl || undefined,
                          oldPrice: product.originalPrice || undefined
                        });
                      }}
                      className="h-10 w-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-lg bg-blue-600 text-white hover:bg-orange-500 transition flex items-center justify-center gap-2 font-semibold"
                      aria-label={t('addToCart')}
                    >
                      <ShoppingCart size={18} />
                      <span className="hidden sm:inline">{t('addToCart')}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Similar results */}
          {similarProducts && similarProducts.length > 0 && (
            <div className="mt-8 sm:mt-10">
              <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">{t('similarResults')}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                {similarProducts.map(sp => (
                  <div
                    key={sp.id}
                    className="bg-white rounded-lg shadow-sm p-3 cursor-pointer hover:shadow-md transition"
                    onClick={() => navigate(`/products/${sp.id}`)}
                  >
                    <div className="h-28 sm:h-32 flex items-center justify-center mb-2">
                      <ImageWithFallback src={sp.imageUrl || ''} alt={sp.name} className="max-h-24 sm:max-h-28 object-contain" />
                    </div>
                    <div className="text-sm font-medium mb-1 line-clamp-2">{sp.name}</div>
                    <div className="text-blue-600 font-semibold">{Number(sp.price).toFixed(2)} ₼</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Login prompt modal (wishlist üçün) */}
      {loginPromptOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setLoginPromptOpen(false)}
          />
          <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-gray-900">{t('header.login') || 'Login'}</div>
              <button
                className="p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setLoginPromptOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              {t('loginToWishlistPrompt')}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setLoginPromptOpen(false)}
                className="flex-1 bg-gray-100 text-gray-800 px-4 py-2 rounded-lg"
              >
                {t('cancel')}
              </button>

              <Link
                to="/login"
                onClick={() => setLoginPromptOpen(false)}
                className="flex-1 text-center bg-blue-600 text-white px-4 py-2 rounded-lg"
              >
                {t('header.login') || 'Login'}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}