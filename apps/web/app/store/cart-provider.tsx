"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type CartItem = {
  productId: string;
  storeSlug: string;
  name: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
};

type CartContextType = {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">) => void;
  removeFromCart: (productId: string, storeSlug: string) => void;
  updateQuantity: (
    productId: string,
    storeSlug: string,
    quantity: number
  ) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Load saved cart from the browser
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("business-platform-cart");

      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);

        if (Array.isArray(parsedCart)) {
          setItems(parsedCart);
        }
      }
    } catch {
      console.error("Unable to load saved cart.");
    }

    setHydrated(true);
  }, []);

  // Save cart whenever it changes
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem("business-platform-cart", JSON.stringify(items));
    }
  }, [items, hydrated]);

  const addToCart = (item: Omit<CartItem, "quantity">) => {
    setItems((currentItems) => {
      const existingItem = currentItems.find(
        (cartItem) =>
          cartItem.productId === item.productId &&
          cartItem.storeSlug === item.storeSlug
      );

      if (existingItem) {
        return currentItems.map((cartItem) =>
          cartItem.productId === item.productId &&
          cartItem.storeSlug === item.storeSlug
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }

      return [...currentItems, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string, storeSlug: string) => {
    setItems((currentItems) =>
      currentItems.filter(
        (item) =>
          item.productId !== productId ||
          item.storeSlug !== storeSlug
      )
    );
  };

  const updateQuantity = (
    productId: string,
    storeSlug: string,
    quantity: number
  ) => {
    if (!Number.isInteger(quantity) || quantity < 1) return;

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.productId === productId && item.storeSlug === storeSlug
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => setItems([]);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider.");
  }

  return context;
}
