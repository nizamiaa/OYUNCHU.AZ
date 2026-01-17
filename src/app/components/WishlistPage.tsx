import React from 'react';
import { useWishlist } from './WishlistContext';
import { ShoppingCart, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from './CartContext';

export default function WishlistPage(){
  const { items, remove } = useWishlist();
  const { addToCart } = useCart();
  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-4">Favorilər</h2>

      {items.length === 0 ? (
        <div className="mt-12 text-center">
          <div className="mx-auto w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Heart size={40} className="text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Hələ heç bir məhsul favorilərə əlavə edilməyib</h3>
          <p className="text-gray-600 mb-4">Sevdiyiniz məhsulları burada toplaya bilərsiniz.</p>
          <div className="flex justify-center gap-3">
            <Link to="/products" className="inline-block py-2 px-4 bg-blue-600 text-white rounded-lg">Məhsullara bax</Link>
            <Link to="/" className="inline-block py-2 px-4 border rounded-lg">Kategoriyalar</Link>
            <Link to="/checkout/cart" className="inline-block py-2 px-4 border rounded-lg">Səbət</Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(i => (
            <div key={i.id} className="bg-white border rounded-lg shadow-sm overflow-hidden">
              <img src={i.imageUrl || 'https://picsum.photos/seed/wishlist/400/300'} alt={i.name} className="w-full h-48 object-cover" />
              <div className="p-4">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="font-semibold text-lg">{i.name}</div>
                    {i.price && <div className="text-blue-600 font-bold mt-1">{Number(i.price).toFixed(2)} ₼</div>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => {
                        try {
                          remove(i.id);
                        } catch (err) {
                          console.error('Failed to remove wishlist item', err);
                        }
                      }}
                      className="text-sm bg-red-600 text-white px-3 py-1 rounded-md"
                    >Sil</button>
                    <button
                      onClick={() => {
                        try {
                          addToCart({ id: i.id, name: i.name, price: i.price || 0, imageUrl: i.imageUrl });
                          // remove from wishlist after adding to cart
                          remove(i.id);
                        } catch (err) {
                          console.error('Failed to move wishlist item to cart', err);
                        }
                      }}
                      className="text-sm bg-blue-600 text-white px-3 py-1 rounded-md"
                    >Səbətə köçür</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
