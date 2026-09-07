import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getOrder, updateOrder } from "@/lib/orders";
import { getStripe } from "@/lib/stripe";

/**
 * Stripe needs the raw body to verify the signature, so this route reads text
 * rather than JSON.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET is not set." },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      await request.text(),
      signature,
      secret,
    );
  } catch (error) {
    console.error("Stripe webhook signature check failed", error);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const reference = session.client_reference_id ?? session.metadata?.reference;
      if (reference && (await getOrder(reference))) {
        await updateOrder(reference, {
          status: session.payment_status === "paid" ? "paid" : "pending",
          providerReference: session.id,
          paidAt:
            session.payment_status === "paid"
              ? new Date(session.created * 1000).toISOString()
              : undefined,
        });
      }
      break;
    }
    case "checkout.session.expired": {
      const reference =
        event.data.object.client_reference_id ??
        event.data.object.metadata?.reference;
      if (reference) await updateOrder(reference, { status: "cancelled" });
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
