"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { LogoSpinner } from "./LogoSpinner";
import { MastercardMark, VippsMark, VisaMark } from "./PaymentMarks";
import { PickupDateField } from "./PickupDateField";
import { StripeEmbed } from "./StripeEmbed";
import { useCart } from "./cart";
import { useShopStatus } from "./shop-status";
import { formatNok } from "@/lib/products";
import type { ClosedDay } from "@/lib/closed-days";
import { closedKeysOf } from "@/lib/closed-days";
import { firstOpenDay, slotsOnDay } from "@/lib/pickup";
import type { CustomerKind, PaymentProvider } from "@/lib/orders";

const MESSAGE_LIMIT = 500;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function detailsReady(name: string, phone: string, email: string) {
  return (
    name.trim().length >= 2 &&
    phone.replace(/\D/g, "").length >= 8 &&
    EMAIL_PATTERN.test(email.trim())
  );
}

function PayNowButton({
  submitting,
  provider,
  disabled,
  totalOre,
}: {
  submitting: boolean;
  provider: PaymentProvider;
  disabled: boolean;
  totalOre: number;
}) {
  return (
    <>
      <button
        type="submit"
        className="button button--solid checkout-pay-button"
        disabled={disabled}
      >
        {submitting
          ? provider === "stripe"
            ? "Opening card payment…"
            : provider === "invoice"
              ? "Sending your invoice order…"
              : "Taking you to Vipps…"
          : provider === "invoice"
            ? `Order ${formatNok(totalOre)} · invoice`
            : `Pay ${formatNok(totalOre)}`}
      </button>
      <p className="summary-note">
        {provider === "invoice"
          ? "We send the invoice after you place the order. Collect in the shop."
          : "You pay now and collect in the shop. Nothing is shipped."}
      </p>
    </>
  );
}

type Props = {
  nowIso: string;
  closedDays: ClosedDay[];
  openingHours: string;
  cancelled: boolean;
  payments: { stripe: boolean; vipps: boolean };
  stripePublishableKey: string;
};

export function CheckoutForm({
  nowIso,
  closedDays,
  openingHours,
  cancelled,
  payments,
  stripePublishableKey,
}: Props) {
  const { lines, totalOre, itemCount, hydrated, setQuantity } = useCart();
  const { hydrated: shopHydrated, shopOpen } = useShopStatus();

  const [pickupOptionId, setPickupOptionId] = useState(() => {
    const now = new Date(nowIso);
    const closedKeys = closedKeysOf(closedDays);
    const first = firstOpenDay(now, closedKeys);
    return first ? (slotsOnDay(first.key, now, closedKeys)[0]?.id ?? "") : "";
  });
  const [provider, setProvider] = useState<PaymentProvider>("stripe");
  const [customerKind, setCustomerKind] = useState<CustomerKind>("privat");
  const [companyName, setCompanyName] = useState("");
  const [orgNumber, setOrgNumber] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(
    cancelled ? "Payment was cancelled — your basket is still here." : null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(
    null,
  );
  const [embedReady, setEmbedReady] = useState(false);
  const [showingPayment, setShowingPayment] = useState(false);
  const companyReady =
    customerKind === "privat" ||
    (companyName.trim().length >= 2 &&
      orgNumber.replace(/\D/g, "").length === 9);
  const canPay =
    Boolean(pickupOptionId) &&
    detailsReady(name, phone, email) &&
    companyReady;

  if (shopHydrated && !shopOpen) {
    return (
      <div className="empty-state">
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          Online orders are paused
        </h1>
        <p style={{ color: "var(--ink-soft)" }}>
          The shop is still open in Grünersgate. Come by or call if you need a
          bouquet today.
        </p>
        <Link href="/" className="button">
          Back to the shop
        </Link>
      </div>
    );
  }

  if (hydrated && itemCount === 0) {
    return (
      <div className="empty-state">
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          Your basket is empty
        </h1>
        <p style={{ color: "var(--ink-soft)" }}>
          Pick a bouquet and choose a time to collect it.
        </p>
        <Link href="/" className="button">
          See the bouquets
        </Link>
      </div>
    );
  }

  function chooseProvider(next: PaymentProvider) {
    setProvider(next);
    setStripeClientSecret(null);
    setEmbedReady(false);
    setShowingPayment(false);
  }

  function chooseKind(next: CustomerKind) {
    setCustomerKind(next);
    if (next === "bedrift") {
      chooseProvider("invoice");
      return;
    }
    if (provider === "invoice") chooseProvider("stripe");
  }

  function leavePayment() {
    setStripeClientSecret(null);
    setEmbedReady(false);
    setShowingPayment(false);
    setSubmitting(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setShowingPayment(true);
    if (provider === "stripe") {
      setEmbedReady(false);
    }

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
          customerKind,
          companyName,
          orgNumber,
          name: form.get("name"),
          phone: form.get("phone"),
          email: form.get("email"),
          message: form.get("message"),
        }),
      });

      const body = (await response.json()) as {
        redirectUrl?: string;
        clientSecret?: string;
        error?: string;
      };

      if (!response.ok) {
        setError(body.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        setShowingPayment(false);
        return;
      }

      if (provider === "stripe") {
        if (!body.clientSecret) {
          setError("Stripe did not start the card form. Please try again.");
          setSubmitting(false);
          setShowingPayment(false);
          return;
        }
        setStripeClientSecret(body.clientSecret);
        setSubmitting(false);
        return;
      }

      if (!body.redirectUrl) {
        setError(body.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        setShowingPayment(false);
        return;
      }

      window.location.href = body.redirectUrl;
    } catch {
      setError("We could not reach the payment provider. Please try again.");
      setSubmitting(false);
      setShowingPayment(false);
    }
  }

  return (
    <>
      {showingPayment ? (
        <div className="payment-only">
          <h1 className="page-title page-title--checkout">Payment</h1>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <p className="field-hint">{formatNok(totalOre)} · collect in the shop</p>
          {provider === "stripe" ? (
            <button type="button" className="link-button" onClick={leavePayment}>
              Change order details
            </button>
          ) : null}
          <div className="payment-stage">
            {provider === "stripe" && embedReady ? null : (
              <LogoSpinner
                label={
                  provider === "vipps"
                    ? "Taking you to Vipps"
                    : provider === "invoice"
                      ? "Sending your invoice order"
                      : "Preparing your card payment"
                }
              />
            )}
            {stripeClientSecret ? (
              <div
                className={
                  embedReady
                    ? "stripe-embed-wrap"
                    : "stripe-embed-wrap is-pending"
                }
              >
                <StripeEmbed
                  clientSecret={stripeClientSecret}
                  publishableKey={stripePublishableKey}
                  onReady={() => setEmbedReady(true)}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        hidden={showingPayment}
        aria-hidden={showingPayment}
        inert={showingPayment}
      >
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
            <PickupDateField
              nowIso={nowIso}
              closedDays={closedDays}
              openingHours={openingHours}
              value={pickupOptionId}
              onChange={setPickupOptionId}
            />
          </fieldset>

          <fieldset>
            <legend>Privat or bedrift?</legend>
            <div className="option-list">
              <label className="option">
                <input
                  type="radio"
                  name="customerKind"
                  value="privat"
                  checked={customerKind === "privat"}
                  onChange={() => chooseKind("privat")}
                />
                <span className="option-text">
                  <strong>Privat</strong>
                  <span>Pay now with card or Vipps</span>
                </span>
              </label>
              <label className="option">
                <input
                  type="radio"
                  name="customerKind"
                  value="bedrift"
                  checked={customerKind === "bedrift"}
                  onChange={() => chooseKind("bedrift")}
                />
                <span className="option-text">
                  <strong>Bedrift</strong>
                  <span>Invoice to the company — no card needed</span>
                </span>
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>Who is collecting?</legend>
            <div className="field-row">
              <label className="field">
                <span>Name</span>
                <input
                  name="name"
                  required
                  autoComplete="name"
                  minLength={2}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label className="field">
                <span>Phone</span>
                <input
                  name="phone"
                  required
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="472 42 457"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </label>
            </div>
            <label className="field">
              <span>Email</span>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            {customerKind === "bedrift" ? (
              <div className="field-row">
                <label className="field">
                  <span>Company</span>
                  <input
                    name="companyName"
                    required
                    autoComplete="organization"
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Org.nr</span>
                  <input
                    name="orgNumber"
                    required
                    inputMode="numeric"
                    placeholder="912 345 678"
                    value={orgNumber}
                    onChange={(event) => setOrgNumber(event.target.value)}
                  />
                </label>
              </div>
            ) : null}
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
              {customerKind === "bedrift" ? (
                <label className="option">
                  <input
                    type="radio"
                    name="provider"
                    value="invoice"
                    checked={provider === "invoice"}
                    onChange={() => chooseProvider("invoice")}
                  />
                  <span className="option-text">
                    <strong>Invoice</strong>
                    <span>We bill the company. No card or Vipps</span>
                  </span>
                </label>
              ) : (
                <>
                  <label className="option">
                    <input
                      type="radio"
                      name="provider"
                      value="stripe"
                      checked={provider === "stripe"}
                      onChange={() => chooseProvider("stripe")}
                    />
                    <span className="option-text">
                      <strong>Card</strong>
                      <span>Visa, Mastercard and Apple Pay</span>
                    </span>
                    <span className="pay-marks">
                      <VisaMark />
                      <MastercardMark />
                    </span>
                    {payments.stripe ? null : (
                      <span className="option-badge"></span>
                    )}
                  </label>
                  {payments.vipps ? null : (
                      <span className="option-badge">Vipps ikke konfigurert enda</span>
                    )}
                  <label className="option">
               
                    <input
                      type="radio"
                      name="provider"
                      value="vipps"
                      checked={provider === "vipps"}
                      onChange={() => chooseProvider("vipps")}
                    />
                    <span className="option-text">
                      <strong>Vipps</strong>
                      <span>Confirm the payment in the Vipps app</span>
                    </span>
                    <span className="pay-marks">
                      <VippsMark />
                    </span>
               
                  </label>
                </>
              )}
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

          <div className="summary-pay">
            <PayNowButton
              submitting={submitting}
              provider={provider}
              disabled={submitting || !canPay}
              totalOre={totalOre}
            />
          </div>
        </aside>

        <div className="checkout-pay">
          <PayNowButton
            submitting={submitting}
            provider={provider}
            disabled={submitting || !canPay}
            totalOre={totalOre}
          />
        </div>
      </div>
    </form>
    </>
  );
}
