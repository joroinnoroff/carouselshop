"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "carousel-shop-open";

type ShopStatusValue = {
  hydrated: boolean;
  shopOpen: boolean;
  setShopOpen: (open: boolean) => void;
};

const ShopStatusContext = createContext<ShopStatusValue | null>(null);

export function ShopStatusProvider({ children }: { children: ReactNode }) {
  const [shopOpen, setShopOpenState] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "0") {
        setShopOpenState(false);
      }
    } catch {
      // Private mode still gets an in-memory toggle.
    }
    setHydrated(true);
  }, []);

  const setShopOpen = useCallback((open: boolean) => {
    setShopOpenState(open);
    try {
      window.localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
    } catch {
      // Same as the cart — the toggle still works for this visit.
    }
  }, []);

  const value = useMemo(
    () => ({ hydrated, shopOpen, setShopOpen }),
    [hydrated, shopOpen, setShopOpen],
  );

  return (
    <ShopStatusContext.Provider value={value}>
      {children}
    </ShopStatusContext.Provider>
  );
}

export function useShopStatus() {
  const value = useContext(ShopStatusContext);
  if (!value) {
    throw new Error("useShopStatus must be used inside ShopStatusProvider");
  }
  return value;
}
