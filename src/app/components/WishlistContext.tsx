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
      if (raw) setItems(JSON.parse(raw));
      else setItems([]);
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
    setItems((prev) => {
      if (prev.find((p) => p.id === item.id)) return prev;
      return [...prev, item];
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
