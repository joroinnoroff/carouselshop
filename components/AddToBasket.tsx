"use client";

import { useCart } from "./cart";
import type { Bouquet } from "@/lib/products";

export function AddToBasket({ bouquet }: { bouquet: Bouquet }) {
  const { quantityOf, add, setQuantity } = useCart();
  const quantity = quantityOf(bouquet.id);

  if (!bouquet.available) {
    return (
      <div className="bouquet-actions">
        <span className="bouquet-tagline" style={{ marginTop: 0 }}>
          Sold out today
        </span>
      </div>
    );
  }

  if (quantity === 0) {
    return (
      <div className="bouquet-actions">
        <button type="button" className="button" onClick={() => add(bouquet.id)}>
          Add to basket
        </button>
      </div>
    );
  }

  return (
    <div className="bouquet-actions">
      <div className="quantity">
        <button
          type="button"
          onClick={() => setQuantity(bouquet.id, quantity - 1)}
          aria-label={`Remove one ${bouquet.name}`}
        >
          –
        </button>
        <span aria-live="polite">{quantity}</span>
        <button
          type="button"
          onClick={() => setQuantity(bouquet.id, quantity + 1)}
          disabled={quantity >= 10}
          aria-label={`Add another ${bouquet.name}`}
        >
          +
        </button>
      </div>
      <a href="/checkout" className="button button--ghost">
        Checkout
      </a>
    </div>
  );
}
