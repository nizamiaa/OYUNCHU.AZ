import { Gamepad2, Box, Gamepad, Joystick, TrendingUp, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function CategorySidebar() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const categories = [
    { name: t('categories.playStation5'), icon: Gamepad2, color: 'text-blue-600', bgColor: 'bg-blue-50', query: { key: 'subCategory', value: 'Playstation 5' } },
    { name: t('categories.accessories'), icon: Joystick, color: 'text-purple-600', bgColor: 'bg-purple-50', query: { key: 'category', value: 'Aksesuar' } },
    { name: t('categories.console'), icon: Box, color: 'text-green-600', bgColor: 'bg-green-50', query: { key: 'category', value: 'Konsol' } },
    { name: t('categories.games'), icon: Gamepad, color: 'text-red-600', bgColor: 'bg-red-50', query: { key: 'category', value: 'Oyunlar' } },
    { name: t('categories.bestSellers'), icon: TrendingUp, color: 'text-orange-600', bgColor: 'bg-orange-50', query: { key: 'special', value: 'best-sellers' } },
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold text-blue-900 mb-4">{t('category')}</h2>
      <div className="space-y-2">
        {categories.map((category, index) => {
          const IconComponent = category.icon;
          return (
            <button
              key={index}
                onClick={() => {
                  const q = (category as any).query ?? { key: 'subCategory', value: category.name };
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
        <h3 className="font-bold text-lg mb-1">{t('categories.specialOffer')}</h3>
        <p className="text-sm mb-2">{t('categories.specialOfferDetails')}</p>
        <button
          onClick={() => navigate('/products?discounted=true')}
          className="bg-white text-orange-600 font-bold px-4 py-2 rounded-lg hover:bg-gray-100 transition text-sm"
        >
          {t('carouselSection.shopNow')}
        </button>
      </div>
    </div>
  );
}