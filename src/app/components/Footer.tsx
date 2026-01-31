import { Instagram } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from './AuthContext';
import logoSrc from '../../images/logo/oyunchu.png';
import { FaWhatsapp } from 'react-icons/fa';

export default function Footer() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [footerMsg, setFooterMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const categories = [
    { label: t('categories.playStation5', 'PlayStation 5'), key: 'subCategory', value: 'Playstation 5' },
    { label: t('categories.accessories', 'Accessories'), key: 'category', value: 'Aksesuar' },
    { label: t('categories.console', 'Console'), key: 'category', value: 'Konsol' },
    { label: t('categories.games', 'Games'), key: 'category', value: 'Oyunlar' },
  ];

  const quickLinks = [
    { to: '/about', label: t('footer.quickLinks.aboutUs') },
    { to: '/contact', label: t('footer.quickLinks.contact') },
    { to: '/faq', label: t('footer.quickLinks.faq') },
    { to: '/shipping', label: t('footer.quickLinks.shippingInfo') },
  ];

  return (
    <footer className="bg-blue-900 text-white mt-8">
      <div className="container mx-auto px-4 py-5">
        {/* MAIN */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* About (compact) */}
          <div className="space-y-2">
            <Link to="/" className="inline-flex items-center">
              <img src={logoSrc} alt="Oyunchu" className="h-10 sm:h-12 w-auto object-contain" />
            </Link>

            <p className="text-blue-200 text-sm leading-relaxed line-clamp-2">
              {t('footer.title')}
            </p>

            <div className="flex gap-2 pt-1">
              <a
                href="https://wa.me/994706908080"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-blue-800 rounded-full hover:bg-orange-500 transition inline-flex"
                aria-label="WhatsApp"
              >
                <FaWhatsapp size={18} />
              </a>

              <a
                href="https://instagram.com/oyunchu_az"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-blue-800 rounded-full hover:bg-orange-500 transition inline-flex"
                aria-label="Instagram"
              >
                <Instagram size={18} />
              </a>
            </div>
          </div>

          {/* Links + Categories (2 columns inside one block) */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-base mb-2">{t('footer.quickLinks.title')}</h3>
              <ul className="space-y-1.5 text-blue-200 text-sm">
                {quickLinks.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="hover:text-orange-400 transition">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">{t('footer.categories.title', 'Categories')}</h3>
              <ul className="space-y-1.5 text-blue-200 text-sm">
                {categories.map((c) => (
                  <li key={`${c.key}_${c.value}`}>
                    <Link
                      to={`/products?${c.key}=${encodeURIComponent(c.value)}`}
                      className="hover:text-orange-400 transition"
                    >
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Newsletter (compact) */}
          <div className="space-y-2">
            <h3 className="font-bold text-base mb-1">{t('footer.newsletter.title')}</h3>

            <p className="text-blue-200 text-sm leading-relaxed line-clamp-2">
              {t('footer.newsletter.subscribe')}
            </p>

            <button
              onClick={() => {
                if (user) {
                  setFooterMsg({ type: 'success', text: t('footer.newsletter.alreadySubscribed') });
                  window.setTimeout(() => setFooterMsg(null), 2200);
                  return;
                }
                navigate('/register');
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold w-full sm:w-auto"
            >
              {t('footer.newsletter.cta', 'Register')}
            </button>

            {footerMsg && (
              <div
                className={`mt-2 px-3 py-2 rounded text-sm ${
                  footerMsg.type === 'error'
                    ? 'text-red-600 bg-red-50 border border-red-100'
                    : 'text-green-700 bg-green-50 border border-green-100'
                }`}
              >
                {footerMsg.text}
              </div>
            )}
          </div>
        </div>

        {/* Bottom (thin) */}
        <div className="border-t border-blue-800 mt-5 pt-3 text-center text-blue-300 text-xs">
          © {new Date().getFullYear()} Oyunchu. {t('footer.allRightsReserved')}.
        </div>
      </div>
    </footer>
  );
}
