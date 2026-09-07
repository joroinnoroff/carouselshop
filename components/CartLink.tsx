"use client";

import Link from "next/link";

import { useCart } from "./cart";

export function CartLink() {
  const { itemCount, hydrated } = useCart();

  return (
    <Link href="/checkout" className="cart-link">
      Basket
      {hydrated && itemCount > 0 ? (
        <span className="cart-count">{itemCount}</span>
      ) : null}
    </Link>
  );
}
