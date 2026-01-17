import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import { useAuth } from './AuthContext';

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
  updateQty: (id: number, qty: number) => void;
  addToCart: (product: Omit<CartItem, "qty">) => void;
  removeFromCart: (id: number) => void;
  clearCart: () => void;
};


const CartContext = createContext<CartContextType | null>(null);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const { user } = useAuth();

  const storageKey = (uid?: number | null) => (uid ? `cart_${uid}` : `cart_guest`);

  // Load cart for current authenticated user; when no user, keep cart empty
  useEffect(() => {
    try {
      if (!user?.id) {
        setItems([]);
        return;
      }

      const key = storageKey(user.id);
      const raw = localStorage.getItem(key);
      if (raw) {
        // normalize stored items to ensure correct keys
        const parsed: any[] = JSON.parse(raw);
        const normalized = parsed.map((p) => ({
          id: p.id ?? p.Id ?? p.ProductId,
          name: p.name ?? p.Name ?? p.Title ?? '',
          price: Number(p.price ?? p.Price ?? p.PriceValue ?? 0) || 0,
          imageUrl: p.imageUrl ?? p.ImageUrl ?? p.Image ?? undefined,
          oldPrice: p.oldPrice ?? p.OriginalPrice ?? p.old_price ?? undefined,
          qty: p.qty ?? p.Qty ?? p.quantity ?? 1,
        }));
        setItems(normalized as any);
        return;
      }
      setItems([]);
    } catch (err) {
      console.error('Failed to load cart from storage', err);
      setItems([]);
    }
  }, [user?.id]);

  // Persist cart whenever items change
  useEffect(() => {
    try {
      if (!user?.id) return; // only persist for authenticated users
      const key = storageKey(user.id);
      localStorage.setItem(key, JSON.stringify(items));
    } catch (err) {
      console.error('Failed to persist cart to storage', err);
    }
  }, [items, user?.id]);

  const addToCart = (product: Omit<CartItem, "qty">) => {
    // normalize incoming product shape (accept PascalCase from API)
    const p = {
      id: (product as any).id ?? (product as any).Id ?? (product as any).ProductId,
      name: (product as any).name ?? (product as any).Name ?? (product as any).Title,
      price: Number((product as any).price ?? (product as any).Price ?? 0) || 0,
      imageUrl: (product as any).imageUrl ?? (product as any).ImageUrl ?? (product as any).Image,
      oldPrice: (product as any).oldPrice ?? (product as any).OriginalPrice ?? undefined,
    } as Omit<CartItem, 'qty'>;

    setItems((prev) => {
      const exists = prev.find((i) => i.id === p.id);

      if (exists) {
        return prev.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i));
      }

      return [...prev, { ...p, qty: 1 } as CartItem];
    });
  };

  const removeFromCart = (id: number) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  const updateQty = (id: number, qty: number) =>
    setItems((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, qty: Math.max(0, qty) } : i))
        .filter((i) => i.qty > 0)
    );

  const clearCart = () => setItems([]);

  const totalQty = useMemo(
    () => items.reduce((sum, i) => sum + i.qty, 0),
    [items]
  );

  const totalPrice = useMemo(
    () => items.reduce((sum, i) => sum + i.price * i.qty, 0),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        totalQty,
        totalPrice,
        updateQty,
        addToCart,
        removeFromCart,
        clearCart,
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
