import Image from "next/image";

import { AddToBasket } from "@/components/AddToBasket";
import { BOUQUETS, formatNok } from "@/lib/products";
import { OPENING_HOURS_LABEL, SHOP_ADDRESS, isOpenNow } from "@/lib/pickup";

// Pickup availability depends on the clock, so never cache this page.
export const dynamic = "force-dynamic";

export default function HomePage() {
  const open = isOpenNow();

  return (
    <>
      {/* Spread to the corners, the way the shop's own site and our footer
          set their information. */}
      <section className="hero">
        <p className="hero-lede">
          Order here, choose when you want it, and collect it in{" "}
          {SHOP_ADDRESS.split(",")[0]}.
        </p>

        <div className="hero-meta">
          <strong>{open ? "Open now" : "Closed right now"}</strong>
          {OPENING_HOURS_LABEL}
        </div>
      </section>

      <section>
        <div className="section-label">
          <span>Today&apos;s bouquets</span>
          <span>Pickup only</span>
        </div>

        <div className="bouquet-grid">
          {BOUQUETS.map((bouquet) => (
            <article key={bouquet.id} className="bouquet">
              <div className="bouquet-photo">
                <Image
                  src={bouquet.image}
                  alt={bouquet.imageAlt}
                  fill
                  sizes="(max-width: 720px) 100vw, 25vw"
                  /* The whole catalogue is four cards — none of it is
                     below the fold worth lazy-loading. */
                  priority
                />
              </div>
              <div className="bouquet-head">
                <h3>{bouquet.name}</h3>
                <span className="bouquet-price">{formatNok(bouquet.priceOre)}</span>
              </div>
              <p className="bouquet-tagline">{bouquet.tagline}</p>
              <p className="bouquet-description">{bouquet.description}</p>
              <AddToBasket bouquet={bouquet} />
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
