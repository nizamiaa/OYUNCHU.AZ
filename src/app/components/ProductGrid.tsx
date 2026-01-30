import { ShoppingCart, Heart, Star } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from "./CartContext";
import { useWishlist } from './WishlistContext';
import { useAuth } from './AuthContext';
import AuthPromptModal from './AuthPromptModal';
import axios from 'axios';
import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

  // 🔹 Məhsulları yüklə
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

  // 🔹 PROFESSIONAL AUTO SCROLL
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || products.length === 0) return;

    let animationFrame: number;
    const speed = 0.6;
    let currentSpeed = speed;
    let isHovered = false;
    let isUserInteracting = false;

    const originalWidth = container.scrollWidth / 2;

    const step = () => {
      container.scrollLeft += currentSpeed;

      if (container.scrollLeft >= originalWidth) {
        container.scrollLeft -= originalWidth;
      }

      animationFrame = requestAnimationFrame(step);
    };

    animationFrame = requestAnimationFrame(step);

    const onEnter = () => {
      isHovered = true;
      currentSpeed = 0;
    };

    const onLeave = () => {
      isHovered = false;
      if (!isUserInteracting) currentSpeed = speed;
    };

    const onPointerDown = () => {
      isUserInteracting = true;
      currentSpeed = 0;
    };

    const onPointerUp = () => {
      isUserInteracting = false;
      if (!isHovered) currentSpeed = speed;
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        currentSpeed = entry.isIntersecting && !isHovered && !isUserInteracting ? speed : 0;
      },
      { threshold: 0.1 }
    );

    observer.observe(container);

    container.addEventListener('mouseenter', onEnter);
    container.addEventListener('mouseleave', onLeave);
    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('pointerup', onPointerUp);

    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      container.removeEventListener('mouseenter', onEnter);
      container.removeEventListener('mouseleave', onLeave);
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointerup', onPointerUp);
    };
  }, [products]);

  if (loading) return <div className="mb-8">{t('loading')}</div>;
  if (error) return <div className="mb-8 text-red-600">{error}</div>;

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-blue-900">{t('featuredProducts')}</h2>
        <Link to="/products" className="text-blue-600 hover:text-orange-500 font-semibold transition">
          {t('viewAll')} →
        </Link>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-6 overflow-x-auto pb-4 hide-scrollbar"
      >
        {[...products, ...products].map((product, idx) => (
          <Link
            key={`${product.id}-${idx}`}
            to={`/products/${product.id}`}
            className="min-w-[260px] sm:min-w-[280px] max-w-[280px] bg-white rounded-lg shadow-lg hover:shadow-xl transition overflow-hidden group flex-shrink-0 block"
          >
            <div className="relative">
              <ImageWithFallback
                src={product.imageUrl || ''}
                alt={product.name}
                className="w-full h-64 object-cover group-hover:scale-105 transition duration-300"
              />

              {product.discount && (
                <span className="absolute top-3 right-3 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  -{product.discount}%
                </span>
              )}

              <button
                className="absolute top-3 left-3 bg-white p-2 rounded-full shadow-md hover:bg-red-50 transition"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!user) return setModalOpen(true);
                  inWishlist(product.id)
                    ? removeFromWishlist(product.id)
                    : addToWishlist(product);
                }}
              >
                <Heart
                  size={20}
                  className={inWishlist(product.id) ? 'text-red-500' : 'text-gray-400'}
                  fill={inWishlist(product.id) ? 'currentColor' : 'none'}
                />
              </button>
            </div>

            <div className="p-4">
              <h3 className="font-bold text-lg text-gray-800 mb-2">{product.name}</h3>

              <div className="flex items-center gap-2 mb-3">
                <Star size={16} className="fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-semibold">{product.rating}</span>
                <span className="text-sm text-gray-500">({product.reviews})</span>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl font-bold text-blue-600">{product.price} ₼</span>
                {product.originalPrice && (
                  <span className="text-lg text-gray-400 line-through">{product.originalPrice} ₼</span>
                )}
              </div>

              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  addToCart(product);
                }}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-orange-500 transition flex items-center justify-center gap-2 font-semibold"
              >
                <ShoppingCart size={20} />
                {t('addToCart')}
              </button>
            </div>
          </Link>
        ))}
      </div>

      <AuthPromptModal open={modalOpen} variant={'auth'} onClose={() => setModalOpen(false)} />
    </div>
  );
}
