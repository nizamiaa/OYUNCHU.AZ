import React, { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart, CartItem } from "../components/CartContext";
import { useTranslation } from "react-i18next";
import { Trash2, ShoppingBag, Minus, Plus } from "lucide-react";

function QtyControls({ qty, onChange }: { qty: number; onChange: (n: number) => void }) {
  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, qty - 1))}
        className="h-9 w-9 rounded-full border border-gray-200 hover:bg-gray-50 flex items-center justify-center"
        aria-label="Decrease"
      >
        <Minus size={16} />
      </button>

      <div className="min-w-[36px] text-center font-semibold text-gray-900">{qty}</div>

      <button
        type="button"
        onClick={() => onChange(qty + 1)}
        className="h-9 w-9 rounded-full border border-gray-200 hover:bg-gray-50 flex items-center justify-center"
        aria-label="Increase"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

export default function CartPage() {
  const {
    items,
    removeFromCart,
    updateQty,
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    selectedItems,
    selectedTotal,
  } = useCart();

  const navigate = useNavigate();
  const { t } = useTranslation();

  const allSelected = useMemo(
    () => items.length > 0 && selectedIds.length === items.length,
    [items, selectedIds]
  );

  const toggleSelectAll = () => (allSelected ? clearSelection() : selectAll());

  const removeSelected = () => {
    if (!selectedIds.length) return;
    selectedIds.forEach((id) => removeFromCart(id));
    clearSelection();
  };

  // ✅ Summary should show selected items, fallback to all items
  const summaryItems: CartItem[] = useMemo(() => {
    return selectedItems && selectedItems.length ? selectedItems : items;
  }, [selectedItems, items]);

  const displayCount = summaryItems.reduce((sum, it) => sum + it.qty, 0);

  // ✅ Totals based on summaryItems (selected or all)
  const subtotal = useMemo(() => {
    return summaryItems.reduce((sum, i) => sum + ((i.oldPrice ?? i.price) * i.qty), 0);
  }, [summaryItems]);

  const totalDiscount = useMemo(() => {
    return summaryItems.reduce((sum, i) => {
      const disc = i.oldPrice ? (i.oldPrice - i.price) : 0;
      return sum + disc * i.qty;
    }, 0);
  }, [summaryItems]);

  const finalTotal = useMemo(() => {
    return summaryItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  }, [summaryItems]);

  const hasAnySelection = selectedIds.length > 0;

  if (items.length === 0) {
    return (
      <div className="container mx-auto p-4 sm:p-8">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl p-8 sm:p-12 text-center border shadow-sm">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-5">
            <ShoppingBag className="text-gray-600" />
          </div>

          <h2 className="text-xl sm:text-2xl font-semibold mb-2">
            {t("cartPage.emptyCartTitle")}
          </h2>
          <p className="text-gray-500 mb-6">
            {t("cartPage.emptyCartMessage")}
          </p>

          <Link to="/" className="inline-flex items-center justify-center px-6 py-3 border rounded-xl hover:bg-gray-50 transition">
            {t("cartPage.goHome")}
          </Link>
        </div>
      </div>
    );
  }

  const SummaryBox = () => (
    <div className="bg-white rounded-2xl p-4 border shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm text-gray-900">{t("cartPage.summary") || "Summary"}</div>
        <div className="text-sm text-gray-500">
          {t("productCount")}: <span className="font-semibold text-gray-800">{displayCount}</span> {t("cartPage.unit")}.
        </div>
      </div>

      <div className="max-h-56 overflow-auto pr-1">
        {summaryItems.map((it) => (
          <div key={it.id} className="flex justify-between gap-3 py-2 border-b last:border-b-0">
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900 line-clamp-1">
                {it.name} <span className="text-orange-500">({it.qty} əd)</span>
              </div>
              <div className="text-right shrink-0 whitespace-nowrap">
                {t("cartPage.finalAmount") || "Final Amount"}: {it.price.toFixed(2)} ₼
              </div>
            </div>

            <div className="text-right shrink-0">
              {it.oldPrice ? (
                <div className="text-xs text-gray-400 line-through">
                  {(it.oldPrice * it.qty).toFixed(2)} ₼
                </div>
              ) : null}
              <div className="text-sm font-semibold text-gray-900">
                {(it.price * it.qty).toFixed(2)} ₼
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>{t("cartPage.totalAmount")}:</span>
          <span>{subtotal.toFixed(2)} ₼</span>
        </div>

        <div className="flex justify-between text-sm text-gray-600">
          <span>{t("cartPage.discountAmount")}:</span>
          <span className="text-orange-600">-{totalDiscount.toFixed(2)} ₼</span>
        </div>

        <div className="flex justify-between text-lg font-semibold text-gray-900">
          <span>{t("cartPage.finalAmount")}:</span>
          <span>{finalTotal.toFixed(2)} ₼</span>
        </div>
      </div>

      <button
        onClick={() => navigate("/checkout")}
        className="w-full bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition font-semibold"
      >
        {t("cartPage.checkout")}
      </button>
    </div>
  );

  return (
    <div className="container mx-auto p-4 sm:p-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* LEFT */}
        <div className="lg:col-span-2">
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">
            {t("cartPage.breadcrumb")}
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-3 mb-4">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">
              {t("cartPage.title")}
              <span className="text-gray-500 font-medium"> ({t("productCount")}: {displayCount})</span>
            </h1>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleSelectAll}
                className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-sm font-medium"
              >
                {allSelected ? (t("cartPage.selectAll") || "Clear") : t("cartPage.selectAll")}
              </button>

              <button
                onClick={removeSelected}
                disabled={!hasAnySelection}
                className={[
                  "px-4 py-2 rounded-xl border text-sm font-medium inline-flex items-center gap-2",
                  hasAnySelection
                    ? "border-gray-200 hover:bg-gray-50"
                    : "border-gray-100 text-gray-300 cursor-not-allowed",
                ].join(" ")}
              >
                <Trash2 size={16} />
                {t("cartPage.removeSelected")}
              </button>
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {items.map((item: CartItem) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-3 sm:p-4 border shadow-sm flex gap-3 sm:gap-4 overflow-hidden"
              >
                <div className="pt-1">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => toggleSelect(item.id)}
                    className="w-5 h-5"
                  />
                </div>

                <img
                  src={item.imageUrl || "/placeholder.png"}
                  alt={item.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm sm:text-base text-gray-900 line-clamp-2">
                        {item.name}
                      </div>
                      {item.oldPrice ? (
                        <div className="text-xs text-orange-600 mt-1">
                          {t("cartPage.discount") || "Discount"}: {(item.oldPrice - item.price).toFixed(2)} ₼
                        </div>
                      ) : null}
                    </div>

                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-gray-400 hover:text-gray-700"
                      aria-label="Remove"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <QtyControls qty={item.qty} onChange={(n) => updateQty(item.id, n)} />

                    <div className="text-right shrink-0 ml-auto">
                      <div className="text-gray-900 font-semibold text-sm sm:text-base whitespace-nowrap">
                        {(item.price * item.qty).toFixed(2)} ₼
                      </div>
                      {item.oldPrice ? (
                        <div className="text-xs text-gray-400 line-through whitespace-nowrap">
                          {(item.oldPrice * item.qty).toFixed(2)} ₼
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* MOBILE: Sticky summary button */}
          <div className="lg:hidden mt-5 sticky bottom-3">
            <button
              onClick={() => {
                // scroll to summary block
                const el = document.getElementById("cart-summary");
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="w-full bg-white border shadow-sm rounded-2xl px-4 py-3 flex items-center justify-between"
            >
              <div className="text-sm text-gray-600">{t("cartPage.finalAmount")}:</div>
              <div className="text-base font-semibold text-gray-900">{finalTotal.toFixed(2)} ₼</div>
            </button>
          </div>
        </div>

        {/* RIGHT */}
        <aside className="lg:col-span-1">
          <div id="cart-summary">
            <SummaryBox />
          </div>
        </aside>
      </div>
    </div>
  );
}
