"use client";

import { useEffect, useRef } from "react";
import type { StripeEmbeddedCheckout } from "@stripe/stripe-js";

type StripeEmbedProps = {
  clientSecret: string;
  publishableKey: string;
  onReady?: () => void;
};

export function StripeEmbed({
  clientSecret,
  publishableKey,
  onReady,
}: StripeEmbedProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let checkout: StripeEmbeddedCheckout | null = null;

    void import("@stripe/stripe-js").then(async ({ loadStripe }) => {
      const stripe = await loadStripe(publishableKey);
      if (!stripe || cancelled || !hostRef.current) return;

      checkout = await stripe.createEmbeddedCheckoutPage({ clientSecret });
      if (cancelled) {
        checkout.destroy();
        return;
      }
      checkout.mount(hostRef.current);
      if (!cancelled) onReadyRef.current?.();
    });

    return () => {
      cancelled = true;
      checkout?.destroy();
    };
  }, [clientSecret, publishableKey]);

  return <div ref={hostRef} className="stripe-embed" />;
}
