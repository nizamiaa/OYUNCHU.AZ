import { ShoppingCart, Heart, Star } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from "./CartContext";

export default function ProductGrid() {
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const products = [
    {
      id: 1,
      name: 'PlayStation 5 Console',
      price: 499.99,
      originalPrice: 599.99,
      rating: 4.8,
      reviews: 1250,
      image: 'https://images.unsplash.com/photo-1677694690511-2e0646619c91?w=400',
      discount: 17
    },
    {
      id: 2,
      name: 'Xbox Series X Console',
      price: 449.99,
      originalPrice: 499.99,
      rating: 4.7,
      reviews: 980,
      image: 'https://images.unsplash.com/photo-1709587797077-7a2c94411514?w=400',
      discount: 10
    },
    {
      id: 3,
      name: 'Nintendo Switch OLED',
      price: 349.99,
      originalPrice: 399.99,
      rating: 4.9,
      reviews: 1500,
      image: 'https://images.unsplash.com/photo-1676261233849-0755de764396?w=400',
      discount: 13
    },
    {
      id: 4,
      name: 'DualSense Controller',
      price: 69.99,
      originalPrice: 79.99,
      rating: 4.6,
      reviews: 850,
      image: 'https://images.unsplash.com/photo-1611138290962-2c550ffd4002?w=400',
      discount: 13
    },
    {
      id: 5,
      name: 'Xbox Wireless Controller',
      price: 59.99,
      originalPrice: 69.99,
      rating: 4.5,
      reviews: 720,
      image: 'https://images.unsplash.com/photo-1611138290962-2c550ffd4002?w=400',
      discount: 14
    },
    {
      id: 6,
      name: 'Pro Controller',
      price: 64.99,
      originalPrice: 74.99,
      rating: 4.7,
      reviews: 650,
      image: 'https://images.unsplash.com/photo-1611138290962-2c550ffd4002?w=400',
      discount: 13
    }
  ];

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-blue-900">Featured Products</h2>
        <Link to="/products" className="text-blue-600 hover:text-orange-500 font-semibold transition">
          View All →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-lg shadow-lg hover:shadow-xl transition overflow-hidden group"
          >
            <div className="relative">
              <ImageWithFallback
                src={product.image}
                alt={product.name}
                className="w-full h-64 object-cover group-hover:scale-105 transition duration-300"
              />
              {product.discount > 0 && (
                <span className="absolute top-3 right-3 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  -{product.discount}%
                </span>
              )}
              <button className="absolute top-3 left-3 bg-white p-2 rounded-full shadow-md hover:bg-red-50 transition">
                <Heart size={20} className="text-red-500" />
              </button>
            </div>

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
                <span className="text-2xl font-bold text-blue-600">${product.price}</span>
                {product.originalPrice && (
                  <span className="text-lg text-gray-400 line-through">${product.originalPrice}</span>
                )}
              </div>

              <button
                onClick={() => {
                  addToCart({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    imageUrl: product.image,
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
