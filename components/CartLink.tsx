"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useCart } from "./cart";

export function CartLink() {
  const pathname = usePathname();
  const { itemCount, hydrated } = useCart();

  if (pathname.startsWith("/checkout")) return null;

  return (
    <Link href="/checkout" className="cart-link">
      Basket
      {hydrated && itemCount > 0 ? (
        <span className="cart-count">{itemCount}</span>
      ) : null}
    </Link>
  );
}
