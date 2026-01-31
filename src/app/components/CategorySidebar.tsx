import { Gamepad2, Box, Gamepad, Joystick, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function CategorySidebar() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const categories = [
    {
      name: t("categories.playStation5"),
      icon: Gamepad2,
      color: "text-blue-700",
      chipBg: "bg-blue-50",
      query: { key: "subCategory", value: "Playstation 5" },
    },
    {
      name: t("categories.accessories"),
      icon: Joystick,
      color: "text-purple-700",
      chipBg: "bg-purple-50",
      query: { key: "category", value: "Aksesuar" },
    },
    {
      name: t("categories.console"),
      icon: Box,
      color: "text-green-700",
      chipBg: "bg-green-50",
      query: { key: "category", value: "Konsol" },
    },
    {
      name: t("categories.games"),
      icon: Gamepad,
      color: "text-red-700",
      chipBg: "bg-red-50",
      query: { key: "category", value: "Oyunlar" },
    },
  ];

  return (
    <section className="mt-6">
      <div className="bg-white rounded-2xl border shadow-sm p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg sm:text-xl font-extrabold text-blue-900">
            {t("category")}
          </h2>

          <button
            onClick={() => navigate("/products")}
            className="text-sm font-semibold text-blue-600 hover:text-orange-500 transition"
          >
            {t("viewAll", "Hamısına bax")}
          </button>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {categories.map((c, idx) => {
            const Icon = c.icon;
            return (
              <button
                key={idx}
                onClick={() =>
                  navigate(`/products?${c.query.key}=${encodeURIComponent(c.query.value)}`)
                }
                className="group bg-gray-50 hover:bg-orange-50 rounded-2xl p-4 transition border border-transparent hover:border-orange-100"
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <div
                    className={`${c.chipBg} ${c.color} w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-105 transition`}
                  >
                    <Icon size={22} />
                  </div>

                  <div className={`text-sm font-bold ${c.color} leading-tight line-clamp-2`}>
                    {c.name}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Banner */}
        <div className="mt-5 rounded-2xl p-4 bg-gradient-to-br from-orange-500 to-orange-600 text-white overflow-hidden">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="font-extrabold text-base sm:text-lg leading-tight">
                {t("categories.specialOffer")}
              </h3>
              <p className="text-white/90 text-xs sm:text-sm mt-1 line-clamp-2">
                {t("categories.specialOfferDetails")}
              </p>
            </div>

            <button
              onClick={() => navigate("/products?discounted=true")}
              className="shrink-0 bg-white text-orange-600 font-extrabold px-4 py-2 rounded-xl hover:bg-gray-100 transition text-sm"
            >
              {t("carouselSection.shopNow")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
