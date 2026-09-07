import type { Order } from "./orders";
import type { PickupOption } from "./pickup";
import { getStripe } from "./stripe";

function meta(value: string | undefined, fallback = ""): string {
  return value?.trim() || fallback;
}

function pickupFromMetadata(
  data: Record<string, string>,
): PickupOption {
  const id = meta(data.pickupId, "session");
  const kind = data.pickupKind === "now" ? "now" : "slot";
  return {
    id,
    kind,
    label: meta(data.pickupLabel, meta(data.pickup, "Pickup")),
    detail: meta(data.pickupDetail),
  };
}

/** Build a confirmation order from a paid Stripe session — no local file needed. */
export async function orderFromPaidStripeSession(
  sessionId: string,
  expectedReference: string,
): Promise<Order | undefined> {
  try {
    const session = await getStripe().checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });

    const reference =
      session.client_reference_id ?? session.metadata?.reference ?? "";
    if (reference !== expectedReference) return undefined;
    if (session.payment_status !== "paid") return undefined;

    const data = session.metadata ?? {};
    const details = session.customer_details;
    const paidAt = new Date(
      (session.created || Math.floor(Date.now() / 1000)) * 1000,
    ).toISOString();

    const lines =
      session.line_items?.data.map((item) => ({
        bouquetId: "",
        name: (item.description ?? "Bouquet").replace(/ bouquet$/i, ""),
        unitPriceOre: item.price?.unit_amount ?? item.amount_total ?? 0,
        quantity: item.quantity ?? 1,
      })) ?? [];

    return {
      reference,
      status: "paid",
      provider: "stripe",
      lines,
      totalOre: session.amount_total ?? 0,
      pickup: pickupFromMetadata(data),
      customerName: meta(data.name, details?.name ?? "there"),
      customerPhone: meta(data.phone, details?.phone ?? ""),
      customerEmail: meta(
        data.email,
        details?.email ?? session.customer_email ?? "",
      ),
      customerKind: data.customerKind === "bedrift" ? "bedrift" : "privat",
      companyName: meta(data.companyName) || undefined,
      orgNumber: meta(data.orgNumber) || undefined,
      message: meta(data.message),
      createdAt: paidAt,
      paidAt,
      providerReference: session.id,
    };
  } catch (error) {
    console.error("Could not read Stripe session", error);
    return undefined;
  }
}
