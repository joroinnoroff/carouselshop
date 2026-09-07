"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { useCart } from "./cart";
import { formatNok } from "@/lib/products";
import type { PickupOption } from "@/lib/pickup";
import type { PaymentProvider } from "@/lib/orders";

const MESSAGE_LIMIT = 500;

type Props = {
  pickupOptions: PickupOption[];
  openingHours: string;
  cancelled: boolean;
  payments: { stripe: boolean; vipps: boolean };
};

export function CheckoutForm({
  pickupOptions,
  openingHours,
  cancelled,
  payments,
}: Props) {
  const { lines, totalOre, itemCount, hydrated, setQuantity } = useCart();

  const [pickupOptionId, setPickupOptionId] = useState(
    pickupOptions[0]?.id ?? "",
  );
  const [provider, setProvider] = useState<PaymentProvider>("stripe");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(
    cancelled ? "Payment was cancelled — your basket is still here." : null,
  );
  const [submitting, setSubmitting] = useState(false);

  if (hydrated && itemCount === 0) {
    return (
      <div className="empty-state">
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          Your basket is empty
        </h1>
        <p style={{ color: "var(--ink-soft)" }}>
          Pick one of today&apos;s three bouquets and choose a time to collect it.
        </p>
        <Link href="/" className="button">
          See the bouquets
        </Link>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    setSubmitting(true);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((line) => ({
            bouquetId: line.bouquet.id,
            quantity: line.quantity,
          })),
          pickupOptionId,
          provider,
          name: form.get("name"),
          phone: form.get("phone"),
          email: form.get("email"),
          message: form.get("message"),
        }),
      });

      const body = (await response.json()) as {
        redirectUrl?: string;
        error?: string;
      };

      if (!response.ok || !body.redirectUrl) {
        setError(body.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      window.location.href = body.redirectUrl;
    } catch {
      setError("We could not reach the payment provider. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="page-title page-title--checkout">Checkout</h1>

      <div className="checkout">
        <div>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}

          <fieldset>
            <legend>When would you like to collect it?</legend>
            <div className="option-list">
              {pickupOptions.map((option) => (
                <label className="option" key={option.id}>
                  <input
                    type="radio"
                    name="pickupOptionId"
                    value={option.id}
                    checked={pickupOptionId === option.id}
                    onChange={() => setPickupOptionId(option.id)}
                  />
                  <span className="option-text">
                    <strong>{option.label}</strong>
                    <span>{option.detail}</span>
                  </span>
                  {option.kind === "now" ? (
                    <span className="option-badge">Open now</span>
                  ) : null}
                </label>
              ))}
            </div>
            <p className="field-hint">
              Collection at Grünersgate 14A. We are open {openingHours}.
            </p>
          </fieldset>

          <fieldset>
            <legend>Who is collecting?</legend>
            <div className="field-row">
              <label className="field">
                <span>Name</span>
                <input name="name" required autoComplete="name" minLength={2} />
              </label>
              <label className="field">
                <span>Phone</span>
                <input
                  name="phone"
                  required
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="472 42 457"
                />
              </label>
            </div>
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" required autoComplete="email" />
            </label>
            <label className="field">
              <span>Message (optional)</span>
              <textarea
                name="message"
                maxLength={MESSAGE_LIMIT}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="A greeting for the card, colours you love or want us to avoid, anything else we should know."
              />
              <span className="field-hint">
                {message.length}/{MESSAGE_LIMIT}
              </span>
            </label>
          </fieldset>

          <fieldset style={{ marginBottom: 0 }}>
            <legend>Payment</legend>
            <div className="option-list">
              <label className="option">
                <input
                  type="radio"
                  name="provider"
                  value="stripe"
                  checked={provider === "stripe"}
                  onChange={() => setProvider("stripe")}
                />
                <span className="option-text">
                  <strong>Card</strong>
                  <span>Visa, Mastercard and Apple Pay via Stripe</span>
                </span>
                {payments.stripe ? null : (
                  <span className="option-badge">Keys missing</span>
                )}
              </label>
              <label className="option">
                <input
                  type="radio"
                  name="provider"
                  value="vipps"
                  checked={provider === "vipps"}
                  onChange={() => setProvider("vipps")}
                />
                <span className="option-text">
                  <strong>Vipps</strong>
                  <span>Confirm the payment in the Vipps app</span>
                </span>
                {payments.vipps ? null : (
                  <span className="option-badge">Keys missing</span>
                )}
              </label>
            </div>
          </fieldset>
        </div>

        <aside className="summary">
          <h2>Your order</h2>

          {lines.map((line) => (
            <div className="summary-line" key={line.bouquet.id}>
              <span className="summary-thumb">
                <Image
                  src={line.bouquet.image}
                  alt={line.bouquet.imageAlt}
                  fill
                  sizes="72px"
                />
              </span>

              <span className="summary-line-text">
                <strong>{line.bouquet.name}</strong>
                <span className="qty">
                  {line.quantity} × {formatNok(line.bouquet.priceOre)}
                </span>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => setQuantity(line.bouquet.id, 0)}
                >
                  Remove
                </button>
              </span>

              <span className="summary-line-price">
                {formatNok(line.bouquet.priceOre * line.quantity)}
              </span>
            </div>
          ))}

          <div className="summary-total">
            <span>Total</span>
            <span>{formatNok(totalOre)}</span>
          </div>

          <button
            type="submit"
            className="button button--solid"
            style={{ width: "100%", marginTop: "1.5rem" }}
            disabled={submitting || !pickupOptionId}
          >
            {submitting ? "Taking you to payment…" : `Pay ${formatNok(totalOre)}`}
          </button>

          <p className="summary-note">
            You pay now and collect in the shop. Nothing is shipped.
          </p>
        </aside>
      </div>
    </form>
  );
}
