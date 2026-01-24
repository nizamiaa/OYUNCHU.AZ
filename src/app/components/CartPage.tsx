import { useMemo, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { useCart, CartItem } from "../components/CartContext";

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
  const { items, totalPrice, removeFromCart, updateQty } = useCart();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<number[]>([]);

  const allSelected = useMemo(() => items.length > 0 && selected.length === items.length, [items, selected]);

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

  const toggleSelect = (id: number) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const toggleSelectAll = () => (allSelected ? setSelected([]) : setSelected(items.map((i) => i.id)));

  const removeSelected = () => {
    selected.forEach((id) => removeFromCart(id));
    setSelected([]);
  };

  if (items.length === 0) {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto bg-white rounded-lg p-12 text-center border">
          <div className="mb-6 text-gray-400">(icon)</div>
          <h2 className="text-2xl font-semibold mb-2">Səbətində məhsul yoxdur</h2>
          <p className="text-gray-500 mb-6">İstədiyin məhsulu səbətinə əlavə et.</p>
          <a href="/" className="inline-block px-8 py-3 border rounded-lg">Əsas səhifə</a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="col-span-2">
        <a href="/" className="text-sm text-gray-500 mb-4">Ana səhifə &gt; Səbət</a>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Səbət ( Məhsul sayı: {items.length} )</h1>
          <div className="flex gap-3">
            <button onClick={toggleSelectAll} className="px-4 py-2 rounded-md border">Hamısını seç</button>
            <button onClick={removeSelected} className="px-4 py-2 rounded-md border bg-gray-100">Seçilənləri sil</button>
          </div>
        </div>

        <div className="space-y-4">
          {items.map((item: CartItem) => (
            <div key={item.id} className="bg-white rounded-lg p-4 flex items-center gap-4 border">
              <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggleSelect(item.id)} className="w-5 h-5" />

              <img src={item.imageUrl || "/placeholder.png"} alt={item.name} className="w-20 h-20 object-cover rounded" />

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{item.name}</div>
                    <div className="mt-2">
                      <button className="px-3 py-1 rounded-md border text-sm">Zəmanət</button>
                    </div>
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
          <div className="font-semibold">Məhsul sayı: <span className="float-right">{items.length} əd.</span></div>

          <div className="text-sm text-gray-600">
            {items.map((it) => (
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
            <div className="flex justify-between text-sm text-gray-600"><span>Ümumi məbləğ:</span><span>{totalPrice.toFixed(2)} ₼</span></div>
            <div className="flex justify-between text-sm text-gray-600"><span>Endirim məbləği:</span><span className="text-red-600">0.00 ₼</span></div>
            <div className="flex justify-between text-lg font-semibold mt-2"><span>Yekun məbləğ:</span><span>{totalPrice.toFixed(2)} ₼</span></div>
          </div>

          <button onClick={() => navigate('/checkout')} className="w-full bg-pink-600 text-white py-3 rounded-lg">Sifarişi rəsmiləşdir</button>
        </div>
      </aside>
    </div>
  );
}
