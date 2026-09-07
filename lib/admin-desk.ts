/**
 * Demo data and types for the shop desk at /admin.
 * Swap seedDemoOrders / loadDeskState for Supabase reads when the backend lands.
 */

import { OPENING_HOURS, TIMEZONE, type PickupOption } from "./pickup";
import { getBouquet } from "./products";
import type {
  CustomerKind,
  Order,
  OrderLine,
  PaymentProvider,
} from "./orders";

export type Fulfillment = "new" | "ready" | "cancelled";

export type DeskOrder = Order & {
  fulfillment: Fulfillment;
  shopNote: string;
};

const WEEKDAY: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

type OsloDay = {
  year: number;
  month: number;
  day: number;
  weekday: number;
};

export type OsloNow = OsloDay & { minutes: number };

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  weekday: "short",
  hour: "numeric",
  minute: "numeric",
  hour12: false,
});

export function osloNow(at: Date = new Date()): OsloNow {
  const parts = Object.fromEntries(
    partsFormatter.formatToParts(at).map((p) => [p.type, p.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: WEEKDAY[parts.weekday as string] ?? 0,
    minutes: (Number(parts.hour) % 24) * 60 + Number(parts.minute),
  };
}

function addDays(d: OsloDay, n: number): OsloDay {
  const utc = new Date(Date.UTC(d.year, d.month - 1, d.day + n));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
    weekday: utc.getUTCDay(),
  };
}

export function dateKey(d: Pick<OsloDay, "year" | "month" | "day">): string {
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function describeDay(d: OsloDay, today: OsloDay): string {
  if (dateKey(d) === dateKey(today)) return "Today";
  if (dateKey(d) === dateKey(addDays(today, 1))) return "Tomorrow";
  const asDate = new Date(Date.UTC(d.year, d.month - 1, d.day));
  return asDate.toLocaleDateString("en-GB", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

function openDays(from: OsloDay, count: number, direction: 1 | -1): OsloDay[] {
  const days: OsloDay[] = [];
  for (let i = direction === 1 ? 0 : 1; days.length < count && i < 21; i += 1) {
    const day = addDays(from, i * direction);
    if (OPENING_HOURS[day.weekday]) days.push(day);
  }
  return days;
}

function slot(day: OsloDay, start: number, end: number, today: OsloDay): PickupOption {
  return {
    id: `${dateKey(day)}T${start}`,
    kind: "slot",
    label: `${formatMinutes(start)} – ${formatMinutes(end)}`,
    detail: describeDay(day, today),
  };
}

function line(bouquetId: string, quantity: number): OrderLine {
  const bouquet = getBouquet(bouquetId);
  if (!bouquet) {
    throw new Error(`Unknown bouquet ${bouquetId}`);
  }
  return {
    bouquetId: bouquet.id,
    name: bouquet.name,
    unitPriceOre: bouquet.priceOre,
    quantity,
  };
}

function totalOf(lines: OrderLine[]): number {
  return lines.reduce((sum, item) => sum + item.unitPriceOre * item.quantity, 0);
}

function placedOn(day: OsloDay, minutes: number): string {
  const utc = Date.UTC(day.year, day.month - 1, day.day, 10, minutes % 60);
  return new Date(utc).toISOString();
}

function makeOrder(input: {
  reference: string;
  provider: PaymentProvider;
  lines: OrderLine[];
  pickup: PickupOption;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerKind?: CustomerKind;
  companyName?: string;
  orgNumber?: string;
  message?: string;
  createdAt: string;
  paidAt?: string | null;
  fulfillment?: Fulfillment;
  shopNote?: string;
}): DeskOrder {
  const customerKind = input.customerKind ?? "privat";
  const paidAt =
    input.paidAt === null
      ? undefined
      : (input.paidAt ??
        (input.provider === "invoice" ? undefined : input.createdAt));

  return normalizeDeskOrder({
    reference: input.reference,
    status:
      input.fulfillment === "cancelled"
        ? "cancelled"
        : input.provider === "invoice" && !paidAt
          ? "pending"
          : "paid",
    provider: input.provider,
    lines: input.lines,
    totalOre: totalOf(input.lines),
    pickup: input.pickup,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerEmail: input.customerEmail,
    customerKind,
    companyName: input.companyName,
    orgNumber: input.orgNumber,
    message: input.message ?? "",
    createdAt: input.createdAt,
    paidAt,
    fulfillment: input.fulfillment ?? "new",
    shopNote: input.shopNote ?? "",
  });
}

export function seedDemoOrders(at: Date = new Date()): DeskOrder[] {
  const today = osloNow(at);
  const todayDay = { year: today.year, month: today.month, day: today.day, weekday: today.weekday };
  const upcoming = openDays(todayDay, 2, 1);
  const previous = openDays(todayDay, 2, -1);
  const first = upcoming[0] ?? todayDay;
  const second = upcoming[1] ?? addDays(first, 1);
  const last = previous[0] ?? addDays(todayDay, -1);
  const before = previous[1] ?? addDays(last, -1);

  const hours = OPENING_HOURS[today.weekday];
  const canNow =
    !!hours && today.minutes >= hours.opens && today.minutes + 20 <= hours.closes;

  const incoming: DeskOrder[] = [];

  if (canNow) {
    incoming.push(
      makeOrder({
        reference: "CAR-DEMO-NOW",
        provider: "vipps",
        lines: [line("hverdag", 1)],
        pickup: {
          id: "now",
          kind: "now",
          label: "Pick up now",
          detail: "Ready in about 20 minutes — we'll have it waiting",
        },
        customerName: "Nora Vik",
        customerPhone: "412 88 104",
        customerEmail: "nora.vik@gmail.com",
        message: "I am around the corner — call if you need five extra minutes.",
        createdAt: new Date(at.getTime() - 6 * 60_000).toISOString(),
      }),
    );
  }

  incoming.push(
    makeOrder({
      reference: "CAR-DEMO-01",
      provider: "stripe",
      lines: [line("sommer", 1)],
      pickup: slot(first, 12 * 60, 13 * 60 + 30, today),
      customerName: "Ingrid Holm",
      customerPhone: "472 12 883",
      customerEmail: "ingrid.holm@gmail.com",
      message: "A small card: to Eva, just because.",
      createdAt: placedOn(addDays(first, -1), 40),
    }),
    makeOrder({
      reference: "CAR-DEMO-02",
      provider: "vipps",
      lines: [line("grunersgate", 1), line("hverdag", 1)],
      pickup: slot(first, 13 * 60 + 30, 15 * 60, today),
      customerName: "Jonas Berg",
      customerPhone: "901 44 217",
      customerEmail: "jonas.berg@outlook.com",
      createdAt: placedOn(addDays(first, -1), 55),
    }),
    makeOrder({
      reference: "CAR-DEMO-03",
      provider: "stripe",
      lines: [line("karusell", 1)],
      pickup: slot(second, 15 * 60, 17 * 60, today),
      customerName: "Marte Nilsen",
      customerPhone: "458 03 661",
      customerEmail: "marte.nilsen@icloud.com",
      message: "Birthday — extra paper if you have the peach wrap.",
      createdAt: placedOn(todayDay, 20),
    }),
    makeOrder({
      reference: "CAR-DEMO-08",
      provider: "invoice",
      customerKind: "bedrift",
      companyName: "Atelier Nord AS",
      orgNumber: "912345678",
      lines: [line("grunersgate", 2)],
      pickup: slot(first, 15 * 60, 17 * 60, today),
      customerName: "Kari Strand",
      customerPhone: "400 12 988",
      customerEmail: "kari@ateliernord.no",
      message: "Reception desk — invoice to accounts@ateliernord.no",
      createdAt: placedOn(todayDay, 35),
      paidAt: null,
    }),
  );

  const earlier: DeskOrder[] = [
    makeOrder({
      reference: "CAR-DEMO-04",
      provider: "vipps",
      lines: [line("hverdag", 1)],
      pickup: slot(last, 12 * 60, 13 * 60 + 30, today),
      customerName: "Sofie Dahl",
      customerPhone: "413 77 290",
      customerEmail: "sofie.dahl@gmail.com",
      createdAt: placedOn(last, 15),
      fulfillment: "ready",
      shopNote: "Collected at 12:20. She asked to keep the ribbon.",
    }),
    makeOrder({
      reference: "CAR-DEMO-05",
      provider: "stripe",
      lines: [line("sommer", 1)],
      pickup: slot(last, 15 * 60, 17 * 60, today),
      customerName: "Lars Ødegård",
      customerPhone: "988 21 044",
      customerEmail: "lars.odegard@gmail.com",
      message: "No lilies — allergy in the house.",
      createdAt: placedOn(last, 30),
      fulfillment: "ready",
      shopNote: "Left lilies out. He came at 15:40.",
    }),
    makeOrder({
      reference: "CAR-DEMO-06",
      provider: "vipps",
      lines: [line("grunersgate", 1)],
      pickup: slot(before, 13 * 60 + 30, 15 * 60, today),
      customerName: "Ane Kristiansen",
      customerPhone: "400 19 552",
      customerEmail: "ane.k@online.no",
      createdAt: placedOn(before, 25),
      fulfillment: "cancelled",
      shopNote: "Called in — train delayed, asked to cancel.",
    }),
    makeOrder({
      reference: "CAR-DEMO-07",
      provider: "stripe",
      lines: [line("hverdag", 2)],
      pickup: slot(before, 15 * 60, 17 * 60, today),
      customerName: "Henrik Moen",
      customerPhone: "922 66 318",
      customerEmail: "henrik.moen@gmail.com",
      createdAt: placedOn(before, 45),
      fulfillment: "ready",
    }),
    makeOrder({
      reference: "CAR-DEMO-09",
      provider: "invoice",
      customerKind: "bedrift",
      companyName: "Studio Fjord",
      orgNumber: "998877665",
      lines: [line("karusell", 1)],
      pickup: slot(last, 13 * 60 + 30, 15 * 60, today),
      customerName: "Thea Berg",
      customerPhone: "932 10 441",
      customerEmail: "thea@studiofjord.no",
      createdAt: placedOn(last, 50),
      paidAt: placedOn(last, 52),
      fulfillment: "ready",
      shopNote: "Invoice paid. Collected for the office.",
    }),
  ];

  return [...incoming, ...earlier];
}

export function toDeskOrder(order: Order): DeskOrder {
  return normalizeDeskOrder({
    ...order,
    customerKind: order.customerKind ?? "privat",
    fulfillment:
      order.status === "cancelled" || order.status === "failed"
        ? "cancelled"
        : "new",
    shopNote: "",
  });
}

/** Invoice is only for Bedrift with a company name and 9-digit org.nr. */
export function isCompanyInvoice(order: DeskOrder): boolean {
  const org = order.orgNumber?.replace(/\D/g, "") ?? "";
  return (
    customerKindOf(order) === "bedrift" &&
    order.provider === "invoice" &&
    Boolean(order.companyName?.trim()) &&
    org.length === 9
  );
}

export function normalizeDeskOrder(order: DeskOrder): DeskOrder {
  if (isCompanyInvoice(order)) {
    return { ...order, customerKind: "bedrift", provider: "invoice" };
  }

  const provider = order.provider === "invoice" ? "stripe" : order.provider;
  return {
    ...order,
    customerKind: "privat",
    provider,
    companyName: undefined,
    orgNumber: undefined,
    paidAt: order.paidAt ?? order.createdAt,
  };
}

export function pickupDateKey(order: DeskOrder): string {
  if (order.pickup.kind === "slot") {
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(order.pickup.id);
    if (match) return match[1];
  }
  return dateKey(osloNow(new Date(order.createdAt)));
}

export function pickupSort(order: DeskOrder): number {
  if (order.pickup.kind === "now") return -1;
  const match = /T(\d+)$/.exec(order.pickup.id);
  return match ? Number(match[1]) : 0;
}

export function formatDeskDate(now: OsloNow): string {
  const asDate = new Date(Date.UTC(now.year, now.month - 1, now.day));
  return asDate.toLocaleDateString("en-GB", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatDeskTime(at: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(at);
}

export function pickupLine(order: DeskOrder): string {
  if (order.pickup.kind === "now") return "Pick up now";
  return order.pickup.label;
}

export function formatDeskStamp(iso: string): string {
  const at = new Date(iso);
  return `${formatDeskDate(osloNow(at))} · ${formatDeskTime(at)}`;
}

export function paymentLabel(provider: PaymentProvider): string {
  if (provider === "stripe") return "Card";
  if (provider === "vipps") return "Vipps";
  return "Invoice";
}

export function customerKindOf(order: DeskOrder): CustomerKind {
  return order.customerKind ?? "privat";
}

/** "Thursday 10 September" from a YYYY-MM-DD pickup key. */
export function formatPickupDayTitle(key: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return key;
  const asDate = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  return asDate.toLocaleDateString("en-GB", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function groupByPickupDay(
  orders: DeskOrder[],
): { key: string; title: string; orders: DeskOrder[] }[] {
  const groups: { key: string; title: string; orders: DeskOrder[] }[] = [];

  for (const order of orders) {
    const key = pickupDateKey(order);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.orders.push(order);
      continue;
    }
    groups.push({
      key,
      title: formatPickupDayTitle(key),
      orders: [order],
    });
  }

  return groups;
}
