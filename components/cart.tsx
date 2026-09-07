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

import { BOUQUETS, getBouquet, type Bouquet } from "@/lib/products";

const STORAGE_KEY = "carousel-cart";
const MAX_PER_BOUQUET = 10;

type CartState = Record<string, number>;

export type CartLine = { bouquet: Bouquet; quantity: number };

type CartContextValue = {
  /** False until localStorage has been read, so we never render a stale count. */
  hydrated: boolean;
  lines: CartLine[];
  itemCount: number;
  totalOre: number;
  quantityOf: (bouquetId: string) => number;
  add: (bouquetId: string, quantity?: number) => void;
  setQuantity: (bouquetId: string, quantity: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function readStored(): CartState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};

    const state: CartState = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      const quantity = Math.floor(Number(value));
      // Drop anything that is no longer in the catalogue.
      if (getBouquet(id) && quantity > 0) {
        state[id] = Math.min(quantity, MAX_PER_BOUQUET);
      }
    }
    return state;
  } catch {
    return {};
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CartState>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(readStored());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // A private window with storage blocked still gets a working cart,
      // it just will not survive a reload.
    }
  }, [state, hydrated]);

  const setQuantity = useCallback((bouquetId: string, quantity: number) => {
    setState((current) => {
      const next = { ...current };
      const clamped = Math.max(0, Math.min(Math.floor(quantity), MAX_PER_BOUQUET));
      if (clamped === 0) delete next[bouquetId];
      else next[bouquetId] = clamped;
      return next;
    });
  }, []);

  const add = useCallback((bouquetId: string, quantity = 1) => {
    setState((current) => ({
      ...current,
      [bouquetId]: Math.min(
        (current[bouquetId] ?? 0) + quantity,
        MAX_PER_BOUQUET,
      ),
    }));
  }, []);

  const clear = useCallback(() => setState({}), []);

  const value = useMemo<CartContextValue>(() => {
    // Iterate the catalogue rather than the cart so ordering stays stable.
    const lines = BOUQUETS.flatMap((bouquet) => {
      const quantity = state[bouquet.id] ?? 0;
      return quantity > 0 ? [{ bouquet, quantity }] : [];
    });

    return {
      hydrated,
      lines,
      itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
      totalOre: lines.reduce(
        (sum, line) => sum + line.bouquet.priceOre * line.quantity,
        0,
      ),
      quantityOf: (bouquetId: string) => state[bouquetId] ?? 0,
      add,
      setQuantity,
      clear,
    };
  }, [state, hydrated, add, setQuantity, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside a CartProvider");
  return context;
}
