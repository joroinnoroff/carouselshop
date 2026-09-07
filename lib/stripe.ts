import Stripe from "stripe";

let client: Stripe | null = null;

/**
 * Stripe is created lazily so the shop still builds and browses without keys —
 * only the checkout route needs them.
 */
export function getStripe(): Stripe {
  if (client) return client;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set — add it to .env to take card payments.",
    );
  }

  client = new Stripe(key);
  return client;
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
