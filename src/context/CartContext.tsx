import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Book, BookPackage, CartItem } from '../lib/types';
import { effectivePrice, packageEffectivePrice } from '../lib/types';

interface CartContextValue {
  items: CartItem[];
  addBook: (book: Book, quantity?: number, openDrawer?: boolean) => void;
  addPackage: (pkg: BookPackage, quantity?: number, openDrawer?: boolean) => void;
  remove: (id: string, isPackage?: boolean) => void;
  updateQty: (id: string, quantity: number, isPackage?: boolean) => void;
  clear: () => void;
  total: number;
  count: number;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  hasItem: (id: string, isPackage?: boolean) => boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}

const STORAGE_KEY = 'noor-cart';

function loadCart(): CartItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Migrate old format (book only) to new format
      return parsed.map((item: CartItem) => ({
        ...item,
        isPackage: item.isPackage ?? !!(item.package && !item.book),
      }));
    }
  } catch {
    // ignore
  }
  return [];
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const [isOpen, setOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addBook = useCallback((book: Book, quantity = 1, openDrawer = true) => {
    setItems((prev) => {
      const existing = prev.find((i) => !i.isPackage && i.book?.id === book.id);
      let newItems: CartItem[];
      if (existing) {
        newItems = prev.map((i) =>
          !i.isPackage && i.book?.id === book.id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      } else {
        newItems = [...prev, { book, quantity, isPackage: false }];
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
      return newItems;
    });
    if (openDrawer) setOpen(true);
  }, []);

  const addPackage = useCallback((pkg: BookPackage, quantity = 1, openDrawer = true) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.isPackage && i.package?.id === pkg.id);
      let newItems: CartItem[];
      if (existing) {
        newItems = prev.map((i) =>
          i.isPackage && i.package?.id === pkg.id
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      } else {
        newItems = [...prev, { package: pkg, quantity, isPackage: true }];
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
      return newItems;
    });
    if (openDrawer) setOpen(true);
  }, []);

  const remove = useCallback((id: string, isPackage = false) => {
    setItems((prev) =>
      prev.filter((i) => {
        if (isPackage) {
          return !(i.isPackage && i.package?.id === id);
        }
        return !(!i.isPackage && i.book?.id === id);
      })
    );
  }, []);

  const updateQty = useCallback((id: string, quantity: number, isPackage = false) => {
    if (quantity < 1) return;
    setItems((prev) =>
      prev.map((i) => {
        if (isPackage && i.isPackage && i.package?.id === id) {
          return { ...i, quantity };
        }
        if (!isPackage && !i.isPackage && i.book?.id === id) {
          return { ...i, quantity };
        }
        return i;
      })
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const hasItem = useCallback((id: string, isPackage = false) => {
    return items.some((i) => {
      if (isPackage) {
        return i.isPackage && i.package?.id === id;
      }
      return !i.isPackage && i.book?.id === id;
    });
  }, [items]);

  const total = items.reduce((sum, i) => {
    if (i.isPackage && i.package) {
      return sum + packageEffectivePrice(i.package) * i.quantity;
    }
    if (i.book) {
      return sum + effectivePrice(i.book) * i.quantity;
    }
    return sum;
  }, 0);

  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addBook,
        addPackage,
        remove,
        updateQty,
        clear,
        total,
        count,
        isOpen,
        setOpen,
        hasItem,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
