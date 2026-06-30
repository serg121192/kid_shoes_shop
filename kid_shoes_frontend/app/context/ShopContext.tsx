"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import api from "@/app/lib/api";
import { useAuth } from "@/app/context/AuthContext";
import { Cart, Wishlist } from "@/app/types";

export interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

const ORDERS_BADGE_KEY = "shop_orders_badge";

function scheduleIdle(task: () => void, timeoutMs = 2500) {
  if (typeof window !== "undefined" && "requestIdleCallback" in window) {
    const id = window.requestIdleCallback(task, { timeout: timeoutMs });
    return () => window.cancelIdleCallback(id);
  }
  const timer = setTimeout(task, 300);
  return () => clearTimeout(timer);
}

interface ShopContextType {
  cartCount: number;
  wishlistCount: number;
  wishlistProductIds: Set<number>;
  ordersBadgeCount: number;
  toasts: Toast[];
  showToast: (message: string, type?: "success" | "error") => void;
  setCartCount: React.Dispatch<React.SetStateAction<number>>;
  setWishlistCount: React.Dispatch<React.SetStateAction<number>>;
  setWishlistProductIds: React.Dispatch<React.SetStateAction<Set<number>>>;
  setOrdersBadgeCount: React.Dispatch<React.SetStateAction<number>>;
  markOrdersSeen: () => void;
  refreshCounts: () => Promise<void>;
}

const ShopContext = createContext<ShopContextType | null>(null);

let toastIdCounter = 0;

export function ShopProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [wishlistProductIds, setWishlistProductIds] = useState<Set<number>>(new Set());
  const [ordersBadgeCount, setOrdersBadgeCountState] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const setOrdersBadgeCount = useCallback((value: React.SetStateAction<number>) => {
    setOrdersBadgeCountState((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      if (typeof window !== "undefined") {
        if (next <= 0) sessionStorage.removeItem(ORDERS_BADGE_KEY);
        else sessionStorage.setItem(ORDERS_BADGE_KEY, String(next));
      }
      return next;
    });
  }, []);

  const markOrdersSeen = useCallback(() => {
    setOrdersBadgeCount(0);
  }, [setOrdersBadgeCount]);

  useEffect(() => {
    if (!isAuthenticated) {
      setOrdersBadgeCountState(0);
      setWishlistProductIds(new Set());
      if (typeof window !== "undefined") sessionStorage.removeItem(ORDERS_BADGE_KEY);
      return;
    }
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem(ORDERS_BADGE_KEY);
      if (stored) setOrdersBadgeCountState(Number(stored));
    }
  }, [isAuthenticated]);

  const refreshCounts = useCallback(async () => {
    if (!isAuthenticated) {
      setCartCount(0);
      setWishlistCount(0);
      setWishlistProductIds(new Set());
      return;
    }
    try {
      const [cartRes, wishRes] = await Promise.allSettled([
        api.get<{ results: Cart[] } | Cart[]>("/shop/cart/"),
        api.get<{ results: Wishlist[] } | Wishlist[]>("/shop/wishlist/"),
      ]);

      if (cartRes.status === "fulfilled") {
        const data = cartRes.value.data;
        const carts = Array.isArray(data) ? data : data.results;
        const cart = carts[0];
        const total = cart
          ? cart.cart_items.reduce((sum, item) => sum + item.quantity, 0)
          : 0;
        setCartCount(total);
      }

      if (wishRes.status === "fulfilled") {
        const data = wishRes.value.data;
        const wishlists = Array.isArray(data) ? data : data.results;
        const ids = new Set(wishlists[0]?.products.map((p) => p.id) ?? []);
        setWishlistProductIds(ids);
        setWishlistCount(ids.size);
      }
    } catch {
      // silent
    }
  }, [isAuthenticated]);

  useEffect(() => {
    return scheduleIdle(() => {
      void refreshCounts();
    });
  }, [refreshCounts]);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type }]);

    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      timersRef.current.delete(id);
    }, 3500);

    timersRef.current.set(id, timer);
  }, []);

  return (
    <ShopContext.Provider
      value={{
        cartCount,
        wishlistCount,
        wishlistProductIds,
        ordersBadgeCount,
        toasts,
        showToast,
        setCartCount,
        setWishlistCount,
        setWishlistProductIds,
        setOrdersBadgeCount,
        markOrdersSeen,
        refreshCounts,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error("useShop must be used within ShopProvider");
  return ctx;
}
