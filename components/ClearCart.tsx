"use client";

import { useEffect } from "react";

import { useCart } from "./cart";

/** Empties the basket once the order is confirmed paid. */
export function ClearCart() {
  const { clear, hydrated, itemCount } = useCart();

  useEffect(() => {
    if (hydrated && itemCount > 0) clear();
  }, [hydrated, itemCount, clear]);

  return null;
}
