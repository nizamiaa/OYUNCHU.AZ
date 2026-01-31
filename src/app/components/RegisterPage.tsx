import React, { useMemo, useState } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useTranslation } from 'react-i18next';

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const auth = useAuth();

  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailRegex = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/, []);
  const passwordRegex = useMemo(() => /^(?=.*[A-Z])(?=.*[0-9]).{8,}$/, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setError(null);

    const cleanName = name.trim();
    const cleanSurname = surname.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Name validation
    if (cleanName.length < 2) {
      setError(t('register.nameTooShort', 'Ad minimum 2 simvol olmalıdır'));
      return;
    }

    // Email validation
    if (!emailRegex.test(cleanEmail)) {
      setError(t('registers.invalidEmail', 'Email düzgün deyil'));
      return;
    }

    // Password strength
    if (!passwordRegex.test(password)) {
      setError(t('registers.passwordRequirements', 'Şifrə ən az 8 simvol, 1 böyük hərf və 1 rəqəm olmalıdır'));
      return;
    }

    // Confirm password
    if (password !== confirmPassword) {
      setError(t('registers.passwordsDoNotMatch', 'Şifrələr uyğun gəlmir'));
      return;
    }

    try {
      setLoading(true);
      await auth.register(cleanName, cleanSurname, cleanEmail, password);
      navigate('/');
    } catch (err: any) {
      setError(err?.message || t('registers.registrationFailed', 'Qeydiyyat alınmadı'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-md mx-auto bg-white border shadow-sm rounded-2xl p-6 sm:p-7">
        <h2 className="text-2xl font-semibold text-gray-900">
          {t('registers.title', 'Qeydiyyat')}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {t('registers.subtitle', 'Yeni hesab yaradın')}
        </p>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Name + Surname */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('registers.name', 'Ad')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setError(null); setName(e.target.value); }}
                required
                className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                placeholder={t('registers.namePlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('registers.surname', 'Soyad')}
              </label>
              <input
                type="text"
                value={surname}
                onChange={(e) => { setError(null); setSurname(e.target.value); }}
                className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                placeholder={t('registers.surnamePlaceholder')}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('registers.email', 'Email')} <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setError(null); setEmail(e.target.value); }}
              required
              className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              placeholder="example@mail.com"
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('password', 'Şifrə')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setError(null); setPassword(e.target.value); }}
                required
                className="w-full px-3 py-2 border rounded-lg pr-10 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                autoComplete="new-password"
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="mt-1 text-xs text-gray-500">
              {t('registers.passwordHint', 'Ən az 8 simvol, 1 böyük hərf və 1 rəqəm')}
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('registers.confirmPassword', 'Şifrəni təsdiqlə')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => { setError(null); setConfirmPassword(e.target.value); }}
                required
                className="w-full px-3 py-2 border rounded-lg pr-10 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                autoComplete="new-password"
              />
              <button
                type="button"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowConfirmPassword(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold disabled:opacity-60 disabled:hover:bg-blue-600 inline-flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>{t('registers.creating', 'Yaradılır...')}</span>
              </>
            ) : (
              t('registers.createAccount', 'Hesab yarat')
            )}
          </button>
        </form>

        <p className="text-sm text-center mt-5 text-gray-600">
          {t('registers.alreadyHaveAccount', 'Hesabınız var?')}{' '}
          <Link to="/login" className="text-blue-600 hover:text-orange-500 font-semibold">
            {t('registers.login', 'Daxil ol')}
          </Link>
        </p>
      </div>
    </div>
  );
}
