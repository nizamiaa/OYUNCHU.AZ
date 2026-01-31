import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ShieldAlert, CheckCircle2, X } from 'lucide-react';

type Props = {
  open: boolean;
  variant?: 'auth' | 'added';
  onClose?: () => void;
  message?: string;
};

export default function AuthPromptModal({
  open,
  variant = 'auth',
  onClose,
  message,
}: Props) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);

  // ESC to close
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  // lock scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev || 'auto';
    };
  }, [open]);

  // click outside to close
  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, onClose]);

  if (!open) return null;

  const title =
    variant === 'auth' ? t('authPromptModal.authTitle') : t('authPromptModal.addedTitle');

  const desc =
    variant === 'auth'
      ? t('authPromptModal.authMessage')
      : message ?? t('authPromptModal.addedMessage');

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* panel */}
      <div
        ref={panelRef}
        className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* header */}
        <div className="flex items-start justify-between px-5 pt-5">
          <div className="flex items-center gap-3">
            <div
              className={
                variant === 'auth'
                  ? 'w-11 h-11 rounded-full bg-orange-50 flex items-center justify-center'
                  : 'w-11 h-11 rounded-full bg-green-50 flex items-center justify-center'
              }
            >
              {variant === 'auth' ? (
                <ShieldAlert className="text-orange-600" size={22} />
              ) : (
                <CheckCircle2 className="text-green-600" size={22} />
              )}
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight">
                {title}
              </h3>
              <p className="text-sm text-gray-600 mt-1">{desc}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-600"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* content */}
        <div className="px-5 pb-5 pt-4">
          {variant === 'auth' ? (
            <div className="flex gap-3">
              <Link
                to="/register"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 border border-gray-200 rounded-xl text-center font-medium text-gray-900 hover:bg-gray-50 transition"
              >
                {t('header.register')}
              </Link>

              <Link
                to="/login"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl text-center font-medium bg-blue-600 text-white hover:bg-blue-700 transition"
              >
                {t('header.login')}
              </Link>
            </div>
          ) : (
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="py-2.5 px-5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
              >
                {t('close')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
