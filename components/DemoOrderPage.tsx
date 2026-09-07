"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { OrderConfirmation } from "./OrderConfirmation";
import { readDemoOrder, type DemoOrder } from "@/lib/demo-order";

export function DemoOrderPage({ reference }: { reference: string }) {
  const [order, setOrder] = useState<DemoOrder | null | undefined>(undefined);

  useEffect(() => {
    setOrder(readDemoOrder(reference));
  }, [reference]);

  if (order === undefined) return null;

  if (!order) {
    return (
      <div className="confirmation">
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          We cannot find that order
        </h1>
        <p style={{ color: "var(--ink-soft)" }}>
          Order <strong>{reference}</strong> is not in our system.
        </p>
        <Link href="/" className="button">
          Back to the shop
        </Link>
      </div>
    );
  }

  return <OrderConfirmation order={order} />;
}
