import { Instagram, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import logoSrc from '../../images/logo/oyunchu.png';
import { FaWhatsapp } from 'react-icons/fa';

export default function Footer() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [footerMsg, setFooterMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  return (
    <footer className="bg-blue-900 text-white mt-12">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <Link to="/" className="inline-flex items-center gap-3">
              <img src={logoSrc} alt="Oyunchu" className="h-7 sm:h-20 w-28 sm:w-36 object-contain transform scale-125" />
            </Link>
            <p className="text-blue-200 text-sm">
              {t('footer.title')}
            </p>
            <div className="flex gap-3 mt-4">
              <a
                href="https://wa.me/994706908080"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-blue-800 rounded-full hover:bg-orange-500 transition inline-flex"
              >
                <FaWhatsapp size={20} />
              </a>
              <a
                href="https://instagram.com/oyunchu_az"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-blue-800 rounded-full hover:bg-orange-500 transition inline-flex"
              >
                <Instagram size={20} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-lg mb-4">{t('footer.quickLinks.title')}</h3>
            <ul className="space-y-2 text-blue-200 text-sm">
              <li><a href="#" className="hover:text-orange-400 transition">{t('footer.quickLinks.aboutUs')}</a></li>
              <li><a href="#" className="hover:text-orange-400 transition">{t('footer.quickLinks.contact')}</a></li>
              <li><a href="#" className="hover:text-orange-400 transition">{t('footer.quickLinks.faq')}</a></li>
              <li><a href="#" className="hover:text-orange-400 transition">{t('footer.quickLinks.shippingInfo')}</a></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-bold text-lg mb-4">{t('footer.categories.title', 'Categories')}</h3>
            <ul className="space-y-2 text-blue-200 text-sm">
              {[
                { label: t('categories.playStation5', 'PlayStation 5'), value: 'Playstation 5' },
                { label: t('categories.accessories', 'Accessories'), value: 'Aksesuar' },
                { label: t('categories.console', 'Console'), value: 'Konsol' },
                { label: t('categories.games', 'Games'), value: 'Oyunlar' },
              ].map((c) => (
                <li key={c.value}><a href={`/products?category=${encodeURIComponent(c.value)}`} className="hover:text-orange-400 transition">{c.label}</a></li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-bold text-lg mb-4">{t('footer.newsletter.title')}</h3>
            <p className="text-blue-200 text-sm mb-3">{t('footer.newsletter.subscribe')}</p>
            <div>
              <button
                onClick={() => {
                  if (user) {
                    setFooterMsg({ type: 'success', text: t('footer.newsletter.alreadySubscribed') });
                    window.setTimeout(() => setFooterMsg(null), 3500);
                    return;
                  }
                  navigate('/register');
                }}
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm"
              >
                {t('footer.newsletter.cta', 'Register')}
              </button>
              {footerMsg && (
                <div className={`mt-2 px-3 py-1 rounded text-sm ${footerMsg.type === 'error' ? 'text-red-600 bg-red-50 border border-red-100' : 'text-green-700 bg-green-50 border border-green-100'}`}>
                  {footerMsg.text}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-blue-800 mt-8 pt-6 text-center text-blue-300 text-sm">
          <p>© {new Date().getFullYear()} Oyunchu. {t('footer.allRightsReserved')}.</p>
        </div>
      </div>
    </footer>
  );
}
