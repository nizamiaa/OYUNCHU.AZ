import React from 'react';
import { useWishlist } from './WishlistContext';
import { ShoppingCart, Heart, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from './CartContext';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useTranslation } from 'react-i18next';

export default function WishlistPage() {
  const { items, remove } = useWishlist();
  const { addToCart } = useCart();
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">
          {t('wishlist.title')}
        </h2>

        <Link
          to="/products"
          className="text-sm sm:text-base font-semibold text-blue-600 hover:text-orange-500 transition"
        >
          {t('wishlist.viewProducts')}
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="mt-10 sm:mt-14 text-center">
          <div className="mx-auto w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Heart size={34} className="text-gray-400" />
          </div>

          <h3 className="text-lg sm:text-xl font-semibold mb-2">
            {t('wishlist.emptyMessage')}
          </h3>

          <p className="text-sm sm:text-base text-gray-600 mb-5 max-w-md mx-auto">
            {t('wishlist.emptyDescription')}
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-md mx-auto">
            <Link
              to="/products"
              className="inline-flex justify-center items-center py-2.5 px-4 bg-blue-600 text-white rounded-lg hover:bg-orange-500 transition font-semibold"
            >
              {t('wishlist.viewProducts')}
            </Link>
            <Link
              to="/"
              className="inline-flex justify-center items-center py-2.5 px-4 border rounded-lg hover:bg-gray-50 transition font-semibold"
            >
              {t('wishlist.categories')}
            </Link>
            <Link
              to="/checkout/cart"
              className="inline-flex justify-center items-center py-2.5 px-4 border rounded-lg hover:bg-gray-50 transition font-semibold"
            >
              {t('wishlist.cart')}
            </Link>
          </div>
        </div>
      ) : (
        <div
          className="
            grid gap-4 sm:gap-5 lg:gap-6
            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-3
            xl:grid-cols-4
          "
        >
          {items.map((i) => (
            <div
              key={i.id}
              className="
                bg-white border rounded-xl shadow-sm overflow-hidden
                hover:shadow-md transition
                flex flex-col
              "
            >
              {/* ✅ Kliklənən hissə (detail-ə aparır) */}
              <Link to={`/products/${i.id}`} className="block">
                <div className="relative">
                  <ImageWithFallback
                    src={i.imageUrl || 'https://picsum.photos/seed/wishlist/400/300'}
                    alt={i.name}
                    className="w-full h-44 sm:h-48 md:h-52 object-cover bg-gray-100"
                    loading="lazy"
                  />
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/25 to-transparent" />
                </div>

                <div className="p-3 sm:p-4">
                  <div className="font-semibold text-sm sm:text-base md:text-lg line-clamp-2">
                    {i.name}
                  </div>

                  <div className="mt-1 text-blue-600 font-bold text-sm sm:text-base">
                    {Number(i.price || 0).toFixed(2)} ₼
                  </div>
                </div>
              </Link>

              {/* ✅ Action düymələri (linki bloklamasın deyə stopPropagation) */}
              <div className="px-3 sm:px-4 pb-3 sm:pb-4 mt-auto">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      try {
                        remove(i.id);
                      } catch (err) {
                        console.error('Failed to remove wishlist item', err);
                      }
                    }}
                    className="
                      inline-flex items-center justify-center gap-2
                      text-sm
                      border rounded-lg
                      px-4 py-2
                      hover:bg-gray-50 transition
                      flex-1 min-w-[140px]
                    "
                    aria-label="Remove"
                  >
                    <Trash2 size={18} />
                    <span>Sil</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      try {
                        addToCart({ id: i.id, name: i.name, price: i.price || 0, imageUrl: i.imageUrl });
                        remove(i.id);
                      } catch (err) {
                        console.error('Failed to move wishlist item to cart', err);
                      }
                    }}
                    className="
                      inline-flex items-center justify-center gap-2
                      text-sm
                      bg-blue-600 text-white
                      rounded-lg
                      px-4 py-2
                      hover:bg-orange-500 transition
                      flex-1 min-w-[140px]
                    "
                    aria-label="Add to cart"
                  >
                    <ShoppingCart size={18} />
                    <span>{t('wishlist.card')}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
