"use client";

import { usePathname } from "next/navigation";

import { OPENING_HOURS_LABEL, SHOP_ADDRESS } from "@/lib/pickup";

export function SiteFooter() {
  const pathname = usePathname();
  const onCheckout = pathname.startsWith("/checkout");

  return (
    <footer className="site-footer">
      <div>
        <strong>Shop</strong>
        {SHOP_ADDRESS}
        <br />
        {OPENING_HOURS_LABEL}
      </div>
      <div>
        <strong>Contact</strong>
        <a href="mailto:hello@carouseloslo.no">hello@carouseloslo.no</a>
        <br />
        <a href="tel:+4747242457">472 42 457</a>
      </div>
      {onCheckout ? null : (
        <div>
          <strong>Pickup only</strong>
          All orders are collected in the shop.
          <br />
          No delivery for now.
        </div>
      )}
    </footer>
  );
}
