import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function NavigationLoader() {
  const location = useLocation();
  const first = useRef(true);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    // Don't show on first mount
    if (first.current) {
      first.current = false;
      return;
    }

    setLoading(true);
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, [location.pathname, location.search]);

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-[9998] bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin mb-4" style={{ width: 48, height: 48, border: '4px solid #f3f3f3', borderTop: '4px solid #e11d67', borderRadius: '50%' }} />
        <div className="text-lg font-medium">{t('loading')}</div>
      </div>
    </div>
  );
}
