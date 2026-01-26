import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, Heart, Star } from 'lucide-react';
import { useWishlist } from './WishlistContext';
import { useAuth } from './AuthContext';
import AuthPromptModal from './AuthPromptModal';
import { ImageWithFallback } from './figma/ImageWithFallback';
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
};

export default function AllProductsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
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
  const { addToCart } = useCart();
  const { add: addToWishlist, remove: removeFromWishlist, contains: inWishlist } = useWishlist();
  const auth = useAuth();
  const [modalOpen, setModalOpen] = React.useState(false);


  useEffect(() => {
    const load = async () => {
      try {
        const params = new URLSearchParams(location.search);
        const rawSub = params.get('subCategory') || params.get('subcategory') || '';
        const categoryFilter = params.get('category') || params.get('Category') || null;

        // If rawSub contains multiple values (comma or pipe separated), we'll fetch all products
        // and filter client-side by SubCategory. Otherwise prefer server-side subCategory/category filter.
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
          price: Number(p.Price ?? p.price ?? p.PriceValue ?? 0) || 0,
          originalPrice: Number(p.OriginalPrice ?? p.originalPrice ?? p.OldPrice ?? 0) || undefined,
          rating: p.Rating ?? p.rating ?? 0,
          reviews: p.Reviews ?? p.reviews ?? 0,
          imageUrl: p.ImageUrl ?? p.imageUrl ?? p.Image ?? undefined,
          discount: p.Discount ?? p.discount ?? 0,
          // include category/subcategory for client-side filtering
          category: p.Category ?? p.category ?? null,
          subCategory: p.SubCategory ?? p.Sub_Category ?? p.subCategory ?? p.subcategory ?? null,
        }));
        // Special handling for `special=best-sellers`: pick top 3 by price and 5 around median price
        const specialParam = params.get('special') || null;
        if (specialParam === 'best-sellers') {
          const all = normalized.slice();
          const byDesc = all.slice().sort((a: Product, b: Product) => (b.price || 0) - (a.price || 0));
          const top3 = byDesc.slice(0, 3);

          const byAsc = all.slice().sort((a: Product, b: Product) => (a.price || 0) - (b.price || 0));
          const n = byAsc.length;
          const medianIndex = Math.floor((n - 1) / 2);
          let start = Math.max(0, medianIndex - 2);
          if (start + 5 > n) start = Math.max(0, n - 5);
          let median5 = byAsc.slice(start, start + 5);
          // avoid duplicates
          median5 = median5.filter((m: Product) => !top3.some((t: Product) => t.id === m.id));

          const combined = [...top3, ...median5];
          setProducts(combined);
          return;
        }
        // If multiple subCategory values were requested, apply client-side filtering
        if (rawSub && multiSep) {
          const parts = rawSub.split(/[,|]/).map(s => s.trim()).filter(Boolean).map(s => s.toLowerCase());
          const filtered = normalized.filter((p:any) => {
            const sc = (p.subCategory ?? '').toString().toLowerCase();
            return parts.includes(sc);
          });
          // allow discounted-only filter on multi-sub results as well
          const discounted = params.get('discounted');
          if (discounted) {
            setProducts(filtered.filter((p: Product) => Number(p.discount || 0) > 0));
          } else {
            setProducts(filtered);
          }
        } else {
          // handle discounted filter (banner "Shop Now")
          const discounted = params.get('discounted');
          if (discounted) {
            const only = normalized.filter((p: Product) => Number(p.discount || 0) > 0);
            setProducts(only);
          } else {
            setProducts(normalized);
          }
        }
        // build dynamic category list from normalized products
        try {
          const cats: string[] = Array.from(new Set((normalized || []).map((p: Product) => (p.category || '').toString()).filter(Boolean))).sort();
          setCategoriesList(cats);
          const paramsCat = new URLSearchParams(location.search).get('category');
          if (paramsCat) setSelectedCategory(paramsCat);
        } catch (e) {}
        // initialize available price range to 0..10000 (fixed bounds)
        try {
          const params = new URLSearchParams(location.search);
          const minParam = params.get('minPrice');
          const maxParam = params.get('maxPrice');
          setAvailableMinPrice(0);
          setAvailableMaxPrice(10000);
          setMinPriceFilter(minParam ? Number(minParam) : 0);
          setMaxPriceFilter(maxParam ? Number(maxParam) : 10000);
        } catch (e) {}
      } catch (err: any) {
        setError(err.message || 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [location.search]);

  // Sync price filters to the URL with debounce so typing immediately filters
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(location.search);
      if (minPriceFilter === null) params.delete('minPrice'); else params.set('minPrice', String(minPriceFilter));
      if (maxPriceFilter === null) params.delete('maxPrice'); else params.set('maxPrice', String(maxPriceFilter));
      // preserve existing other params
      navigate(`/products?${params.toString()}`);
    }, 350);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minPriceFilter, maxPriceFilter]);

  // Load similar items when viewing Playstation 5 subCategory — prefer PS5 games, fallback to PS3/PS4
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



  if (loading) return <div className="container mx-auto p-6">Loading products...</div>;
  if (error) return <div className="container mx-auto p-6 text-red-600">Error: {error}</div>;

  // Derive page title from query params so header becomes dynamic
  const paramsForTitle = new URLSearchParams(location.search);
  const rawSubForTitle = paramsForTitle.get('subCategory') || paramsForTitle.get('subcategory') || '';
  const categoryParamForTitle = paramsForTitle.get('category') || paramsForTitle.get('Category') || null;
  let pageTitle = 'All Products';
  const specialParamForTitle = paramsForTitle.get('special') || null;
  if (specialParamForTitle === 'best-sellers') pageTitle = 'Best Sellers';
  
  if (categoryParamForTitle) {
    pageTitle = decodeURIComponent(categoryParamForTitle);
  } else if (rawSubForTitle) {
    const decoded = decodeURIComponent(rawSubForTitle);
    const multi = decoded.includes(',') || decoded.includes('|');
    if (multi) {
      const parts = decoded.split(/[,|]/).map(s => s.trim()).filter(Boolean).map(s => s.toLowerCase());
      // common grouping: PlayStations includes Playstation 3/4/5
      const hasPS3 = parts.some(p => /playstation\s*3/i.test(p));
      const hasPS4 = parts.some(p => /playstation\s*4/i.test(p));
      const hasPS5 = parts.some(p => /playstation\s*5/i.test(p));
      if (hasPS3 && hasPS4 && hasPS5) pageTitle = 'PlayStations';
      else pageTitle = parts.map(s => s.replace(/(^|\s)\S/g, t => t.toUpperCase())).join(' / ');
    } else {
      pageTitle = decoded;
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-blue-900 mb-6">{pageTitle}</h1>

      {/* Controls: Sort + Price Range */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600">Kateqoriya</label>
          <select
            value={selectedCategory}
            onChange={(e) => {
              const v = e.target.value;
              setSelectedCategory(v);
              const params = new URLSearchParams(location.search);
              if (v) params.set('category', v); else params.delete('category');
              // clear subCategory when category chosen
              params.delete('subCategory');
              navigate(`/products?${params.toString()}`);
            }}
            className="border rounded-full px-4 py-2 text-sm"
          >
            <option value="">Kateqoriya</option>
            {categoriesList.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-600">Sırala</label>
          <select
            value={sortOption}
            onChange={(e) => {
              const v = e.target.value;
              setSortOption(v);
              const params = new URLSearchParams(location.search);
              if (v) params.set('sort', v); else params.delete('sort');
              navigate(`/products?${params.toString()}`);
            }}
            className="border rounded-full px-4 py-2 text-sm"
          >
            <option value="" disabled>Sırala</option>
            <option value="price-asc">Əvvəlcə ucuz</option>
            <option value="price-desc">Əvvəlcə bahalı</option>
          </select>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">Qiymət aralığı</div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={minPriceFilter ?? ''}
              onChange={(e) => {
                const v = e.target.value === '' ? null : Number(e.target.value);
                setMinPriceFilter(v);
              }}
              min={availableMinPrice}
              max={availableMaxPrice}
              className="w-24 border rounded px-2 py-1 text-sm"
            />
            <span className="text-sm">—</span>
            <input
              type="number"
              value={maxPriceFilter ?? ''}
              onChange={(e) => {
                const v = e.target.value === '' ? null : Number(e.target.value);
                setMaxPriceFilter(v);
              }}
              min={availableMinPrice}
              max={availableMaxPrice}
              className="w-24 border rounded px-2 py-1 text-sm"
            />
          </div>
        </div>
        <div className="flex items-center">
          <button
            onClick={() => {
              setSortOption('');
              setSelectedCategory('');
              setMinPriceFilter(null);
              setMaxPriceFilter(null);
              // navigate to base products page without query to fully clear filters
              navigate('/products');
            }}
            className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 text-sm"
          >
            Filtrləri sıfırla
          </button>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="text-gray-600">No products found.</div>
      ) : (
        (() => {
          const params = new URLSearchParams(location.search);
          const categoryParam = (params.get('category') || '').toString().trim().toLowerCase();
          const tokens = categoryParam.split(/[^a-z0-9]+/i).filter(Boolean);
          let displayedProducts = (products || []).filter((p) => {
            if (!categoryParam) return true;
            const hay = `${p.name || ''} ${(p as any).category || ''} ${(p as any).description || ''}`.toString().toLowerCase();
            return tokens.length === 0 ? true : tokens.some(t => hay.includes(t));
          });

          // apply price filters if present
          if (minPriceFilter !== null) displayedProducts = displayedProducts.filter((p) => (p.price || 0) >= (minPriceFilter || 0));
          if (maxPriceFilter !== null) displayedProducts = displayedProducts.filter((p) => (p.price || 0) <= (maxPriceFilter || Number.MAX_SAFE_INTEGER));

          // apply sorting only when user selected an option
          if (sortOption === 'price-asc') {
            displayedProducts = displayedProducts.slice().sort((a: Product, b: Product) => (a.price || 0) - (b.price || 0));
          } else if (sortOption === 'price-desc') {
            displayedProducts = displayedProducts.slice().sort((a: Product, b: Product) => (b.price || 0) - (a.price || 0));
          }

          return (
            <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-xl shadow-lg hover:shadow-xl transition overflow-hidden group cursor-pointer"
              onClick={() => navigate(`/products/${product.id}`)}
            >
              {/* IMAGE */}
              <div className="relative bg-white flex items-center justify-center">
                <ImageWithFallback
                  src={product.imageUrl || ''}
                  alt={product.name}
                  className="w-full h-48 md:h-56 lg:h-64 object-contain p-6 group-hover:scale-105 transition duration-300"
                />

                {product.discount && product.discount > 0 && (
                  <span className="absolute top-3 right-3 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                    -{product.discount}%
                  </span>
                )}

                <button
                  className="absolute top-3 left-3 bg-white p-2 rounded-full shadow-md hover:bg-red-50 transition"
                  onClick={(e) => {
                    e.stopPropagation();
                    try {
                      console.debug('[wishlist] click', { id: product.id, product });
                      if (!auth.isAuthenticated) {
                        setModalOpen(true);
                        return;
                      }

                      if (inWishlist(product.id)) {
                        removeFromWishlist(product.id);
                        console.debug('[wishlist] removed', product.id);
                      } else {
                        addToWishlist({ id: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl });
                        console.debug('[wishlist] added', product.id);
                      }
                    } catch (err) {
                      console.error('Wishlist action failed', err);
                      try { alert('Wishliste əlavə etmək alınmadı. Konsolda səhvi yoxlayın.'); } catch (e) {}
                    }
                  }}
                >
                  <Heart
                    size={20}
                    className={inWishlist(product.id) ? 'text-red-500' : 'text-gray-400'}
                    fill={inWishlist(product.id) ? 'currentColor' : 'none'}
                  />
                </button>
              </div>

              {/* CONTENT */}
              <div className="p-4">
                <h3 className="font-bold text-lg text-gray-800 mb-2 line-clamp-2">
                  {product.name}
                </h3>

                {/* RATING */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1">
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
                  <span className="text-sm text-gray-500">
                    ({product.reviews ?? 0})
                  </span>
                </div>

                {/* PRICE */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl font-bold text-blue-600">
                    {`${Number(product.price).toFixed(2)} ₼`}
                  </span>
                  {product.originalPrice && (
                    <span className="text-lg text-gray-400 line-through">
                      {`${Number(product.originalPrice).toFixed(2)} ₼`}
                    </span>
                  )}
                </div>

                {/* BUTTON */}
                <button
                  onClick={(e) => { e.stopPropagation(); addToCart({ id: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl || undefined, oldPrice: product.originalPrice || undefined }); }}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-orange-500 transition flex items-center justify-center gap-2 font-semibold"
                >
                  <ShoppingCart size={20} />
                  Add to Cart
                </button>
              </div>
            </div>
              ))}
            </div>
            {/* Similar results section */}
            {similarProducts && similarProducts.length > 0 && (
              <div className="mt-10">
                <h2 className="text-2xl font-semibold mb-4">Oxşar nəticələr</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {similarProducts.map(sp => (
                    <div key={sp.id} className="bg-white rounded-lg shadow-sm p-3 cursor-pointer" onClick={() => navigate(`/products/${sp.id}`)}>
                      <div className="h-32 flex items-center justify-center mb-2">
                        <ImageWithFallback src={sp.imageUrl || ''} alt={sp.name} className="max-h-28 object-contain" />
                      </div>
                      <div className="text-sm font-medium mb-1">{sp.name}</div>
                      <div className="text-blue-600 font-semibold">{Number(sp.price).toFixed(2)} ₼</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </>
          );
        })()
      )}
    </div>
  );
}
