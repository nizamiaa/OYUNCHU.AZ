import React, { useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { useCart } from './CartContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { branches } from './BranchesPage';
import { useTranslation } from 'react-i18next';

export default function CheckoutPage() {
  const { items, selectedItems } = useCart();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');

  const COUNTRY_PREFIX = '+994';
  const MAX_LOCAL_DIGITS = 9;
  const [phone, setPhone] = useState(COUNTRY_PREFIX);

  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');

  const [payment, setPayment] = useState<'card' | 'cash' | 'instore'>('card');
  const [deliveryMethod, setDeliveryMethod] = useState<'courier' | 'pickup'>('courier');
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // selected varsa onu götür, yoxdursa bütün items
  const selectedMode = !!(selectedItems && selectedItems.length > 0);
  const list = selectedMode ? selectedItems : items;

  // subtotal / discount / total
  const summary = useMemo(() => {
    const subtotal = list.reduce((s, it: any) => s + (Number(it.oldPrice ?? it.price) * Number(it.qty || 1)), 0);
    const total = list.reduce((s, it: any) => s + (Number(it.price) * Number(it.qty || 1)), 0);
    const discount = Math.max(0, subtotal - total);
    return { subtotal, total, discount };
  }, [list]);

  // payment defaultu delivery method-a görə düzəlt
  React.useEffect(() => {
    if (deliveryMethod === 'pickup') {
      setPayment(prev => (prev === 'instore' ? prev : 'instore'));
    } else {
      setPayment(prev => (prev === 'card' || prev === 'cash' ? prev : 'card'));
    }
  }, [deliveryMethod]);

  // user varsa ad/soyad preflll
  React.useEffect(() => {
    if (user) {
      if ((user as any).name) setName(String((user as any).name));
      if ((user as any).surname) setSurname(String((user as any).surname));
    }
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const localDigits = String(phone || '').replace(/\D/g, '').replace(/^994/, '');

    if (!name || !localDigits || localDigits.length < 7) {
      setMessage({ type: 'error', text: t('Please enter a valid name and phone number') });
      return;
    }

    if (deliveryMethod === 'pickup' && !selectedBranchId) {
      setMessage({ type: 'error', text: t('Please select a branch') });
      return;
    }

    if (deliveryMethod === 'courier' && (!city || !String(city).trim())) {
      setMessage({ type: 'error', text: t('Please enter a city for delivery') });
      return;
    }

    if (!list || list.length === 0) {
      setMessage({ type: 'error', text: t('No products selected') });
      return;
    }

    const branchName =
      selectedBranchId ? (branches.find(b => String(b.id) === String(selectedBranchId))?.name || null) : null;

    const payload = {
      name,
      surname,
      phone,
      city: deliveryMethod === 'courier' ? city : '',
      address: deliveryMethod === 'courier' ? address : '',
      payment,
      deliveryMethod,

      branchId: deliveryMethod === 'pickup' ? selectedBranchId : null,
      branchName: deliveryMethod === 'pickup' ? branchName : null,

      subtotal: summary.subtotal,
      discount: summary.discount,
      total: summary.total,

      items: list.map((i: any) => ({
        id: i.id,
        price: Number(i.price) || 0,
        oldPrice: i.oldPrice ?? null,
        qty: Number(i.qty) || 1,
      })),
    };

    try {
      const res = await axios.post('/api/orders', payload);
      if (res.data && (res.data.success || res.status === 200)) {
        setMessage({ type: 'success', text: t('Order successfully submitted') });
        navigate('/checkout/complete');
      } else {
        setMessage({ type: 'error', text: t('Error occurred while submitting the order') });
      }
    } catch (err) {
      console.error('Order submit error', err);
      setMessage({ type: 'error', text: t('Error occurred while submitting the order') });
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
      {/* LEFT */}
      <div className="lg:col-span-2">
        <h1 className="text-xl sm:text-2xl font-bold mb-4">{t('checkout.title')}</h1>

        <form onSubmit={submit} className="space-y-5">
          {message && (
            <div
              className={`px-3 py-2 rounded text-sm ${
                message.type === 'error'
                  ? 'text-red-600 bg-red-50 border border-red-100'
                  : 'text-green-700 bg-green-50 border border-green-100'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Personal */}
          <div className="bg-white rounded-xl p-4 border">
            <h2 className="font-semibold mb-3">{t('checkout.personalInformation')}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm">{t('checkout.name')} *</label>
                <input
                  value={name}
                  onChange={(e) => { setMessage(null); setName(e.target.value); }}
                  className="w-full border-b py-2 mt-1 outline-none"
                />
              </div>

              <div>
                <label className="text-sm">{t('checkout.surname')} *</label>
                <input
                  value={surname}
                  onChange={(e) => { setMessage(null); setSurname(e.target.value); }}
                  className="w-full border-b py-2 mt-1 outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm">{t('checkout.phone')} *</label>
                <input
                  value={phone}
                  onChange={(e) => {
                    let v = String(e.target.value || '');
                    let digits = v.replace(/\D/g, '');
                    if (digits.startsWith('994')) digits = digits.replace(/^994/, '');
                    digits = digits.slice(0, MAX_LOCAL_DIGITS);
                    setMessage(null);
                    setPhone(COUNTRY_PREFIX + digits);
                  }}
                  className="w-full border-b py-2 mt-1 outline-none"
                  placeholder="+994 (##) ###-##-##"
                />
              </div>
            </div>
          </div>

          {/* Delivery */}
          <div className="bg-white rounded-xl p-4 border">
            <h2 className="font-semibold mb-3">{t('checkout.deliveryMethod')}</h2>

            <div className="flex flex-wrap gap-3 mb-4">
              <button
                type="button"
                onClick={() => setDeliveryMethod('courier')}
                className={`px-3 py-2 rounded-full border text-sm ${
                  deliveryMethod === 'courier' ? 'bg-black text-white' : 'bg-white'
                }`}
              >
                {t('checkout.courierDelivery')}
              </button>

              <button
                type="button"
                onClick={() => setDeliveryMethod('pickup')}
                className={`px-3 py-2 rounded-full border text-sm ${
                  deliveryMethod === 'pickup' ? 'bg-black text-white' : 'bg-white'
                }`}
              >
                {t('checkout.branchPickup')}
              </button>
            </div>

            {deliveryMethod === 'courier' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm">{t('checkout.city')} *</label>
                  <input
                    value={city}
                    onChange={(e) => { setMessage(null); setCity(e.target.value); }}
                    className="w-full border-b py-2 mt-1 outline-none"
                    placeholder={t('checkout.enterCity')}
                  />
                </div>

                <div>
                  <label className="text-sm">{t('checkout.address')} *</label>
                  <input
                    value={address}
                    onChange={(e) => { setMessage(null); setAddress(e.target.value); }}
                    className="w-full border-b py-2 mt-1 outline-none"
                  />
                </div>
              </div>
            )}

            {deliveryMethod === 'pickup' && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">{t('checkout.selectFromStores')}</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {branches.map((b) => (
                    <label
                      key={b.id}
                      className={`p-3 border rounded cursor-pointer flex gap-2 ${
                        selectedBranchId === b.id ? 'ring-2 ring-blue-400' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="branch"
                        checked={selectedBranchId === b.id}
                        onChange={() => { setMessage(null); setSelectedBranchId(b.id); }}
                      />
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{b.name}</div>
                        <div className="text-xs text-gray-600">{b.address}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Payment */}
          <div className="bg-white rounded-xl p-4 border">
            <h2 className="font-semibold mb-3">{t('checkout.paymentMethod')}</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {deliveryMethod === 'pickup' ? (
                <label className={`p-3 border rounded ${payment === 'instore' ? 'ring-2 ring-blue-400' : ''}`}>
                  <input
                    type="radio"
                    name="payment"
                    checked={payment === 'instore'}
                    onChange={() => setPayment('instore')}
                  />{' '}
                  {t('checkout.instorePayment')}
                </label>
              ) : (
                <>
                  <label className={`p-3 border rounded ${payment === 'card' ? 'ring-2 ring-blue-400' : ''}`}>
                    <input
                      type="radio"
                      name="payment"
                      checked={payment === 'card'}
                      onChange={() => setPayment('card')}
                    />{' '}
                    {t('checkout.cardPayment')}
                  </label>

                  <label className={`p-3 border rounded ${payment === 'cash' ? 'ring-2 ring-blue-400' : ''}`}>
                    <input
                      type="radio"
                      name="payment"
                      checked={payment === 'cash'}
                      onChange={() => setPayment('cash')}
                    />{' '}
                    {t('checkout.cashPayment')}
                  </label>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="bg-pink-600 text-white px-6 py-3 rounded-lg">
              {t('checkout.completeOrder')}
            </button>
          </div>
        </form>
      </div>

      {/* RIGHT SUMMARY */}
      <aside className="lg:col-span-1">
        <div className="bg-white rounded-xl p-4 sm:p-6 border space-y-4">
          <div className="font-semibold text-sm sm:text-base">
            {t('checkout.productCount')}:
            <span className="float-right">
              {list.length} {t('cartPage.unit')}.
            </span>
          </div>

          <div className="text-sm text-gray-600 space-y-2">
            {list.map((it: any) => (
              <div key={it.id} className="flex items-start justify-between gap-3 py-2 border-b last:border-b-0">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">{it.name}</div>
                  <div className="text-xs text-gray-500">
                    <span className="text-orange-500 font-semibold">{it.qty}</span> {t('cartPage.unit')}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-red-600 font-semibold text-sm sm:text-base">
                    {(Number(it.price) * Number(it.qty || 1)).toFixed(2)} ₼
                  </div>
                  {it.oldPrice ? (
                    <div className="text-xs text-gray-400 line-through">
                      {(Number(it.oldPrice) * Number(it.qty || 1)).toFixed(2)} ₼
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t space-y-1">
            <div className="flex justify-between text-sm text-gray-600">
              <span>{t('cartPage.totalAmount')}:</span>
              <span className="font-medium">{summary.subtotal.toFixed(2)} ₼</span>
            </div>

            <div className="flex justify-between text-sm text-gray-600">
              <span>{t('cartPage.discountAmount')}:</span>
              <span className={summary.discount > 0 ? 'text-green-600 font-semibold' : 'text-gray-500'}>
                -{summary.discount.toFixed(2)} ₼
              </span>
            </div>

            <div className="flex justify-between text-base sm:text-lg font-semibold mt-2">
              <span>{t('cartPage.finalAmount')}:</span>
              <span className="text-red-600">{summary.total.toFixed(2)} ₼</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
