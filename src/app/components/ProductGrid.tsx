import { ShoppingCart, Heart, Star } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from "./CartContext";
import { useWishlist } from './WishlistContext';
import { useAuth } from './AuthContext';
import AuthPromptModal from './AuthPromptModal';
import axios from 'axios';
import React, { useEffect, useState, useRef } from 'react';

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

export default function ProductGrid() {
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const { add: addToWishlist, contains: inWishlist, remove: removeFromWishlist } = useWishlist();
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get('/api/products/top-discount');

        setProducts(
          res.data.map((p: any) => ({
            id: p.Id,
            name: p.Name,
            price: p.Price,
            originalPrice: p.OriginalPrice,
            discount: p.Discount,
            rating: p.Rating,
            reviews: p.Reviews,
            imageUrl: p.ImageUrl,
          }))
        );
      } catch (err) {
        console.error(err);
        setError('Failed to load featured products');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
  if (!scrollRef.current || products.length === 0) return;

  const container = scrollRef.current;
  const scrollAmount = 300; // px
  const intervalTime = 3000; // 3 saniyə

  const interval = setInterval(() => {
      if (!container) return;

      // sona çatanda başa qayıtsın
      if (
        container.scrollLeft + container.clientWidth >=
        container.scrollWidth - 10
      ) {
        container.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    }, intervalTime);

    return () => clearInterval(interval);
  }, [products]);



  if (loading) return <div className="mb-8">Loading featured products...</div>;
  if (error) return <div className="mb-8 text-red-600">Error loading products: {error}</div>;

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-blue-900">Featured Products</h2>
        <Link to="/products" className="text-blue-600 hover:text-orange-500 font-semibold transition">
          View All →
        </Link>
      </div>

      <div ref={scrollRef} className="flex gap-6 overflow-x-auto pb-4 scroll-smooth scrollbar-hide">
        {products.map((product) => (
          <div
            key={product.id}
            className="min-w-[260px] sm:min-w-[280px] max-w-[280px] bg-white rounded-lg shadow-lg hover:shadow-xl transition overflow-hidden group flex-shrink-0"
          >
            <div className="relative">
              <ImageWithFallback
                src={product.imageUrl || ''}
                alt={product.name}
                className="w-full h-64 object-cover group-hover:scale-105 transition duration-300"
              />
              {product.discount && product.discount > 0 && (
                <span className="absolute top-3 right-3 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  -{product.discount}%
                </span>
              )}
              <button
                className="absolute top-3 left-3 bg-white p-2 rounded-full shadow-md hover:bg-red-50 transition"
                onClick={() => {
                  if (!user) {
                    setModalOpen(true);
                    return;
                  }

                  if (inWishlist(product.id)) {
                    // if already in wishlist, remove it
                    removeFromWishlist(product.id);
                    return;
                  }

                  // add to wishlist silently — heart will show filled state
                  addToWishlist({ id: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl });
                }}
              >
                <Heart
                  size={20}
                  className={inWishlist(product.id) ? 'text-red-500' : 'text-gray-400'}
                  fill={inWishlist(product.id) ? 'currentColor' : 'none'}
                />
              </button>
            </div>

            <AuthPromptModal open={modalOpen} variant={'auth'} onClose={() => setModalOpen(false)} />

            <div className="p-4">
              <h3 className="font-bold text-lg text-gray-800 mb-2">{product.name}</h3>
              
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1">
                  <Star size={16} className="fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-semibold">{product.rating}</span>
                </div>
                <span className="text-sm text-gray-500">({product.reviews} reviews)</span>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl font-bold text-blue-600">{Number(product.price).toFixed(2)} ₼</span>
                {product.originalPrice && (
                  <span className="text-lg text-gray-400 line-through">{Number(product.originalPrice).toFixed(2)} ₼</span>
                )}
              </div>

              <button
                onClick={() => {
                  addToCart({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    imageUrl: product.imageUrl || undefined,
                  });
                }}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-orange-500 transition flex items-center justify-center gap-2 font-semibold"
              >
                <ShoppingCart size={20} />
                Add to Cart
              </button>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
