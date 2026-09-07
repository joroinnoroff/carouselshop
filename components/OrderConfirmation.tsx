import Link from "next/link";

import { ClearCart } from "./ClearCart";
import { OrderProgress } from "./OrderProgress";
import type { DemoOrder } from "@/lib/demo-order";
import { SHOP_ADDRESS, pickupReadyAt } from "@/lib/pickup";
import { formatNok } from "@/lib/products";

function statusCopy(order: DemoOrder): string {
  if (order.provider === "invoice" && order.status === "pending") {
    return "Invoice — see you in the shop";
  }
  if (order.status === "paid") return "Paid — see you in the shop";
  return "Waiting for payment";
}

function paymentCopy(order: DemoOrder): string {
  if (order.provider === "invoice") return "Invoice";
  if (order.provider === "stripe") return "Card";
  return "Vipps";
}

export function OrderConfirmation({ order }: { order: DemoOrder }) {
  const pickupLine =
    order.pickup.kind === "now"
      ? `As soon as possible — ${order.pickup.detail.toLowerCase()}`
      : `${order.pickup.detail}, ${order.pickup.label}`;
  const readyAt = pickupReadyAt(order.pickup, new Date(order.createdAt));
  const confirmed = order.status === "paid" || order.provider === "invoice";

  return (
    <div className="confirmation">
      {confirmed ? <ClearCart /> : null}

      <span className="status-pill">{statusCopy(order)}</span>

      <h1 className="page-title" style={{ marginBottom: 0 }}>
        {confirmed
          ? order.customerName.trim()
            ? `Thank you, ${order.customerName.split(" ")[0]}`
            : "Thank you"
          : "Your order"}
      </h1>

      <p style={{ color: "var(--ink-soft)" }}>
        {order.provider === "invoice"
          ? order.customerEmail.trim()
            ? `We will send the invoice to ${order.customerEmail}. Collect it at ${SHOP_ADDRESS}.`
            : `We will send the invoice. Collect it at ${SHOP_ADDRESS}.`
          : order.status === "paid"
            ? `We are making it up now. Collect it at ${SHOP_ADDRESS}.`
            : "We have not seen the payment yet. This page updates when we do."}
      </p>

      {confirmed ? (
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
