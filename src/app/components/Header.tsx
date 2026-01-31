import { Search, Heart, ShoppingCart, Menu, User, LogOut, Phone, Grid3X3 } from 'lucide-react';
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

  const categoryQueryMap: Record<string, { key: string; value: string }> = {
    'PlayStations': { key: 'subCategory', value: 'Playstation 3,Playstation 4,Playstation 5' },
  };

  const [modal, setModal] = useState<{ open: boolean; mode: 'login' | 'register' }>({
    open: false,
    mode: 'login'
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [categoriesVisible, setCategoriesVisible] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const auth = useAuth();
  const navigate = useNavigate();

  const searchRef = useRef<HTMLDivElement>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const locked = modal.open || mobileMenuOpen;
    document.body.style.overflow = locked ? 'hidden' : 'auto';
  }, [modal.open, mobileMenuOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (searchRef.current && !searchRef.current.contains(target)) {
        setDropdownVisible(false);
      }
      if (categoriesRef.current && !categoriesRef.current.contains(target)) {
        setCategoriesVisible(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredProducts([]);
      setDropdownVisible(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const term = String(searchTerm || '').trim();
        const res = await axios.get('/api/products/search', { params: { q: term } });

        const normalized = (res.data || []).map((p: any) => ({
          id: p.Id ?? p.id,
          name: p.Name ?? p.name,
          description: p.Description ?? p.description ?? '',
          price: p.Price ?? p.price,
          originalPrice: p.OriginalPrice ?? p.originalPrice,
          imageUrl: p.ImageUrl ?? p.imageUrl,
          discount: p.Discount ?? p.discount,
        }));

        if (normalized.length > 0) {
          setFilteredProducts(normalized);
          setDropdownVisible(true);
        } else {
          try {
            const allRes = await axios.get('/api/products');
            const termLower = String(searchTerm).trim().toLowerCase();

            const filtered = (allRes.data || []).filter((p: any) => {
              const name = (p.Name ?? p.name ?? '').toString().toLowerCase();
              const desc = (p.Description ?? p.description ?? '').toString().toLowerCase();
              return name.includes(termLower) || desc.includes(termLower);
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
          } catch {
            setFilteredProducts([]);
            setDropdownVisible(false);
          }
        }
      } catch {
        setFilteredProducts([]);
        setDropdownVisible(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const goCategory = (category: string) => {
    const mapped = categoryQueryMap[category];
    const url = mapped
      ? `/products?${mapped.key}=${encodeURIComponent(mapped.value)}`
      : `/products?subCategory=${encodeURIComponent(category)}`;
    navigate(url);
    setCategoriesVisible(false);
    setMobileMenuOpen(false);
  };

  const goLoginOrProfile = () => {
    if (!auth.isAuthenticated) {
      navigate('/login');
      setMobileMenuOpen(false);
      return;
    }
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-[9999]">
      <div className="md:hidden border-b">
        <div className="px-3 py-2 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img
              src={logoSrc}
              alt="Oyunchu"
              className="h-15 sm:h-15 w-auto object-contain"
            />
          </Link>

          <div className="flex items-center gap-2">

            <div className="border-l h-5 mx-1" />

            <LanguageSelector />
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={goLoginOrProfile}
              className="p-2 rounded-lg hover:bg-gray-100 transition"
              aria-label="Account"
            >
              <User size={20} />
            </button>

            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 transition"
              aria-label="Menu"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>

        <div className="px-3 pb-2">
          <div className="flex items-center gap-2">
            {/* Categories icon button */}
            <div className="relative" ref={categoriesRef}>
              <button
                onClick={() => setCategoriesVisible(v => !v)}
                className="h-10 w-10 flex items-center justify-center border rounded-lg hover:bg-gray-50 transition"
                aria-label={t("header.allCategories")}
              >
                <Grid3X3 size={18} />
              </button>

              {categoriesVisible && (
                <div className="absolute top-full left-0 mt-2 bg-white shadow-xl rounded-xl w-64 py-2 border z-50">
                  <button
                    type="button"
                    onClick={() => { navigate('/products'); setCategoriesVisible(false); }}
                    className="block w-full text-left px-4 py-2 font-medium hover:bg-blue-50 hover:text-blue-600 transition"
                  >
                    {t("header.allCategories")}
                  </button>
                  <div className="border-t my-1" />
                  {categories.map((category, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => goCategory(category)}
                      className="block w-full text-left px-4 py-2 hover:bg-blue-50 hover:text-blue-600 transition"
                    >
                      {category}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Search */}
            <div className="flex-1 relative" ref={searchRef}>
              <input
                type="text"
                placeholder={t("header.searchPlaceholder")}
                className="w-full h-10 px-3 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => searchTerm && setDropdownVisible(true)}
              />
              <button
                className="absolute right-1 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-gray-100 transition"
                aria-label="Search"
                onClick={() => {
                  const q = searchTerm.trim();
                  if (!q) return;
                  navigate(`/products?search=${encodeURIComponent(q)}`);
                  setDropdownVisible(false);
                }}
              >
                <Search size={18} />
              </button>

              {/* Dropdown results */}
              {dropdownVisible && (
                <div className="absolute top-full left-0 w-full bg-white shadow-lg rounded-xl mt-2 max-h-72 overflow-y-auto z-50 border">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((p: any) => (
                      <Link
                        key={p.id}
                        to={`/products/${p.id}`}
                        className="block px-3 py-2 hover:bg-blue-50"
                        onClick={() => setDropdownVisible(false)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <img
                              src={p.imageUrl || '/placeholder.png'}
                              alt={p.name}
                              className="w-10 h-10 object-cover rounded"
                            />
                            <div className="text-sm text-gray-800">
                              <div className="font-medium truncate max-w-[180px]">{p.name}</div>
                              <div className="text-xs text-gray-500 truncate max-w-[180px]">{p.description}</div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-xs text-gray-500">{t("price")}</div>
                            <div className="font-semibold text-blue-600 text-sm">
                              {p.price ? Number(p.price).toFixed(2) + ' ₼' : '-'}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-gray-500">{t("header.noResultsFound")}</div>
                  )}
                </div>
              )}
            </div>

            {/* Cart */}
            <Link
              to="/checkout/cart"
              className="relative h-10 w-10 flex items-center justify-center border rounded-lg hover:bg-gray-50 transition"
              aria-label="Cart"
            >
              <ShoppingCart size={18} />
              {totalQty > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] min-w-5 h-5 px-1 rounded-full flex items-center justify-center">
                  {totalQty}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[9999]">
          <div className="absolute inset-0 bg-black/40" />
          <div
            ref={mobileMenuRef}
            className="absolute right-0 top-0 h-full w-[85%] max-w-sm bg-white shadow-2xl p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="font-semibold text-gray-900">{t("header.allCategories")}</div>
              <button
                className="p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* quick links */}
            <div className="space-y-2">
              <Link
                to="/campaigns"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg hover:bg-gray-50"
              >
                {t("header.campaigns")}
              </Link>
              <Link
                to="/branches"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg hover:bg-gray-50"
              >
                {t("header.affiliates")}
              </Link>

              {/* Wishlist */}
              <button
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50"
                onClick={() => {
                  if (!auth.isAuthenticated) {
                    setModal({ open: true, mode: 'login' });
                    setMobileMenuOpen(false);
                    return;
                  }
                  navigate('/wishlist');
                  setMobileMenuOpen(false);
                }}
              >
                <span className="flex items-center gap-2">
                  <Heart size={18} />
                  Wishlist
                </span>
                <span className="text-sm text-gray-600">{wishlistItems.length}</span>
              </button>

              {/* Auth block */}
              <div className="border-t pt-3 mt-3">
                {auth.isAuthenticated && auth.user ? (
                  <div className="space-y-2">
                    <div className="px-3 text-sm text-gray-700">
                      {t("header.hello")}, <span className="font-semibold">{auth.user.name}</span>
                    </div>
                    <button
                      onClick={async () => {
                        await auth.logout();
                        navigate('/');
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 text-red-600"
                    >
                      <LogOut size={18} />
                      {t("header.logout") || "Logout"}
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50"
                  >
                    <User size={18} />
                    {t("header.login")}
                  </Link>
                )}
              </div>

              {/* Category shortcuts inside drawer */}
              <div className="border-t pt-3 mt-3">
                <div className="text-xs font-semibold text-gray-500 px-3 mb-2">
                  {t("header.allCategories")}
                </div>

                <button
                  type="button"
                  onClick={() => { navigate('/products'); setMobileMenuOpen(false); }}
                  className="block w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition"
                >
                  {t("header.allCategories")}
                </button>

                {categories.map((category, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => goCategory(category)}
                    className="block w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition"
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="hidden md:block">
        {/* Top Header */}
        <div className="bg-blue-600 text-white py-1 px-4">
          <div className="container mx-auto flex justify-between items-center">
            <Link to="/" className="inline-flex items-center gap-3">
              <img
                src={logoSrc}
                alt="Oyunchu"
                className="h-7 sm:h-20 w-28 sm:w-36 object-contain transform scale-125"
              />
            </Link>

            <div className="flex gap-6">
              <Link to="/campaigns" className="hover:text-orange-400 transition">{t("header.campaigns")}</Link>
              <Link to="/branches" className="hover:text-orange-400 transition">{t("header.affiliates")}</Link>
            </div>

            <div className="flex items-center gap-4">
              {auth.isAuthenticated && auth.user ? (
                <div className="flex items-center gap-3">
                  <div className="text-sm">
                    {t("header.hello")}, <span className="font-semibold">{auth.user.name}</span>
                  </div>
                  <button
                    onClick={async () => { await auth.logout(); navigate('/'); }}
                    className="flex items-center gap-1 hover:text-orange-400 transition"
                    aria-label="Logout"
                  >
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
              <button
                onClick={() => setCategoriesVisible(v => !v)}
                className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition"
              >
                <Menu size={20} />
                <span>{t("header.allCategories")}</span>
              </button>

              {categoriesVisible && (
                <div className="absolute top-full left-0 mt-1 bg-white shadow-xl rounded-lg w-64 py-2 border z-50">
                  <button
                    type="button"
                    onClick={() => { navigate('/products'); setCategoriesVisible(false); }}
                    className="block w-full text-left px-4 py-2 font-medium hover:bg-blue-50 hover:text-blue-600 transition"
                  >
                    {t("header.allCategories")}
                  </button>
                  <div className="border-t my-1" />
                  {categories.map((category, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => goCategory(category)}
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
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition"
                onClick={() => {
                  const q = searchTerm.trim();
                  if (!q) return;
                  navigate(`/products?search=${encodeURIComponent(q)}`);
                  setDropdownVisible(false);
                }}
                aria-label="Search"
              >
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
                            <div className="font-semibold text-blue-600">
                              {p.price ? Number(p.price).toFixed(2) + ' ₼' : '-'}
                            </div>
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
                <Heart
                  size={24}
                  className={wishlistItems.length > 0 ? 'text-red-600' : 'text-blue-600'}
                  fill={wishlistItems.length > 0 ? 'currentColor' : 'none'}
                />
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {wishlistItems.length}
                </span>
              </button>

              <Link to="/checkout/cart" className="relative p-2 hover:bg-gray-100 rounded-lg transition">
                <ShoppingCart size={24} className="text-blue-600" />
                {totalQty > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {totalQty}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {modal.open && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
            onClick={() => setModal({ ...modal, open: false })}
          />
          <div className="relative z-10 bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {modal.mode === 'login' ? t('header.login') : t('header.register')}
              </h3>
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
                  <button
                    type="button"
                    className="text-blue-600 underline"
                    onClick={() => setModal({ open: true, mode: 'register' })}
                  >
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
                  <button
                    type="button"
                    className="text-blue-600 underline"
                    onClick={() => setModal({ open: true, mode: 'login' })}
                  >
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
