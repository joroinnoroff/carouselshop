import Link from "next/link";

import { ClearCart } from "@/components/ClearCart";
import { OrderProgress } from "@/components/OrderProgress";
import { getOrder, updateOrder, type Order } from "@/lib/orders";
import { formatNok } from "@/lib/products";
import { SHOP_ADDRESS, pickupReadyAt } from "@/lib/pickup";
import { getStripe } from "@/lib/stripe";
import { getVippsPayment } from "@/lib/vipps";

export const dynamic = "force-dynamic";

/**
 * The customer lands here straight from Stripe or Vipps, which can beat the
 * webhook. So we confirm with the provider once, rather than trusting the
 * redirect on its own.
 */
async function confirmPayment(
  order: Order,
  sessionId?: string,
): Promise<Order> {
  if (order.status === "paid") return order;

  try {
    if (order.provider === "stripe") {
      const id = sessionId ?? order.providerReference;
      if (!id) return order;
      const session = await getStripe().checkout.sessions.retrieve(id);
      if (session.client_reference_id !== order.reference) return order;
      if (session.payment_status === "paid") {
        return (
          (await updateOrder(order.reference, {
            status: "paid",
            paidAt: order.paidAt ?? new Date().toISOString(),
          })) ?? order
        );
      }
      return order;
    }

    if (order.provider === "invoice") return order;

    const payment = await getVippsPayment(order.reference);
    if (payment.state === "AUTHORIZED") {
      return (
        (await updateOrder(order.reference, {
          status: "paid",
          paidAt: order.paidAt ?? new Date().toISOString(),
        })) ?? order
      );
    }
    if (payment.state === "ABORTED" || payment.state === "EXPIRED") {
      return (
        (await updateOrder(order.reference, { status: "cancelled" })) ?? order
      );
    }
    return order;
  } catch (error) {
    // A confirmation failure is not the customer's problem — show the order
    // as pending and let the webhook settle it.
    console.error("Could not confirm payment", error);
    return order;
  }
}

function statusCopy(order: Order): string {
  if (order.provider === "invoice" && order.status === "pending") {
    return "Invoice — see you in the shop";
  }
  if (order.status === "paid") return "Paid — see you in the shop";
  if (order.status === "pending") return "Waiting for payment";
  if (order.status === "cancelled") return "Cancelled";
  return "Payment failed";
}

function paymentCopy(order: Order): string {
  if (order.provider === "invoice") return "Invoice";
  if (order.provider === "stripe") return "Card";
  return "Vipps";
}

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { reference } = await params;
  const { session_id: sessionId } = await searchParams;

  const stored = await getOrder(reference);

  if (!stored) {
    return (
      <div className="confirmation">
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          We cannot find that order
        </h1>
        <p style={{ color: "var(--ink-soft)" }}>
          Order <strong>{reference}</strong> is not in our system. If you were
          charged, send us the reference at hello@carouseloslo.no and we will
          sort it out.
        </p>
        <Link href="/" className="button">
          Back to the shop
        </Link>
      </div>
    );
  }

  const order = await confirmPayment(stored, sessionId);
  const pickupLine =
    order.pickup.kind === "now"
      ? `As soon as possible — ${order.pickup.detail.toLowerCase()}`
      : `${order.pickup.detail}, ${order.pickup.label}`;

  const placedAt = new Date(order.createdAt);
  const readyAt = pickupReadyAt(order.pickup, placedAt);

  return (
    <div className="confirmation">
      {order.status === "paid" || order.provider === "invoice" ? (
        <ClearCart />
      ) : null}

      <span className="status-pill">{statusCopy(order)}</span>

      <h1 className="page-title" style={{ marginBottom: 0 }}>
        {order.status === "paid" || order.provider === "invoice"
          ? `Thank you, ${order.customerName.split(" ")[0]}`
          : "Your order"}
      </h1>

      <p style={{ color: "var(--ink-soft)" }}>
        {order.provider === "invoice"
          ? `We will send the invoice to ${order.customerEmail}. Collect it at ${SHOP_ADDRESS}.`
          : order.status === "paid"
            ? `We are making it up now. Collect it at ${SHOP_ADDRESS}.`
            : "We have not seen the payment yet. This page updates when we do."}
      </p>

      {order.status === "paid" || order.provider === "invoice" ? (
        <OrderProgress
          placedAt={order.createdAt}
          readyAt={readyAt.toISOString()}
          renderedAt={new Date().toISOString()}
          pickupLabel={
            order.pickup.kind === "now"
              ? `Ready at the counter, ${SHOP_ADDRESS}`
              : `${pickupLine} — ${SHOP_ADDRESS}`
          }
        />
      ) : null}

      <dl>
        <dt>Reference</dt>
        <dd>{order.reference}</dd>

        <dt>Pickup</dt>
        <dd>{pickupLine}</dd>

        {order.customerKind === "bedrift" && order.companyName ? (
          <>
            <dt>Company</dt>
            <dd>
              {order.companyName}
              {order.orgNumber ? ` · ${order.orgNumber}` : ""}
            </dd>
          </>
        ) : null}

        <dt>Order</dt>
        <dd>
          {order.lines
            .map((line) => `${line.quantity} × ${line.name}`)
            .join(", ")}
        </dd>

        <dt>Total</dt>
        <dd>
          {formatNok(order.totalOre)} · {paymentCopy(order)}
        </dd>

        {order.message ? (
          <>
            <dt>Message</dt>
            <dd>{order.message}</dd>
          </>
        ) : null}
      </dl>

      <Link href="/" className="button">
        Back to the shop
      </Link>
    </div>
  );
}
