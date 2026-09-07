import type { Metadata } from "next";

import { CarouselLogo } from "@/components/CarouselLogo";
import { CartLink } from "@/components/CartLink";
import { CartProvider } from "@/components/cart";
import { OPENING_HOURS_LABEL, SHOP_ADDRESS } from "@/lib/pickup";

import "./globals.css";

export const metadata: Metadata = {
  title: "Carousel Oslo — Bouquets for pickup",
  description:
    "Order one of three bouquets from Carousel in Grünersgate and pick it up in the shop.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <CartProvider>
          <div className="shell">
            <header className="site-header">
              <CarouselLogo />
              <nav className="header-meta">
                <span className="muted">{OPENING_HOURS_LABEL}</span>
                <CartLink />
              </nav>
            </header>

            <main className="site-main">{children}</main>

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
              <div>
                <strong>Pickup only</strong>
                All orders are collected in the shop.
                <br />
                No delivery for now.
              </div>
            </footer>
          </div>
        </CartProvider>
      </body>
    </html>
  );
}
