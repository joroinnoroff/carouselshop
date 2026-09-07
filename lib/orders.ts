/**
 * Order storage.
 *
 * Backed by a JSON file under .data/ so the demo survives dev recompiles and
 * restarts without a database. Every read and write goes through the four
 * functions below — when the admin panel arrives, swap their bodies for real
 * database calls and nothing else in the app has to change.
 */

import { dataFile, readJsonRecord, writeJsonRecord } from "./local-json";
import type { PickupOption } from "./pickup";

export type OrderStatus = "pending" | "paid" | "cancelled" | "failed";
export type PaymentProvider = "stripe" | "vipps" | "invoice";
export type CustomerKind = "privat" | "bedrift";

export type OrderLine = {
  bouquetId: string;
  name: string;
  unitPriceOre: number;
  quantity: number;
};

export type Order = {
  /** Our own reference — also what we send to Stripe/Vipps. */
  reference: string;
  status: OrderStatus;
  provider: PaymentProvider;
  lines: OrderLine[];
  totalOre: number;
  pickup: PickupOption;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerKind?: CustomerKind;
  companyName?: string;
  orgNumber?: string;
  /** Optional note from the customer — a card message, an allergy, anything. */
  message: string;
  createdAt: string;
  /** Set by Stripe/Vipps webhooks (or when an invoice is recorded as paid). */
  paidAt?: string;
  /** Provider-side id, once we have one. */
  providerReference?: string;
};

const DATA_FILE = dataFile("orders.json");

/** Serialises writes so two checkouts cannot clobber each other's file. */
let writeQueue: Promise<unknown> = Promise.resolve();
let memory: Record<string, Order> | null = null;

async function readAll(): Promise<Record<string, Order>> {
  if (memory) return memory;
  memory = await readJsonRecord<Order>(DATA_FILE);
  return memory;
}

async function mutate<T>(
  change: (orders: Record<string, Order>) => T | Promise<T>,
): Promise<T> {
  const run = writeQueue.then(async () => {
    const orders = await readAll();
    const result = await change(orders);
    memory = orders;
    await writeJsonRecord(DATA_FILE, orders);
    return result;
  });
  // Keep the chain alive even if this write throws.
  writeQueue = run.catch(() => undefined);
  return run;
}


export function createReference(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const noise = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CAR-${stamp}-${noise}`;
}

export async function saveOrder(order: Order): Promise<Order> {
  return mutate((orders) => {
    orders[order.reference] = order;
    return order;
  });
}

export async function getOrder(reference: string): Promise<Order | undefined> {
  return (await readAll())[reference];
}

export async function updateOrder(
  reference: string,
  patch: Partial<Order>,
): Promise<Order | undefined> {
  return mutate((orders) => {
    const existing = orders[reference];
    if (!existing) return undefined;
    const next = { ...existing, ...patch };
    orders[reference] = next;
    return next;
  });
}

/** Sorted newest first — what the admin panel will list. */
export async function listOrders(): Promise<Order[]> {
  return Object.values(await readAll()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}
