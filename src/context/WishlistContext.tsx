import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { Book } from '../lib/types';

interface WishlistContextValue {
  items: Book[];
  loading: boolean;
  toggle: (book: Book) => Promise<void>;
  has: (bookId: string) => boolean;
  refresh: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('wishlists')
      .select('book:books(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setItems((data as unknown as { book: Book }[]).map((d) => d.book).filter(Boolean));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggle = useCallback(
    async (book: Book) => {
      if (!user) return;
      const existing = items.find((b) => b.id === book.id);
      if (existing) {
        await supabase.from('wishlists').delete().eq('user_id', user.id).eq('book_id', book.id);
        setItems((prev) => prev.filter((b) => b.id !== book.id));
      } else {
        await supabase.from('wishlists').insert({ user_id: user.id, book_id: book.id });
        setItems((prev) => [book, ...prev]);
      }
    },
    [user, items]
  );

  const has = useCallback((bookId: string) => items.some((b) => b.id === bookId), [items]);

  return (
    <WishlistContext.Provider value={{ items, loading, toggle, has, refresh }}>
      {children}
    </WishlistContext.Provider>
  );
}
