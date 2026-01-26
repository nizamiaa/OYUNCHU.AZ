import { Gamepad2, Box, Gamepad, Joystick, TrendingUp, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CategorySidebar() {
  const navigate = useNavigate();
  const categories = [
    { name: 'PlayStation 5', icon: Gamepad2, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { name: 'Aksesuarlar', icon: Joystick, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { name: 'Konsol', icon: Box, color: 'text-green-600', bgColor: 'bg-green-50' },
    { name: 'Oyunlar', icon: Gamepad, color: 'text-red-600', bgColor: 'bg-red-50' },
    { name: 'Best Sellers', icon: TrendingUp, color: 'text-orange-600', bgColor: 'bg-orange-50' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold text-blue-900 mb-4">Categories</h2>
      <div className="space-y-2">
        {categories.map((category, index) => {
          const IconComponent = category.icon;
          return (
            <button
              key={index}
              onClick={() => {
                  // map display name to query key/value when needed
                  const mapToQuery = (name: string) => {
                    if (/playstation/i.test(name) && /5/.test(name)) return { key: 'subCategory', value: 'Playstation 5' };
                    if (/aksesuar/i.test(name)) return { key: 'category', value: 'Aksesuar' };
                    if (/konsol/i.test(name)) return { key: 'category', value: 'Konsol' };
                    if (/oyun/i.test(name) || /oyunlar/i.test(name)) return { key: 'category', value: 'Oyunlar' };
                    if (/best\s*sellers/i.test(name) || /best/i.test(name) && /seller/i.test(name)) return { key: 'special', value: 'best-sellers' };
                    return { key: 'subCategory', value: name };
                  };
                  const q = mapToQuery(category.name);
                  navigate(`/products?${q.key}=${encodeURIComponent(q.value)}`);
                }}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${category.bgColor} hover:shadow-md group`}
            >
              <div className={`${category.color} group-hover:scale-110 transition`}>
                <IconComponent size={24} />
              </div>
              <span className={`font-medium ${category.color} group-hover:font-bold transition`}>
                {category.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Special Offer Banner */}
      <div className="mt-6 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white">
        <h3 className="font-bold text-lg mb-1">Special Offer!</h3>
        <p className="text-sm mb-2">Up to 50% OFF on selected items</p>
        <button
          onClick={() => navigate('/products?discounted=true')}
          className="bg-white text-orange-600 font-bold px-4 py-2 rounded-lg hover:bg-gray-100 transition text-sm"
        >
          Shop Now
        </button>
      </div>
    </div>
  );
}