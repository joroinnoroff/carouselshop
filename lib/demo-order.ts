import type { CustomerKind, PaymentProvider } from "./orders";
import type { PickupOption } from "./pickup";

export const DEMO_ORDER_KEY = "carousel-demo-order";

export type DemoOrder = {
  reference: string;
  status: "paid" | "pending" | "cancelled" | "failed";
  provider: PaymentProvider;
  lines: { name: string; quantity: number; unitPriceOre: number }[];
  totalOre: number;
  pickup: PickupOption;
  customerName: string;
  customerEmail: string;
  customerKind?: CustomerKind;
  companyName?: string;
  orgNumber?: string;
  message: string;
  createdAt: string;
  paidAt?: string;
};

export function createDemoReference(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const noise = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CAR-${stamp}-${noise}`;
}

export function writeDemoOrder(order: DemoOrder): void {
  window.sessionStorage.setItem(DEMO_ORDER_KEY, JSON.stringify(order));
}

export function readDemoOrder(reference: string): DemoOrder | null {
  try {
    const raw = window.sessionStorage.getItem(DEMO_ORDER_KEY);
    if (!raw) return null;
    const order = JSON.parse(raw) as DemoOrder;
    return order.reference === reference ? order : null;
  } catch {
    return null;
  }
}
