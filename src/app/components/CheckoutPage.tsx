import React, { useState } from 'react';
import { useCart } from './CartContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { branches } from './BranchesPage';

export default function CheckoutPage() {
  const { items, totalPrice } = useCart();
  const navigate = useNavigate();
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    // basic validation
    const localDigits = String(phone || '').replace(/\D/g, '').replace(/^994/, '');
    if (!name || !localDigits || localDigits.length < 7) {
      alert('Zəhmət olmasa ad və düzgün telefon nömrəsi daxil edin');
      return;
    }
    if (deliveryMethod === 'pickup' && !selectedBranchId) {
      alert('Zəhmət olmasa filial seçin');
      return;
    }
    if (deliveryMethod === 'courier' && (!city || !String(city).trim())) {
      alert('Zəhmət olmasa çatdırılma üçün şəhər daxil edin');
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
      total: totalPrice,
      items: items.map(i => ({ id: i.id, price: i.price, qty: i.qty }))
    };

    try {
      const res = await axios.post('/api/orders', payload);
      if (res.data && (res.data.success || res.status === 200)) {
        navigate('/checkout/complete');
      } else {
        alert('Sifarişi göndərərkən xəta oldu');
      }
    } catch (err) {
      console.error('Order submit error', err);
      alert('Sifarişi göndərərkən xəta oldu');
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

  return (
    <div className="p-8 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="col-span-2">
        <h1 className="text-2xl font-bold mb-4">Sifarişin rəsmiləşdirilməsi</h1>

        <form onSubmit={submit} className="space-y-6">
          <div className="bg-white rounded-lg p-4 border">
            <h2 className="font-semibold mb-3">Şəxsi məlumat</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm">Ad *</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full border-b py-2 mt-1" />
              </div>
              <div>
                <label className="text-sm">Soyad *</label>
                <input value={surname} onChange={e => setSurname(e.target.value)} className="w-full border-b py-2 mt-1" />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm">Nömrə *</label>
                <input value={phone} onChange={e => {
                  // normalize input: keep only digits after prefix, ensure prefix stays
                  let v = String(e.target.value || '');
                  // extract digits
                  let digits = v.replace(/\D/g, '');
                  // if user pasted full number starting with 994..., strip leading 994
                  if (digits.startsWith('994')) digits = digits.replace(/^994/, '');
                  digits = digits.slice(0, MAX_LOCAL_DIGITS);
                  setPhone(COUNTRY_PREFIX + digits);
                }} className="w-full border-b py-2 mt-1" placeholder="+994 (##) ###-##-##" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border">
            <h2 className="font-semibold mb-3">Çatdırılma üsulu</h2>
            <div className="flex gap-3 mb-4">
              <button type="button" onClick={() => setDeliveryMethod('courier')} className={`px-3 py-2 rounded-full border ${deliveryMethod === 'courier' ? 'bg-black text-white' : ''}`}>Kuryer</button>
              <button type="button" onClick={() => setDeliveryMethod('pickup')} className={`px-3 py-2 rounded-full border ${deliveryMethod === 'pickup' ? 'bg-black text-white' : ''}`}>Mağazadan götür</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm">Şəhər *</label>
                {deliveryMethod === 'courier' ? (
                  <input value={city} onChange={e => setCity(e.target.value)} className="w-full border-b py-2 mt-1" placeholder="Şəhər adını daxil edin" />
                ) : (
                  <select value={city} onChange={e => setCity(e.target.value)} className="w-full border-b py-2 mt-1">
                    <option value="">--Şəhər seç--</option>
                    <option value="baku">Baku</option>
                    <option value="sumqayit">Sumqayit</option>
                    <option value="gence">Gence</option>
                  </select>
                )}
              </div>
              <div>
                <label className="text-sm">Ünvan *</label>
                <input value={address} onChange={e => setAddress(e.target.value)} className="w-full border-b py-2 mt-1" />
              </div>
            </div>

            {deliveryMethod === 'pickup' && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Mağazalardan seç</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {branches
                    .filter(b => !city || b.region.toLowerCase().includes(city.toLowerCase()) || city === '')
                    .map(b => (
                      <label key={b.id} className={`p-3 border rounded cursor-pointer ${selectedBranchId === b.id ? 'ring-2 ring-blue-400' : ''}`}>
                        <input type="radio" name="branch" checked={selectedBranchId === b.id} onChange={() => setSelectedBranchId(b.id)} />
                        <div className="ml-2 inline-block font-semibold">{b.name}</div>
                        <div className="text-sm text-gray-600">{b.address}</div>
                      </label>
                    ))}
                </div>
              </div>
            )}
          </div>

            <div className="bg-white rounded-lg p-4 border">
            <h2 className="font-semibold mb-3">Ödəniş üsulu</h2>
            <div className="grid grid-cols-2 gap-3">
              {deliveryMethod === 'pickup' ? (
                <>
                  <label className={`p-3 border rounded ${payment === 'instore' ? 'ring-2 ring-blue-400' : ''}`}>
                    <input type="radio" name="payment" checked={payment === 'instore'} onChange={() => setPayment('instore')} /> Mağazada ödəniş
                  </label>
                  <label className={`p-3 border rounded ${payment === 'cart2cart' ? 'ring-2 ring-blue-400' : ''}`}>
                    <input type="radio" name="payment" checked={payment === 'cart2cart'} onChange={() => setPayment('cart2cart')} /> Kartdan karta
                  </label>
                </>
              ) : (
                <>
                  <label className={`p-3 border rounded ${payment === 'card' ? 'ring-2 ring-blue-400' : ''}`}>
                    <input type="radio" name="payment" checked={payment === 'card'} onChange={() => setPayment('card')} /> Kartla ödəniş
                  </label>
                  <label className={`p-3 border rounded ${payment === 'cash' ? 'ring-2 ring-blue-400' : ''}`}>
                    <input type="radio" name="payment" checked={payment === 'cash'} onChange={() => setPayment('cash')} /> Qapıda ödəniş
                  </label>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" className="bg-pink-600 text-white px-6 py-3 rounded-lg">Sifarişi tamamla</button>
          </div>
        </form>
      </div>

      <aside>
        <div className="bg-white rounded-lg p-6 border space-y-4">
          <div className="font-semibold">Məhsul sayı: <span className="float-right">{items.length} əd.</span></div>
          <div className="text-sm text-gray-600">
            {items.map((it) => (
              <div key={it.id} className="flex justify-between py-2 border-b last:border-b-0">
                <div className="text-sm">{it.name} <span className="text-orange-500">({it.qty}əd)</span></div>
                <div className="text-right">
                  <div className="text-red-600 font-semibold">{(it.price * it.qty).toFixed(2)} ₼</div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t">
            <div className="flex justify-between text-sm text-gray-600"><span>Ümumi məbləğ:</span><span>{totalPrice.toFixed(2)} ₼</span></div>
            <div className="flex justify-between text-sm text-gray-600"><span>Endirim məbləği:</span><span className="text-red-600">0.00 ₼</span></div>
            <div className="flex justify-between text-lg font-semibold mt-2"><span>Yekun məbləğ:</span><span>{totalPrice.toFixed(2)} ₼</span></div>
          </div>

        </div>
      </aside>
    </div>
  );
}
