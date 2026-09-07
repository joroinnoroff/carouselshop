/**
 * Turns an untrusted checkout payload into a validated order draft.
 * Prices and pickup slots are always re-resolved on the server; nothing the
 * browser sends about money or availability is taken at face value.
 */

import { getBouquet } from "./products";
import { findPickupOption, type PickupOption } from "./pickup";
import type { OrderLine, PaymentProvider } from "./orders";

export type CheckoutPayload = {
  items: { bouquetId: string; quantity: number }[];
  pickupOptionId: string;
  provider: PaymentProvider;
  name: string;
  phone: string;
  email: string;
  message?: string;
};

export type ValidatedCheckout = {
  lines: OrderLine[];
  totalOre: number;
  pickup: PickupOption;
  provider: PaymentProvider;
  name: string;
  phone: string;
  email: string;
  message: string;
};

export class CheckoutError extends Error {}

const MAX_QUANTITY_PER_LINE = 10;
const MAX_MESSAGE_LENGTH = 500;

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function validateCheckout(body: unknown): ValidatedCheckout {
  const payload = (body ?? {}) as Partial<CheckoutPayload>;

  const provider = payload.provider;
  if (provider !== "stripe" && provider !== "vipps") {
    throw new CheckoutError("Choose a payment method.");
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0) {
    throw new CheckoutError("Your basket is empty.");
  }

  const lines: OrderLine[] = [];
  for (const item of payload.items) {
    const bouquet = getBouquet(str(item?.bouquetId));
    if (!bouquet || !bouquet.available) {
      throw new CheckoutError("One of the bouquets is no longer available.");
    }

    const quantity = Math.floor(Number(item?.quantity));
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > MAX_QUANTITY_PER_LINE) {
      throw new CheckoutError(
        `Please order between 1 and ${MAX_QUANTITY_PER_LINE} of each bouquet.`,
      );
    }

    const existing = lines.find((l) => l.bouquetId === bouquet.id);
    if (existing) {
      existing.quantity = Math.min(
        existing.quantity + quantity,
        MAX_QUANTITY_PER_LINE,
      );
      continue;
    }

    lines.push({
      bouquetId: bouquet.id,
      name: bouquet.name,
      unitPriceOre: bouquet.priceOre,
      quantity,
    });
  }

  const pickup = findPickupOption(str(payload.pickupOptionId));
  if (!pickup) {
    throw new CheckoutError(
      "That pickup time is no longer available — please pick another.",
    );
  }

  const name = str(payload.name);
  if (name.length < 2) {
    throw new CheckoutError("Please tell us the name for the order.");
  }

  const phone = str(payload.phone);
  if (phone.replace(/\D/g, "").length < 8) {
    throw new CheckoutError("Please give us a phone number we can reach you on.");
  }

  const email = str(payload.email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new CheckoutError("Please give us a valid email address.");
  }

  const message = str(payload.message).slice(0, MAX_MESSAGE_LENGTH);

  const totalOre = lines.reduce(
    (sum, line) => sum + line.unitPriceOre * line.quantity,
    0,
  );

  return { lines, totalOre, pickup, provider, name, phone, email, message };
}

/** Vipps wants a Norwegian MSISDN without "+" — best effort, undefined if unsure. */
export function toMsisdn(phone: string): string | undefined {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 8) return `47${digits}`;
  if (digits.length === 10 && digits.startsWith("47")) return digits;
  return undefined;
}

export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3210"
  );
}
