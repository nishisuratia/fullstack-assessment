'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

export interface CartItem {
  stacklineSku: string;
  title: string;
  categoryName: string;
  subCategoryName: string;
  imageUrl?: string;
  retailPrice: number;
  quantity: number;
  selected: boolean;
}

// ---------- storage helpers ----------

const STORAGE_KEY = 'cart_items_v1';

function readStorage(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<CartItem>[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => ({
      stacklineSku: item.stacklineSku ?? '',
      title: item.title ?? '',
      categoryName: item.categoryName ?? '',
      subCategoryName: item.subCategoryName ?? '',
      imageUrl: item.imageUrl,
      retailPrice: item.retailPrice ?? 0,
      quantity: item.quantity && item.quantity > 0 ? item.quantity : 1,
      selected: item.selected ?? true,
    }));
  } catch {
    return [];
  }
}

function writeStorage(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore quota errors
  }
}

// ---------- context ----------

interface CartContextValue {
  items: CartItem[];
  selectedItems: CartItem[];
  totalPrice: number;
  addItem: (item: Omit<CartItem, 'quantity' | 'selected'>, quantity?: number) => void;
  removeItem: (stacklineSku: string) => void;
  clearCart: () => void;
  updateQuantity: (stacklineSku: string, quantity: number) => void;
  setItemSelected: (stacklineSku: string, selected: boolean) => void;
  setAllSelected: (selected: boolean) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

// ---------- provider ----------

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const hydrated = useRef(false);

  // Hydrate once from localStorage on mount
  useEffect(() => {
    setItems(readStorage());
    hydrated.current = true;
  }, []);

  // Persist to localStorage whenever items change, but only after hydration
  useEffect(() => {
    if (!hydrated.current) return;
    writeStorage(items);
  }, [items]);

  const addItem = useCallback(
    (item: Omit<CartItem, 'quantity' | 'selected'>, quantity = 1) => {
      setItems((current) => {
        const exists = current.find((p) => p.stacklineSku === item.stacklineSku);
        if (exists) {
          return current.map((p) =>
            p.stacklineSku === item.stacklineSku
              ? { ...p, quantity: p.quantity + quantity }
              : p
          );
        }
        return [...current, { ...item, quantity, selected: true }];
      });
    },
    []
  );

  const removeItem = useCallback((stacklineSku: string) => {
    setItems((current) => current.filter((p) => p.stacklineSku !== stacklineSku));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const updateQuantity = useCallback(
    (stacklineSku: string, quantity: number) => {
      if (quantity <= 0) {
        setItems((current) =>
          current.filter((p) => p.stacklineSku !== stacklineSku)
        );
        return;
      }
      setItems((current) =>
        current.map((p) =>
          p.stacklineSku === stacklineSku ? { ...p, quantity } : p
        )
      );
    },
    []
  );

  const setItemSelected = useCallback(
    (stacklineSku: string, selected: boolean) => {
      setItems((current) =>
        current.map((p) =>
          p.stacklineSku === stacklineSku ? { ...p, selected } : p
        )
      );
    },
    []
  );

  const setAllSelected = useCallback((selected: boolean) => {
    setItems((current) => current.map((p) => ({ ...p, selected })));
  }, []);

  const selectedItems = items.filter((item) => item.selected);

  const totalPrice = selectedItems.reduce(
    (sum, item) =>
      sum + (item.retailPrice > 0 ? item.retailPrice * item.quantity : 0),
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        selectedItems,
        totalPrice,
        addItem,
        removeItem,
        clearCart,
        updateQuantity,
        setItemSelected,
        setAllSelected,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// ---------- hook ----------

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used inside <CartProvider>');
  }
  return ctx;
}
