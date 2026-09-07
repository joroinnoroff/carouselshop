"use client";

import Image from "next/image";
import { Toaster, toast } from "sonner";

import type { Bouquet } from "@/lib/products";

export function BasketToaster() {
  return (
    <Toaster
      position="top-right"
      offset={{ top: "4.6rem", right: "var(--gutter)" }}
      mobileOffset={{ top: "4.4rem", right: "1.25rem" }}
      duration={2800}
      visibleToasts={2}
      expand={false}
      toastOptions={{ unstyled: true }}
    />
  );
}

export function toastAddedToBasket(bouquet: Bouquet) {
  toast.custom(
    () => (
      <div className="basket-toast">
        <span className="basket-toast-photo">
          <Image
            src={bouquet.image}
            alt=""
            fill
            sizes="40px"
          />
        </span>
        <span className="basket-toast-text">
          <strong>Added to basket</strong>
          <span>{bouquet.name}</span>
        </span>
      </div>
    ),
    { duration: 2800 },
  );
}
