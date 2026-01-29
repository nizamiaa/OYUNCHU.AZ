import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useCart } from './CartContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { branches } from './BranchesPage';
import { useTranslation } from 'react-i18next';

export default function CheckoutPage() {
  const { items, totalPrice, selectedItems, selectedTotal } = useCart();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const COUNTRY_PREFIX = '+994';
  const MAX_LOCAL_DIGITS = 9; // Azerbaijan local number length
  const [phone, setPhone] = useState(COUNTRY_PREFIX);
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [payment, setPayment] = useState('card');
  const [deliveryMethod, setDeliveryMethod] = useState<'courier' | 'pickup'>('courier');
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const { t } = useTranslation();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    // basic validation
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

    const itemsToSend = (selectedItems && selectedItems.length) ? selectedItems : items;
    if (!itemsToSend || itemsToSend.length === 0) {
      setMessage({ type: 'error', text: t('No products selected') });
      return;
    }

    const payload = {
      name,
      surname,
      phone,
      city,
      address,
      payment,
      deliveryMethod,
      branchId: selectedBranchId,
      branchName: selectedBranchId ? (branches.find(b => String(b.id) === String(selectedBranchId))?.name || null) : null,
      total: (selectedItems && selectedItems.length) ? selectedTotal : totalPrice,
      items: itemsToSend.map(i => ({ id: i.id, price: i.price, qty: i.qty }))
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

  // Keep payment default sensible when delivery method changes
  React.useEffect(() => {
    if (deliveryMethod === 'pickup') {
      // prefer in-store payment when picking up
      setPayment(prev => (prev === 'instore' || prev === 'cart2cart' ? prev : 'instore'));
    } else {
      // courier defaults to card
      setPayment(prev => (prev === 'card' || prev === 'cash' ? prev : 'card'));
    }
  }, [deliveryMethod]);

  // If user is logged in, prefill name and surname
  React.useEffect(() => {
    if (user) {
      if (user.name) setName(String(user.name));
      if (user.surname) setSurname(String(user.surname));
    }
  }, [user]);

  return (
    <div className="p-8 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="col-span-2">
        <h1 className="text-2xl font-bold mb-4">{t('checkout.title')}</h1>

        <form onSubmit={submit} className="space-y-6">
          {message && (
            <div className={`px-3 py-2 rounded text-sm ${message.type === 'error' ? 'text-red-600 bg-red-50 border border-red-100' : 'text-green-700 bg-green-50 border border-green-100'}`}>
              {message.text}
            </div>
          )}
          <div className="bg-white rounded-lg p-4 border">
            <h2 className="font-semibold mb-3">{t('checkout.personalInformation')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm">{t('checkout.name')} *</label>
                <input value={name} onChange={e => { setMessage(null); setName(e.target.value); }} className="w-full border-b py-2 mt-1" />
              </div>
              <div>
                <label className="text-sm">{t('checkout.surname')} *</label>
                <input value={surname} onChange={e => { setMessage(null); setSurname(e.target.value); }} className="w-full border-b py-2 mt-1" />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm">{t('checkout.phone')} *</label>
                <input value={phone} onChange={e => {
                  // normalize input: keep only digits after prefix, ensure prefix stays
                  let v = String(e.target.value || '');
                  // extract digits
                  let digits = v.replace(/\D/g, '');
                  // if user pasted full number starting with 994..., strip leading 994
                  if (digits.startsWith('994')) digits = digits.replace(/^994/, '');
                  digits = digits.slice(0, MAX_LOCAL_DIGITS);
                  setMessage(null);
                  setPhone(COUNTRY_PREFIX + digits);
                }} className="w-full border-b py-2 mt-1" placeholder="+994 (##) ###-##-##" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border">
            <h2 className="font-semibold mb-3">{t('checkout.deliveryMethod')}</h2>
            <div className="flex gap-3 mb-4">
              <button type="button" onClick={() => setDeliveryMethod('courier')} className={`px-3 py-2 rounded-full border ${deliveryMethod === 'courier' ? 'bg-black text-white' : ''}`}>{t('checkout.courierDelivery')}</button>
              <button type="button" onClick={() => setDeliveryMethod('pickup')} className={`px-3 py-2 rounded-full border ${deliveryMethod === 'pickup' ? 'bg-black text-white' : ''}`}>{t('checkout.branchPickup')}</button>
            </div>

            {deliveryMethod === 'courier' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm">{t('checkout.city')} *</label>
                  <input value={city} onChange={e => { setMessage(null); setCity(e.target.value); }} className="w-full border-b py-2 mt-1" placeholder={t('checkout.enterCity')} />
                </div>
                <div>
                  <label className="text-sm">{t('checkout.address')} *</label>
                  <input value={address} onChange={e => { setMessage(null); setAddress(e.target.value); }} className="w-full border-b py-2 mt-1" />
                </div>
              </div>
            )}

            {deliveryMethod === 'pickup' && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">{t('checkout.selectFromStores')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {branches
                    .filter(b => !city || b.region.toLowerCase().includes(city.toLowerCase()) || city === '')
                    .map(b => (
                      <label key={b.id} className={`p-3 border rounded cursor-pointer ${selectedBranchId === b.id ? 'ring-2 ring-blue-400' : ''}`}>
                        <input type="radio" name="branch" checked={selectedBranchId === b.id} onChange={() => { setMessage(null); setSelectedBranchId(b.id); }} />
                        <div className="ml-2 inline-block font-semibold">{b.name}</div>
                        <div className="text-sm text-gray-600">{b.address}</div>
                      </label>
                    ))}
                </div>
              </div>
            )}
          </div>

            <div className="bg-white rounded-lg p-4 border">
            <h2 className="font-semibold mb-3">{t('checkout.paymentMethod')}</h2>
            <div className="grid grid-cols-2 gap-3">
              {deliveryMethod === 'pickup' ? (
                <>
                  <label className={`p-3 border rounded ${payment === 'instore' ? 'ring-2 ring-blue-400' : ''}`}>
                    <input type="radio" name="payment" checked={payment === 'instore'} onChange={() => setPayment('instore')} /> {t('checkout.instorePayment')}
                  </label>
                </>
              ) : (
                <>
                  <label className={`p-3 border rounded ${payment === 'card' ? 'ring-2 ring-blue-400' : ''}`}>
                    <input type="radio" name="payment" checked={payment === 'card'} onChange={() => setPayment('card')} /> {t('checkout.cardPayment')}
                  </label>
                  <label className={`p-3 border rounded ${payment === 'cash' ? 'ring-2 ring-blue-400' : ''}`}>
                    <input type="radio" name="payment" checked={payment === 'cash'} onChange={() => setPayment('cash')} /> {t('checkout.cashPayment')}
                  </label>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="bg-pink-600 text-white px-6 py-3 rounded-lg">{t('checkout.completeOrder')}</button>
          </div>
        </form>
      </div>

      <aside>
        <div className="bg-white rounded-lg p-6 border space-y-4">
          <div className="font-semibold">{t('checkout.productCount')}: <span className="float-right">{(selectedItems && selectedItems.length) ? selectedItems.length : items.length} {t('cartPage.unit')}.</span></div>
          <div className="text-sm text-gray-600">
            {((selectedItems && selectedItems.length) ? selectedItems : items).map((it) => (
              <div key={it.id} className="flex justify-between py-2 border-b last:border-b-0">
                <div className="text-sm">{it.name} <span className="text-orange-500">({it.qty}{t('cartPage.unit')})</span></div>
                <div className="text-right">
                  <div className="text-red-600 font-semibold">{(it.price * it.qty).toFixed(2)} ₼</div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t">
            <div className="flex justify-between text-sm text-gray-600"><span>{t('cartPage.totalAmount')}:</span><span>{((selectedItems && selectedItems.length) ? selectedTotal : totalPrice).toFixed(2)} ₼</span></div>
            <div className="flex justify-between text-sm text-gray-600"><span>{t('cartPage.discountAmount')}:</span><span className="text-red-600">0.00 ₼</span></div>
            <div className="flex justify-between text-lg font-semibold mt-2"><span>{t('cartPage.finalAmount')}:</span><span>{((selectedItems && selectedItems.length) ? selectedTotal : totalPrice).toFixed(2)} ₼</span></div>
          </div>

        </div>
      </aside>
    </div>
  );
}
