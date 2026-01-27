import Slider from 'react-slick';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export default function CarouselSection() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const carouselImages = [
    {
      url: 'https://images.unsplash.com/photo-1677694690511-2e0646619c91?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwbGF5c3RhdGlvbiUyMGNvbnNvbGUlMjBnYW1pbmd8ZW58MXx8fHwxNzY4MTE4NTY5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      title: t('carouselSection.playStation5'),
      description: t('carouselSection.playStationDescription')
    },
    {
      url: 'https://images.unsplash.com/photo-1709587797077-7a2c94411514?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx4Ym94JTIwY29uc29sZSUyMGdhbWluZ3xlbnwxfHx8fDE3NjgxMTg1Njl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      title: t('carouselSection.games'),
      description: t('carouselSection.gamesDescription'),
      category: 'Oyunlar'
    },
    {
      url: 'https://images.unsplash.com/photo-1676261233849-0755de764396?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxuaW50ZW5kbyUyMHN3aXRjaCUyMGdhbWluZ3xlbnwxfHx8fDE3NjgxMTg1Njl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      title: t('carouselSection.nintendoSwitch'),
      description: t('carouselSection.gamesDescription2'),
      subCategory: 'Nintendo Oyun'
    },
    {
      url: 'https://images.unsplash.com/photo-1611138290962-2c550ffd4002?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnYW1pbmclMjBjb250cm9sbGVyfGVufDF8fHx8MTc2ODExODU3MHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      title: t('carouselSection.gamingControllers'),
      description: t('carouselSection.premiumGamingExperience'),
      category: 'Aksesuar'
    },
  ];

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    arrows: true
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <Slider {...settings}>
        {carouselImages.map((item, index) => (
          <div key={index} className="relative">
            <div className="relative h-96">
              <ImageWithFallback
                src={item.url}
                alt={item.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
                <h3 className="text-white text-3xl font-bold mb-2">{item.title}</h3>
                <p className="text-white/90 text-lg">{item.description}</p>
                <button
                  onClick={() => {
                    if (item.category) {
                      navigate(`/products?category=${encodeURIComponent(item.category)}`);
                    } else if (item.subCategory) {
                      navigate(`/products?subCategory=${encodeURIComponent(item.subCategory)}`);
                    } else {
                      navigate(`/products?subCategory=${encodeURIComponent(item.title === t('carouselSection.playStation5') ? t('carouselSection.playStation5') : item.title)}`);
                    }
                  }}
                  className="mt-4 bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition"
                >
                  {t('carouselSection.shopNow')}
                </button>
              </div>
            </div>
          </div>
        ))}
      </Slider>
    </div>
  );
}
