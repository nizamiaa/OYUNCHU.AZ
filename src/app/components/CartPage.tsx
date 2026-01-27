import { useMemo, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { useCart, CartItem } from "../components/CartContext";
import { useTranslation } from 'react-i18next';

function QtyControls({ qty, onChange }: { qty: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onChange(Math.max(1, qty - 1))}
        className="w-8 h-8 rounded-full border flex items-center justify-center"
      >
        −
      </button>
      <div className="w-8 text-center">{qty}</div>
      <button
        onClick={() => onChange(qty + 1)}
        className="w-8 h-8 rounded-full border flex items-center justify-center"
      >
        +
      </button>
    </div>
  );
}

export default function CartPage() {
  const { items, totalPrice, removeFromCart, updateQty, selectedIds, toggleSelect, selectAll, clearSelection, selectedItems, selectedTotal } = useCart();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const allSelected = useMemo(() => items.length > 0 && selectedIds.length === items.length, [items, selectedIds]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, i) => sum + ((i.oldPrice ?? i.price) * i.qty), 0);
  }, [items]);

  const totalDiscount = useMemo(() => {
    return items.reduce((sum, i) => {
      const disc = i.oldPrice ? (i.oldPrice - i.price) : 0;
      return sum + disc * i.qty;
    }, 0);
  }, [items]);

  const finalTotal = useMemo(() => {
    return items.reduce((sum, i) => sum + i.price * i.qty, 0);
  }, [items]);

  const toggleSelectAll = () => (allSelected ? clearSelection() : selectAll());

  const removeSelected = () => {
    selectedIds.forEach((id) => removeFromCart(id));
    clearSelection();
  };

  if (items.length === 0) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto bg-white rounded-lg p-12 text-center border">
          <div className="mb-6 text-gray-400">(icon)</div>
          <h2 className="text-2xl font-semibold mb-2">{t('cartPage.emptyCartTitle')}</h2>
          <p className="text-gray-500 mb-6">{t('cartPage.emptyCartMessage')}</p>
          <a href="/" className="inline-block px-8 py-3 border rounded-lg">{t('cartPage.goHome')}</a>
        </div>
      </div>
    );
  }

  const displayCount = (selectedItems && selectedItems.length) ? selectedItems.length : items.length;

  return (
    <div className="p-8 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="col-span-2">
        <a href="/" className="text-sm text-gray-500 mb-4">{t('cartPage.breadcrumb')}</a>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">{t('cartPage.title')} ( {t('productCount')}: {displayCount} )</h1>
          <div className="flex gap-3">
            <button onClick={toggleSelectAll} className="px-4 py-2 rounded-md border">{t('cartPage.selectAll')}</button>
            <button onClick={removeSelected} className="px-4 py-2 rounded-md border bg-gray-100">{t('cartPage.removeSelected')}</button>
          </div>
        </div>

        <div className="space-y-4">
          {items.map((item: CartItem) => (
            <div key={item.id} className="bg-white rounded-lg p-4 flex items-center gap-4 border">
              <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} className="w-5 h-5" />

              <img src={item.imageUrl || "/placeholder.png"} alt={item.name} className="w-20 h-20 object-cover rounded" />

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{item.name}</div>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-gray-400">✕</button>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <QtyControls qty={item.qty} onChange={(n) => updateQty(item.id, n)} />

                  <div className="text-right">
                    <div className="text-red-600 font-semibold text-lg">{(item.price * item.qty).toFixed(2)} ₼</div>
                    {item.oldPrice && (
                      <div className="text-sm text-gray-400 line-through">{(item.oldPrice * item.qty).toFixed(2)} ₼</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <aside className="col-span-1">
          <div className="bg-white rounded-lg p-6 border space-y-4">
          <div className="font-semibold">{t('productCount')}: <span className="float-right">{displayCount} {t('cartPage.unit')}.</span></div>

          <div className="text-sm text-gray-600">
            {selectedItems.map((it) => (
              <div key={it.id} className="flex justify-between py-2 border-b last:border-b-0">
                <div className="text-sm">{it.name} <span className="text-orange-500">({it.qty}əd)</span></div>
                <div className="text-right">
                  {it.oldPrice ? <div className="text-gray-400 line-through text-sm">{it.oldPrice.toFixed(2)} ₼</div> : null}
                  <div className="text-red-600 font-semibold">{(it.price * it.qty).toFixed(2)} ₼</div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t">
            <div className="flex justify-between text-sm text-gray-600"><span>{t('cartPage.totalAmount')}:</span><span>{selectedTotal.toFixed(2)} ₼</span></div>
            <div className="flex justify-between text-sm text-gray-600"><span>{t('cartPage.discountAmount')}:</span><span className="text-red-600">0.00 ₼</span></div>
            <div className="flex justify-between text-lg font-semibold mt-2"><span>{t('cartPage.finalAmount')}:</span><span>{selectedTotal.toFixed(2)} ₼</span></div>
          </div>

          <button onClick={() => navigate('/checkout')} className="w-full bg-pink-600 text-white py-3 rounded-lg">{t('cartPage.checkout')}</button>
        </div>
      </aside>
    </div>
  );
}
