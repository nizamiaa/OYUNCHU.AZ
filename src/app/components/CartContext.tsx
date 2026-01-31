import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

export type CartItem = {
  id: number;
  name: string;
  price: number;
  imageUrl?: string;
  oldPrice?: number;
  qty: number;
};

type CartContextType = {
  items: CartItem[];
  totalQty: number;
  totalPrice: number;

  // selection-aware
  selectedIds: number[];
  selectedItems: CartItem[];
  selectedTotal: number;

  updateQty: (id: number, qty: number) => void;
  addToCart: (product: Omit<CartItem, "qty">) => void;
  removeFromCart: (id: number) => void;
  clearCart: () => void;

  toggleSelect: (id: number) => void;
  selectAll: () => void;
  clearSelection: () => void;
};

const CartContext = createContext<CartContextType | null>(null);

/** Safely parse JSON from localStorage */
function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Normalize stored items (supports different key casings) */
function normalizeItems(list: any[]): CartItem[] {
  return (Array.isArray(list) ? list : []).map((p: any) => ({
    id: Number(p.id ?? p.Id ?? p.ProductId ?? 0),
    name: String(p.name ?? p.Name ?? p.Title ?? ""),
    price: Number(p.price ?? p.Price ?? p.PriceValue ?? 0) || 0,
    imageUrl: p.imageUrl ?? p.ImageUrl ?? p.Image ?? undefined,
    oldPrice: p.oldPrice ?? p.OriginalPrice ?? p.old_price ?? undefined,
    qty: Math.max(1, Number(p.qty ?? p.Qty ?? p.quantity ?? 1) || 1),
  }));
}

/** Merge two carts by id (sum qty, prefer non-empty fields) */
function mergeCarts(a: CartItem[], b: CartItem[]): CartItem[] {
  const map = new Map<number, CartItem>();
  const push = (it: CartItem) => {
    if (!it?.id) return;
    const cur = map.get(it.id);
    if (!cur) {
      map.set(it.id, { ...it });
      return;
    }
    map.set(it.id, {
      ...cur,
      name: cur.name || it.name,
      imageUrl: cur.imageUrl || it.imageUrl,
      oldPrice: cur.oldPrice ?? it.oldPrice,
      price: Number(cur.price || 0) || Number(it.price || 0),
      qty: (cur.qty || 1) + (it.qty || 1),
    });
  };
  a.forEach(push);
  b.forEach(push);
  return Array.from(map.values());
}

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const auth = useAuth();
  // support both user.id and user.Id etc.
  const userId = Number((auth as any)?.user?.id ?? (auth as any)?.user?.Id ?? 0) || null;

  const cartKey = (uid?: number | null) => (uid ? `cart_${uid}` : `cart_guest`);
  const selKey = (uid?: number | null) => (uid ? `cartsel_${uid}` : `cartsel_guest`);

  const [items, setItems] = useState<CartItem[]>(() => {
    // initial load as guest by default
    const raw = localStorage.getItem(cartKey(null));
    return normalizeItems(safeParse<any[]>(raw, []));
  });

  const [selectedIds, setSelectedIds] = useState<number[]>(() => {
    const raw = localStorage.getItem(selKey(null));
    const parsed = safeParse<any[]>(raw, []);
    return (Array.isArray(parsed) ? parsed : [])
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n));
  });

  /**
   * Load cart when user changes (guest <-> user).
   * If user just logged in: merge guest cart into user cart once.
   */
  useEffect(() => {
    const uid = userId;

    // read target cart
    const targetCart = normalizeItems(safeParse<any[]>(localStorage.getItem(cartKey(uid)), []));
    const targetSel = safeParse<any[]>(localStorage.getItem(selKey(uid)), [])
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n));

    if (uid) {
      // merge guest cart into user cart (best UX)
      const guestCart = normalizeItems(safeParse<any[]>(localStorage.getItem(cartKey(null)), []));
      const guestSel = safeParse<any[]>(localStorage.getItem(selKey(null)), [])
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n));

      // Merge only if guest has items
      const merged = guestCart.length ? mergeCarts(targetCart, guestCart) : targetCart;

      // Merge selection ids too (and later we'll clean invalid)
      const mergedSel = Array.from(new Set([...(targetSel || []), ...(guestSel || [])]));

      // Persist merged into user storage
      try {
        localStorage.setItem(cartKey(uid), JSON.stringify(merged));
        localStorage.setItem(selKey(uid), JSON.stringify(mergedSel));
      } catch {}

      // Clear guest after merge (optional, but recommended)
      try {
        if (guestCart.length) {
          localStorage.removeItem(cartKey(null));
          localStorage.removeItem(selKey(null));
        }
      } catch {}

      setItems(merged);
      setSelectedIds(mergedSel);
    } else {
      // guest mode: just load guest cart
      setItems(targetCart);
      setSelectedIds(targetSel);
    }
  }, [userId]);

  /** Persist cart items for current mode (guest or user) */
  useEffect(() => {
    try {
      localStorage.setItem(cartKey(userId), JSON.stringify(items));
    } catch {}
  }, [items, userId]);

  /** Persist selected ids for current mode (guest or user) */
  useEffect(() => {
    try {
      localStorage.setItem(selKey(userId), JSON.stringify(selectedIds));
    } catch {}
  }, [selectedIds, userId]);

  /** Keep selection clean when items change (remove ids that no longer exist) */
  useEffect(() => {
    const valid = new Set(items.map((i) => i.id));
    setSelectedIds((prev) => prev.filter((id) => valid.has(id)));
  }, [items]);

  const addToCart = (product: Omit<CartItem, "qty">) => {
    const p = {
      id: Number((product as any).id ?? (product as any).Id ?? (product as any).ProductId ?? 0),
      name: String((product as any).name ?? (product as any).Name ?? (product as any).Title ?? ""),
      price: Number((product as any).price ?? (product as any).Price ?? 0) || 0,
      imageUrl: (product as any).imageUrl ?? (product as any).ImageUrl ?? (product as any).Image ?? undefined,
      oldPrice: (product as any).oldPrice ?? (product as any).OriginalPrice ?? undefined,
    } as Omit<CartItem, "qty">;

    if (!p.id) return;

    setItems((prev) => {
      const exists = prev.find((i) => i.id === p.id);
      const next = exists
        ? prev.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i))
        : [...prev, { ...p, qty: 1 } as CartItem];

      return next;
    });

    // auto-select added item
    setSelectedIds((s) => (s.includes(p.id) ? s : [...s, p.id]));
  };

  const removeFromCart = (id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelectedIds((s) => s.filter((x) => x !== id));
  };

  const updateQty = (id: number, qty: number) => {
    const q = Math.max(1, Number(qty) || 1); // keep minimum 1
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty: q } : i)));
  };

  const clearCart = () => {
    setItems([]);
    setSelectedIds([]);
    try {
      localStorage.removeItem(cartKey(userId));
      localStorage.removeItem(selKey(userId));
    } catch {}
  };

  const toggleSelect = (id: number) =>
    setSelectedIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const selectAll = () => setSelectedIds(items.map((i) => i.id));
  const clearSelection = () => setSelectedIds([]);

  const totalQty = useMemo(() => items.reduce((sum, i) => sum + i.qty, 0), [items]);
  const totalPrice = useMemo(() => items.reduce((sum, i) => sum + i.price * i.qty, 0), [items]);

  const selectedItems = useMemo(
    () => items.filter((i) => selectedIds.includes(i.id)),
    [items, selectedIds]
  );

  const selectedTotal = useMemo(
    () => selectedItems.reduce((s, i) => s + i.price * i.qty, 0),
    [selectedItems]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        totalQty,
        totalPrice,
        selectedIds,
        selectedItems,
        selectedTotal,
        updateQty,
        addToCart,
        removeFromCart,
        clearCart,
        toggleSelect,
        selectAll,
        clearSelection,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
};
