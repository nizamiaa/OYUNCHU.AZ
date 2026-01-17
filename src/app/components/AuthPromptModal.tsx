import React from 'react';
import { Link } from 'react-router-dom';

type Props = {
  open: boolean;
  variant?: 'auth' | 'added';
  onClose?: () => void;
  message?: string;
};

export default function AuthPromptModal({ open, variant = 'auth', onClose, message }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg w-11/12 max-w-md p-6 relative shadow-lg">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500">✕</button>

        {variant === 'auth' ? (
          <div className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <span className="text-green-600 font-bold">!</span>
            </div>
            <h3 className="text-lg font-semibold mb-2">Şəxsi hesab</h3>
            <p className="text-gray-600 mb-4">Şəxsi hesabın üstünlüklərindən yararlanmaq üçün daxil olmaq və ya qeydiyyatdan keçməyinizi tövsiyə edirik.</p>

            <div className="flex gap-3">
              <Link to="/register" className="flex-1 py-2 px-4 border rounded-lg text-center">Qeydiyyat</Link>
              <Link to="/login" className="flex-1 py-2 px-4 bg-gray-100 rounded-lg text-center">Daxil ol</Link>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Məhsul favorilərə əlavə edildi</h3>
            <p className="text-gray-600 mb-4">{message ?? 'Seçilmiş məhsul favorilərə əlavə edildi.'}</p>
            <div className="flex justify-center">
              <button onClick={onClose} className="py-2 px-4 bg-blue-600 text-white rounded-lg">Bağla</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
