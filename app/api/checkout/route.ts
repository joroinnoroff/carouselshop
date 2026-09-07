import { NextResponse } from "next/server";

import { closedKeysOf } from "@/lib/closed-days";
import { listClosedDays } from "@/lib/closed-days-store";
import { CheckoutError, siteUrl, toMsisdn, validateCheckout } from "@/lib/checkout";
import { createReference, saveOrder, updateOrder, type Order } from "@/lib/orders";
import { getStripe } from "@/lib/stripe";
import { createVippsPayment } from "@/lib/vipps";
import { formatNok } from "@/lib/products";

export async function POST(request: Request) {
  let checkout;
  try {
    checkout = validateCheckout(await request.json(), {
      closedKeys: closedKeysOf(await listClosedDays()),
    });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Could not read that order." }, { status: 400 });
  }

  const reference = createReference();
  const order: Order = {
    reference,
    status: "pending",
    provider: checkout.provider,
    lines: checkout.lines,
    totalOre: checkout.totalOre,
    pickup: checkout.pickup,
    customerName: checkout.name,
    customerPhone: checkout.phone,
    customerEmail: checkout.email,
    customerKind: checkout.customerKind,
    companyName: checkout.companyName || undefined,
    orgNumber: checkout.orgNumber || undefined,
    message: checkout.message,
    createdAt: new Date().toISOString(),
  };
  await saveOrder(order);

  const returnUrl = `${siteUrl()}/order/${reference}`;
  const pickupSummary =
    checkout.pickup.kind === "now"
      ? "Pick up now"
      : `Pick up ${checkout.pickup.detail.toLowerCase()} ${checkout.pickup.label}`;

  try {
    if (checkout.provider === "invoice") {
      return NextResponse.json({ reference, redirectUrl: returnUrl });
    }

    if (checkout.provider === "stripe") {
      const session = await getStripe().checkout.sessions.create({
        ui_mode: "embedded_page",
        mode: "payment",
        client_reference_id: reference,
        customer_email: checkout.email,
        line_items: checkout.lines.map((line) => ({
          quantity: line.quantity,
          price_data: {
            currency: "nok",
            unit_amount: line.unitPriceOre,
            product_data: { name: `${line.name} bouquet` },
          },
        })),
        metadata: {
          reference,
          pickup: `${checkout.pickup.detail} ${checkout.pickup.label}`,
          message: checkout.message,
        },
        return_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
        redirect_on_completion: "always",
        branding_settings: {
          background_color: "#fcf7c6",
          button_color: "#000000",
          border_style: "pill",
          display_name: "Carousel Oslo",
          font_family: "pt_sans",
        },
        custom_text: {
          submit: { message: "Pay and collect in the shop" },
        },
      });

      if (!session.client_secret) {
        throw new Error("Stripe did not return a client secret.");
      }
      await updateOrder(reference, { providerReference: session.id });
      return NextResponse.json({
        reference,
        clientSecret: session.client_secret,
      });
    }

    const payment = await createVippsPayment({
      reference,
      amountOre: checkout.totalOre,
      description: `Carousel Oslo — ${pickupSummary} — ${formatNok(checkout.totalOre)}`,
      returnUrl,
      phoneNumber: toMsisdn(checkout.phone),
    });

    await updateOrder(reference, { providerReference: payment.reference });
    return NextResponse.json({ reference, redirectUrl: payment.redirectUrl });
  } catch (error) {
    await updateOrder(reference, { status: "failed" });
    console.error("Checkout failed", error);
    const message =
      error instanceof Error && /not configured|not set/i.test(error.message)
        ? error.message
        : "We could not start the payment. Please try again.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
