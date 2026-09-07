import type { Metadata } from "next";
import { preload } from "react-dom";

import { BasketToaster } from "@/components/BasketToaster";
import { CarouselLogo } from "@/components/CarouselLogo";
import { CartLink } from "@/components/CartLink";
import { CartProvider } from "@/components/cart";
import { ShopPausedBanner } from "@/components/ShopPausedBanner";
import { ShopStatusProvider } from "@/components/shop-status";
import { SiteFooter } from "@/components/SiteFooter";
import { OPENING_HOURS_LABEL } from "@/lib/pickup";

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
  preload("/logo3d/000.webp", { as: "image" });

  return (
    <html lang="en">
      <body>
        <CartProvider>
          <ShopStatusProvider>
            <div className="shell">
              <header className="site-header">
                <CarouselLogo />
                <nav className="header-meta">
                  <span className="muted">{OPENING_HOURS_LABEL}</span>
                  <CartLink />
                </nav>
              </header>
              <BasketToaster />

              <ShopPausedBanner />

              <main className="site-main">{children}</main>

              <SiteFooter />
            </div>
          </ShopStatusProvider>
        </CartProvider>
      </body>
    </html>
  );
}
