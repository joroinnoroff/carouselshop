import Link from "next/link";

import { DemoOrderPage } from "@/components/DemoOrderPage";
import { OrderConfirmation } from "@/components/OrderConfirmation";
import { getOrder, updateOrder, type Order } from "@/lib/orders";
import { getStripe } from "@/lib/stripe";
import { orderFromPaidStripeSession } from "@/lib/stripe-order";
import { getVippsPayment } from "@/lib/vipps";

export const dynamic = "force-dynamic";

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
        const paid = {
          ...order,
          status: "paid" as const,
          paidAt: order.paidAt ?? new Date().toISOString(),
        };
        return (await updateOrder(order.reference, paid)) ?? paid;
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
    console.error("Could not confirm payment", error);
    return order;
  }
}

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ session_id?: string; demo?: string }>;
}) {
  const { reference } = await params;
  const { session_id: sessionId, demo } = await searchParams;

  if (demo === "1") {
    return <DemoOrderPage reference={reference} />;
  }

  const stored =
    (await getOrder(reference)) ??
    (sessionId
      ? await orderFromPaidStripeSession(sessionId, reference)
      : undefined);

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

  return <OrderConfirmation order={order} />;
}
