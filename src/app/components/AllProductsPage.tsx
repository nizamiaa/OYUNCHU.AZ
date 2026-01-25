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
};

export default function AllProductsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToCart } = useCart();
  const { add: addToWishlist, remove: removeFromWishlist, contains: inWishlist } = useWishlist();
  const auth = useAuth();
  const [modalOpen, setModalOpen] = React.useState(false);


  useEffect(() => {
    const load = async () => {
      try {
        const params = new URLSearchParams(location.search);
        const sub = params.get('subCategory') || params.get('subcategory');
        const url = sub ? `/api/products?subCategory=${encodeURIComponent(sub)}` : '/api/products';
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const normalized = (data || []).map((p: any) => ({
          id: p.Id ?? p.id,
          name: p.Name ?? p.name ?? p.Title ?? '',
          price: Number(p.Price ?? p.price ?? p.PriceValue ?? 0) || 0,
          originalPrice: Number(p.OriginalPrice ?? p.originalPrice ?? p.OldPrice ?? 0) || undefined,
          rating: p.Rating ?? p.rating ?? 0,
          reviews: p.Reviews ?? p.reviews ?? 0,
          imageUrl: p.ImageUrl ?? p.imageUrl ?? p.Image ?? undefined,
          discount: p.Discount ?? p.discount ?? 0,
        }));
        setProducts(normalized);
      } catch (err: any) {
        setError(err.message || 'Failed to load products');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) return <div className="container mx-auto p-6">Loading products...</div>;
  if (error) return <div className="container mx-auto p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-blue-900 mb-6">All Products</h1>

      {products.length === 0 ? (
        <div className="text-gray-600">No products found.</div>
      ) : (
        (() => {
          const params = new URLSearchParams(location.search);
          const categoryParam = (params.get('category') || '').toString().trim().toLowerCase();
          const tokens = categoryParam.split(/[^a-z0-9]+/i).filter(Boolean);
          const displayedProducts = (products || []).filter((p) => {
            if (!categoryParam) return true;
            const hay = `${p.name || ''} ${(p as any).category || ''} ${(p as any).description || ''}`.toString().toLowerCase();
            return tokens.length === 0 ? true : tokens.some(t => hay.includes(t));
          });

          return (
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
                    if (!auth.isAuthenticated) {
                      setModalOpen(true);
                      return;
                    }

                    if (inWishlist(product.id)) {
                      removeFromWishlist(product.id);
                    } else {
                      addToWishlist({ id: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl });
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
          );
        })()
      )}
    </div>
  );
}
