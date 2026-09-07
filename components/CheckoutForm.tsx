"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { LogoSpinner } from "./LogoSpinner";
import { MastercardMark, VippsMark, VisaMark } from "./PaymentMarks";
import { PickupDateField } from "./PickupDateField";
import { useCart } from "./cart";
import { useShopStatus } from "./shop-status";
import { createDemoReference, writeDemoOrder } from "@/lib/demo-order";
import type { ClosedDay } from "@/lib/closed-days";
import type { CustomerKind, PaymentProvider } from "@/lib/orders";
import { findPickupOption } from "@/lib/pickup";
import { formatNok } from "@/lib/products";

const MESSAGE_LIMIT = 500;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STEPS = ["pickup", "kind", "details", "pay"] as const;
type Step = (typeof STEPS)[number];

function detailsReady(name: string, phone: string, email: string) {
  return (
    name.trim().length >= 2 &&
    phone.replace(/\D/g, "").length >= 8 &&
    EMAIL_PATTERN.test(email.trim())
  );
}

function providerLabel(provider: PaymentProvider) {
  if (provider === "invoice") return "Invoice";
  if (provider === "vipps") return "Vipps";
  return "Card";
}

type Props = {
  nowIso: string;
  closedDays: ClosedDay[];
  openingHours: string;
  cancelled: boolean;
  payments: { stripe: boolean; vipps: boolean };
};

export function CheckoutForm({
  nowIso,
  closedDays,
  openingHours,
  cancelled,
  payments,
}: Props) {
  const { lines, totalOre, itemCount, hydrated } = useCart();
  const { hydrated: shopHydrated, shopOpen } = useShopStatus();

  const [step, setStep] = useState<Step>("pickup");
  const [pickupOptionId, setPickupOptionId] = useState("");
  const [provider, setProvider] = useState<PaymentProvider | null>(null);
  const [choosingPayment, setChoosingPayment] = useState(true);
  const [customerKind, setCustomerKind] = useState<CustomerKind | null>(null);
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
  const companyReady =
    customerKind === "privat" ||
    (customerKind === "bedrift" &&
      companyName.trim().length >= 2 &&
      orgNumber.replace(/\D/g, "").length === 9);
  const canContinue =
    step === "pickup"
      ? Boolean(pickupOptionId)
      : step === "kind"
        ? Boolean(customerKind)
        : step === "details"
          ? detailsReady(name, phone, email) && companyReady && Boolean(provider)
          : false;

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
    setChoosingPayment(false);
  }

  function chooseKind(next: CustomerKind) {
    setCustomerKind(next);
    if (next === "bedrift") {
      chooseProvider("invoice");
      return;
    }
    if (provider === "invoice" || !provider) {
      setProvider(null);
      setChoosingPayment(true);
    }
  }

  function goBack() {
    if (step === "kind") setStep("pickup");
    if (step === "details") setStep("kind");
  }

  async function startCheckout() {
    if (!provider || !customerKind) {
      setError("Choose how you would like to pay.");
      setChoosingPayment(true);
      setStep("details");
      return;
    }

    const pickup = findPickupOption(pickupOptionId, new Date());
    if (!pickup) {
      setError("That pickup time is no longer available — please pick another.");
      setStep("pickup");
      return;
    }

    setError(null);
    setSubmitting(true);
    setStep("pay");

    await new Promise((resolve) => window.setTimeout(resolve, 2200));

    const reference = createDemoReference();
    const now = new Date().toISOString();
    writeDemoOrder({
      reference,
      status: provider === "invoice" ? "pending" : "paid",
      provider,
      lines: lines.map((line) => ({
        name: line.bouquet.name,
        quantity: line.quantity,
        unitPriceOre: line.bouquet.priceOre,
      })),
      totalOre,
      pickup,
      customerName: name,
      customerEmail: email,
      customerKind,
      companyName: companyName.trim() || undefined,
      orgNumber: orgNumber.trim() || undefined,
      message,
      createdAt: now,
      paidAt: provider === "invoice" ? undefined : now,
    });

    window.location.href = `/order/${reference}?demo=1`;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canContinue) return;
    if (step === "pickup") setStep("kind");
    else if (step === "kind") setStep("details");
    else if (step === "details") void startCheckout();
  }

  if (step === "pay") {
    return (
      <div className="checkout-pay-step">
        <h1 className="page-title page-title--checkout">Payment</h1>
        <p className="checkout-step-count">Step 4 of {STEPS.length}</p>
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="checkout">
          <div className="payment-stage">
            <LogoSpinner
              label={
                provider === "vipps"
                  ? "Taking you to Vipps"
                  : provider === "invoice"
                    ? "Sending your invoice order"
                    : "Preparing your card payment"
              }
            />
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
            <p className="summary-note">
              {provider === "invoice"
                ? "We send the invoice after you place the order. Collect in the shop."
                : "You pay now and collect in the shop. Nothing is shipped."}
            </p>
          </aside>
        </div>
      </div>
    );
  }

  const stepIndex = STEPS.indexOf(step);

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="page-title page-title--checkout">Checkout</h1>
      <p className="checkout-step-count">
        Step {stepIndex + 1} of {STEPS.length}
      </p>

      <div className="checkout-steps">
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        {step === "pickup" ? (
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
        ) : null}

        {step === "kind" ? (
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
                  <span>Invoice to the company</span>
                </span>
              </label>
            </div>
          </fieldset>
        ) : null}

        {step === "details" ? (
          <>
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

          <fieldset>
            <legend>Payment</legend>
            {provider && !choosingPayment ? (
              <button
                type="button"
                className="pay-chosen"
                aria-expanded={false}
                onClick={() => setChoosingPayment(true)}
              >
                <span className="pay-chosen-text">
                  <strong>{providerLabel(provider)}</strong>
                  <span>click to change</span>
                </span>
                {provider === "stripe" ? (
                  <span className="pay-marks">
                    <VisaMark />
                    <MastercardMark />
                  </span>
                ) : provider === "vipps" ? (
                  <span className="pay-marks">
                    <VippsMark />
                  </span>
                ) : null}
              </button>
            ) : (
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
                    </label>
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
                      {payments.vipps ? null : (
                        <span className="option-badge">
                          Vipps ikke konfigurert enda
                        </span>
                      )}
                    </label>
                  </>
                )}
              </div>
            )}
          </fieldset>
          </>
        ) : null}

        <div className="checkout-actions">
          {step === "pickup" ? (
            <span />
          ) : (
            <button type="button" className="link-button" onClick={goBack}>
              Back
            </button>
          )}
          <button
            type="submit"
            className={canContinue ? "button button--solid" : "button"}
            disabled={!canContinue || submitting}
          >
            Continue
          </button>
        </div>
      </div>
    </form>
  );
}
