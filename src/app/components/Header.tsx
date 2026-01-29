import { Search, Heart, ShoppingCart, Menu, User, LogOut } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCart } from "../components/CartContext";
import { useAuth } from './AuthContext';
import { useWishlist } from './WishlistContext';
import { LanguageSelector } from './LanguageSelector';
import { useTranslation } from 'react-i18next';
import logoSrc from '../../images/logo/oyunchu.png';

export default function Header() {
  const { t } = useTranslation();
  const { totalQty } = useCart();
  const { items: wishlistItems } = useWishlist();
  const categories = [
    'PlayStations',
    'Dualsense',
    'Nintendo Oyun',
    'PS4 Oyun',
    'PS5 Oyun'
  ];

  // Map displayed category names to query parameter key/value when needed
  const categoryQueryMap: Record<string, { key: string; value: string }> = {
    // PlayStations should show products whose SubCategory is one of these
    'PlayStations': { key: 'subCategory', value: 'Playstation 3,Playstation 4,Playstation 5' },
  };

  const [modal, setModal] = useState<{ open: boolean; mode: 'login' | 'register' }>({
    open: false,
    mode: 'login'
  });
  const auth = useAuth();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [categoriesVisible, setCategoriesVisible] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);

  // 🔒 Scroll lock when modal open
  useEffect(() => {
    document.body.style.overflow = modal.open ? 'hidden' : 'auto';
  }, [modal.open]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setDropdownVisible(false);
      }
      if (categoriesRef.current && !categoriesRef.current.contains(event.target as Node)) {
        setCategoriesVisible(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live search with debounce
  useEffect(() => {
    if (!searchTerm) {
      setFilteredProducts([]);
      setDropdownVisible(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const term = String(searchTerm || '').trim();
        console.debug('[search] query=', term);
        const res = await axios.get('/api/products/search', { params: { q: term } });
        // Normalize DB fields (Id/Name/Description) to lowercase keys used across the app
        const normalized = (res.data || []).map((p: any) => ({
          id: p.Id ?? p.id,
          name: p.Name ?? p.name,
          description: p.Description ?? p.description ?? '',
          price: p.Price ?? p.price,
          originalPrice: p.OriginalPrice ?? p.originalPrice,
          imageUrl: p.ImageUrl ?? p.imageUrl,
          discount: p.Discount ?? p.discount,
        }));
        console.debug('[search] server returned', normalized.length, 'rows');
        if (normalized.length > 0) {
          setFilteredProducts(normalized);
          setDropdownVisible(true);
        } else {
          // fallback: fetch all products and do a case-insensitive client-side filter
          try {
            const allRes = await axios.get('/api/products');
            const term = String(searchTerm).trim().toLowerCase();
            const filtered = (allRes.data || []).filter((p: any) => {
              const name = (p.Name ?? p.name ?? '').toString().toLowerCase();
              const desc = (p.Description ?? p.description ?? '').toString().toLowerCase();
              return name.includes(term) || desc.includes(term);
            }).map((p: any) => ({
              id: p.Id ?? p.id,
              name: p.Name ?? p.name,
              description: p.Description ?? p.description ?? '',
              price: p.Price ?? p.price,
              originalPrice: p.OriginalPrice ?? p.originalPrice,
              imageUrl: p.ImageUrl ?? p.imageUrl,
              discount: p.Discount ?? p.discount,
            }));
            setFilteredProducts(filtered);
            setDropdownVisible(filtered.length > 0);
          } catch (e) {
            console.error('Search fallback failed', e);
            setFilteredProducts([]);
            setDropdownVisible(false);
          }
        }
      } catch (err: any) {
        // Detailed error logging to help diagnose 400/500 responses
        if (err?.response) {
          console.error('[search] server error:', err.response.status, err.response.data);
        } else {
          console.error('[search] request error:', err);
        }
        setFilteredProducts([]);
        setDropdownVisible(false);
      }
    }, 300); // debounce

    return () => clearTimeout(timer);
  }, [searchTerm]);

  return (
    <header className="bg-white shadow-md sticky top-0 z-[9999]">
      {/* Top Header */}
      <div className="bg-blue-600 text-white py-1 px-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="inline-flex items-center gap-3">
            <img src={logoSrc} alt="Oyunchu" className="h-7 sm:h-20 w-28 sm:w-36 object-contain transform scale-125" />
          </Link>

          <div className="flex gap-6">
            <Link to="/campaigns" className="hover:text-orange-400 transition">{t("header.campaigns")}</Link>
            <Link to="/branches" className="hover:text-orange-400 transition">{t("header.affiliates")}</Link>
          </div>

          <div className="flex items-center gap-4">
            {auth.isAuthenticated && auth.user ? (
              <div className="flex items-center gap-3">
                <div className="text-sm">{t("header.hello")}, <span className="font-semibold">{auth.user.name}</span></div>
                <button onClick={async () => { await auth.logout(); navigate('/'); }} className="flex items-center gap-1 hover:text-orange-400 transition">
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <Link to="/login" className="flex items-center gap-2 hover:text-orange-400 transition">
                <User size={20} />
                <span>{t("header.login")}</span>
              </Link>
            )}

            <LanguageSelector />
          </div>
        </div>
      </div>

      {/* Bottom Header */}
      <div className="bg-white py-2 px-4 border-b">
        <div className="container mx-auto flex justify-between items-center">
          {/* Categories */}
          <div className="relative" ref={categoriesRef}>
            <button onClick={() => setCategoriesVisible(v => !v)} className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition">
              <Menu size={20} />
              <span>{t("header.allCategories")}</span>
            </button>

            {categoriesVisible && (
              <div className="absolute top-full left-0 mt-1 bg-white shadow-xl rounded-lg w-64 py-2 border z-50">
                <button type="button" onClick={() => { navigate('/products'); setCategoriesVisible(false); }} className="block w-full text-left px-4 py-2 font-medium hover:bg-blue-50 hover:text-blue-600 transition">
                  {t("header.allCategories")}
                </button>
                <div className="border-t my-1" />
                {categories.map((category, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      const mapped = categoryQueryMap[category];
                      const url = mapped
                        ? `/products?${mapped.key}=${encodeURIComponent(mapped.value)}`
                        : `/products?subCategory=${encodeURIComponent(category)}`;
                      navigate(url);
                      setCategoriesVisible(false);
                    }}
                    className="block w-full text-left px-4 py-2 hover:bg-blue-50 hover:text-blue-600 transition"
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search */}
          <div className="flex-1 mx-8 relative" ref={searchRef}>
            <input
              type="text"
              placeholder={t("header.searchPlaceholder")}
              className="w-full px-4 py-2 pr-12 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => searchTerm && setDropdownVisible(true)}
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition">
              <Search size={20} />
            </button>

            {/* Dropdown results */}
            {dropdownVisible && (
              <div className="absolute top-full left-0 w-full bg-white shadow-lg rounded-lg mt-1 max-h-64 overflow-y-auto z-50">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((p: any) => (
                    <Link
                      key={p.id}
                      to={`/products/${p.id}`}
                      className="block px-4 py-2 hover:bg-blue-50"
                      onClick={() => setDropdownVisible(false)}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.imageUrl || '/placeholder.png'}
                            alt={p.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div className="text-sm text-gray-800">
                            <div className="font-medium truncate max-w-[240px]">{p.name}</div>
                            <div className="text-xs text-gray-500 truncate">{p.description}</div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm text-gray-500">{t("price")}</div>
                          <div className="font-semibold text-blue-600">{p.price ? Number(p.price).toFixed(2) + ' ₼' : '-'}</div>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="px-4 py-2 text-gray-500">{t("header.noResultsFound")}</div>
                )}
              </div>
            )}
          </div>

          {/* Icons */}
          <div className="flex items-center gap-4">
            <button
              className="relative p-2 hover:bg-gray-100 rounded-lg transition"
              onClick={() => {
                if (!auth.isAuthenticated) {
                  setModal({ open: true, mode: 'login' });
                  return;
                }
                navigate('/wishlist');
              }}
            >
              <Heart size={24} className={wishlistItems.length > 0 ? 'text-red-600' : 'text-blue-600'} fill={wishlistItems.length > 0 ? 'currentColor' : 'none'} />
              <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{wishlistItems.length}</span>
            </button>
            <Link to="/checkout/cart" className="relative p-2 hover:bg-gray-100 rounded-lg transition">
              <ShoppingCart size={24} className="text-blue-600" />
              {totalQty > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">{totalQty}</span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {modal.open && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={() => setModal({ ...modal, open: false })}/>
          <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{modal.mode === 'login' ? t('header.login') : t('header.register')}</h3>
              <button className="text-gray-500 hover:text-black" onClick={() => setModal({ ...modal, open: false })}>✕</button>
            </div>

            {modal.mode === 'login' ? (
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" required className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t("header.password")}</label>
                  <input type="password" required className="w-full px-3 py-2 border rounded" />
                </div>
                <button className="w-full bg-blue-600 text-white py-2 rounded">{t("header.login")}</button>
                <p className="text-sm text-center">
                  {t("header.dontHaveAccount")}{' '}
                  <button type="button" className="text-blue-600 underline" onClick={() => setModal({ open: true, mode: 'register' })}>
                    {t("header.register")}
                  </button>
                </p>
              </form>
            ) : (
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t("name")}</label>
                  <input type="text" required className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" required className="w-full px-3 py-2 border rounded" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t("header.password")}</label>
                  <input type="password" required className="w-full px-3 py-2 border rounded" />
                </div>
                <button className="w-full bg-blue-600 text-white py-2 rounded">{t("header.register")}</button>
                <p className="text-sm text-center">
                  {t("header.alreadyHaveAccount")}{' '}
                  <button type="button" className="text-blue-600 underline" onClick={() => setModal({ open: true, mode: 'login' })}>
                    {t("header.login")}
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
