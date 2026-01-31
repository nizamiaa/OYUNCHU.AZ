import Slider from "react-slick";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export default function CarouselSection() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const carouselImages: Array<{
    url: string;
    title: string;
    description: string;
    category?: string;
    subCategory?: string;
  }> = [
    {
      url: "https://images.unsplash.com/photo-1677694690511-2e0646619c91?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwbGF5c3RhdGlvbiUyMGNvbnNvbGUlMjBnYW1pbmd8ZW58MXx8fHwxNzY4MTE4NTY5fDA&ixlib=rb-4.1.0&q=80&w=1600&utm_source=figma&utm_medium=referral",
      title: t("carouselSection.playStation5"),
      description: t("carouselSection.playStationDescription"),
      subCategory: "Playstation 5",
    },
    {
      url: "https://images.unsplash.com/photo-1709587797077-7a2c94411514?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx4Ym94JTIwY29uc29sZSUyMGdhbWluZ3xlbnwxfHx8fDE3NjgxMTg1Njl8MA&ixlib=rb-4.1.0&q=80&w=1600&utm_source=figma&utm_medium=referral",
      title: t("carouselSection.games"),
      description: t("carouselSection.gamesDescription"),
      category: "Oyunlar",
    },
    {
      url: "https://images.unsplash.com/photo-1676261233849-0755de764396?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxuaW50ZW5kbyUyMHN3aXRjaCUyMGdhbWluZ3xlbnwxfHx8fDE3NjgxMTg1Njl8MA&ixlib=rb-4.1.0&q=80&w=1600&utm_source=figma&utm_medium=referral",
      title: t("carouselSection.nintendoSwitch"),
      description: t("carouselSection.gamesDescription2"),
      subCategory: "Nintendo Oyun",
    },
    {
      url: "https://images.unsplash.com/photo-1611138290962-2c550ffd4002?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHxnYW1pbmclMjBjb250cm9sbGVyfGVufDF8fHx8MTc2ODExODU3MHww&ixlib=rb-4.1.0&q=80&w=1600&utm_source=figma&utm_medium=referral",
      title: t("carouselSection.gamingControllers"),
      description: t("carouselSection.premiumGamingExperience"),
      category: "Aksesuar",
    },
  ];

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3500,
    arrows: true,
    adaptiveHeight: false,
  };

  const goTo = (item: (typeof carouselImages)[number]) => {
    if (item.category) {
      navigate(`/products?category=${encodeURIComponent(item.category)}`);
      return;
    }
    if (item.subCategory) {
      navigate(`/products?subCategory=${encodeURIComponent(item.subCategory)}`);
      return;
    }
    navigate("/products");
  };

  return (
    <section className="w-full overflow-hidden bg-white">
      <div className="w-full">
        <Slider {...settings}>
          {carouselImages.map((item, index) => (
            <div key={index} className="relative">
              {/* responsive height */}
              <div className="relative h-[240px] sm:h-[360px] lg:h-[460px]">
                <ImageWithFallback
                  src={item.url}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />

                {/* gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                {/* content */}
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-8">
                  <div className="container mx-auto px-4 sm:px-6">
                    <div className="max-w-2xl">
                      <h3 className="text-white text-xl sm:text-3xl lg:text-4xl font-extrabold leading-tight line-clamp-2">
                        {item.title}
                      </h3>

                      <p className="mt-2 text-white/90 text-xs sm:text-base line-clamp-2">
                        {item.description}
                      </p>

                      <button
                        onClick={() => goTo(item)}
                        className="
                          mt-3
                          inline-flex items-center justify-center
                          bg-orange-500/90
                          text-white
                          px-4
                          py-1.5
                          rounded-md
                          text-sm
                          font-medium
                          hover:bg-orange-600
                          transition
                        "
                      >
                        {t("carouselSection.shopNow")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </Slider>
      </div>
    </section>
  );
}
