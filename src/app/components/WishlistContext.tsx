import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

export type WishlistItem = {
  id: number;
  name: string;
  price?: number;
  imageUrl?: string;
};

type WishlistContextType = {
  items: WishlistItem[];
  add: (item: WishlistItem) => void;
  remove: (id: number) => void;
  contains: (id: number) => boolean;
  clear: () => void;
};

const WishlistContext = createContext<WishlistContextType | null>(null);

export const WishlistProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);

  const storageKey = (uid?: number | null) => `wishlist_${uid ?? 'guest'}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(user?.id ?? null));
      if (raw) {
        const parsed: any[] = JSON.parse(raw);
        const normalized = parsed.map((p) => ({
          id: p.id ?? p.Id ?? p.ProductId,
          name: p.name ?? p.Name ?? p.Title ?? '',
          price: Number(p.price ?? p.Price ?? 0) || 0,
          imageUrl: p.imageUrl ?? p.ImageUrl ?? p.Image ?? undefined,
        }));
        setItems(normalized);
      } else setItems([]);
    } catch (err) {
      console.error('Failed to load wishlist', err);
      setItems([]);
    }
  }, [user?.id]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey(user?.id ?? null), JSON.stringify(items));
    } catch (err) {
      console.error('Failed to persist wishlist', err);
    }
  }, [items, user?.id]);

  const add = (item: WishlistItem) => {
    // normalize incoming item shape
    const it = {
      id: (item as any).id ?? (item as any).Id ?? (item as any).ProductId,
      name: (item as any).name ?? (item as any).Name ?? (item as any).Title ?? '',
      price: Number((item as any).price ?? (item as any).Price ?? 0) || 0,
      imageUrl: (item as any).imageUrl ?? (item as any).ImageUrl ?? (item as any).Image ?? undefined,
    } as WishlistItem;

    setItems((prev) => {
      if (prev.find((p) => p.id === it.id)) return prev;
      return [...prev, it];
    });
  };

  const remove = (id: number) => setItems((prev) => prev.filter((p) => p.id !== id));

  const clear = () => setItems([]);

  const contains = (id: number) => items.some((i) => i.id === id);

  return (
    <WishlistContext.Provider value={{ items, add, remove, contains, clear }}>
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used inside WishlistProvider');
  return ctx;
};

export default WishlistContext;
