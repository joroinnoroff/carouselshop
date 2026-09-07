import type { Metadata } from "next";

import { AdminDesk } from "@/components/AdminDesk";
import { listOrders } from "@/lib/orders";

export const metadata: Metadata = {
  title: "Shop desk — Carousel Oslo",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const liveOrders = await listOrders();

  return <AdminDesk liveOrders={liveOrders} />;
}
