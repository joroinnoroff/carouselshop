"use client";

import { useShopStatus } from "./shop-status";

const COPY =
  "Online orders are paused. The shop is still in Grünersgate — call or come by if you need something today.";

const REPEATS = 13;

export function ShopPausedBanner() {
  const { hydrated, shopOpen } = useShopStatus();

  if (!hydrated || shopOpen) return null;

  return (
    <div className="shop-paused" role="status">
      <p className="visually-hidden">{COPY}</p>
      <div className="shop-paused-track" aria-hidden>
        <span className="shop-paused-set">
          {Array.from({ length: REPEATS }, (_, index) => (
            <span key={`a-${index}`}>{COPY}</span>
          ))}
        </span>
        <span className="shop-paused-set">
          {Array.from({ length: REPEATS }, (_, index) => (
            <span key={`b-${index}`}>{COPY}</span>
          ))}
        </span>
      </div>
    </div>
  );
}
