"use client";

import { useEffect, useMemo, useState } from "react";

import { AdminClosedDays } from "./AdminClosedDays";
import { useShopStatus } from "./shop-status";
import {
  customerKindOf,
  dateKey,
  formatDeskDate,
  formatDeskStamp,
  formatDeskTime,
  groupByPickupDay,
  isCompanyInvoice,
  normalizeDeskOrder,
  osloNow,
  paymentLabel,
  pickupDateKey,
  pickupLine,
  pickupSort,
  seedDemoOrders,
  toDeskOrder,
  type DeskOrder,
  type Fulfillment,
} from "@/lib/admin-desk";
import type { CustomerKind, Order } from "@/lib/orders";
import { formatNok } from "@/lib/products";

const STORAGE_KEY = "carousel-admin-desk-v2";

type StatusFilter = "open" | "ready" | "past" | "cancelled";
type KindFilter = "all" | CustomerKind;

type Props = {
  liveOrders: Order[];
};

function readStored(): DeskOrder[] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return (parsed as DeskOrder[]).map(normalizeDeskOrder);
  } catch {
    return null;
  }
}

function mergeLive(seed: DeskOrder[], live: Order[]): DeskOrder[] {
  const seen = new Set(seed.map((order) => order.reference));
  const extras = live
    .filter((order) => !seen.has(order.reference))
    .map(toDeskOrder);
  return [...extras, ...seed];
}

function sortDesk(orders: DeskOrder[]): DeskOrder[] {
  return [...orders].sort((a, b) => {
    const day = pickupDateKey(a).localeCompare(pickupDateKey(b));
    if (day !== 0) return day;
    return pickupSort(a) - pickupSort(b);
  });
}

export function AdminDesk({ liveOrders }: Props) {
  const { shopOpen, setShopOpen } = useShopStatus();
  const [orders, setOrders] = useState<DeskOrder[]>(() => seedDemoOrders());
  const [hidden, setHidden] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [now, setNow] = useState(() => new Date());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setOrders(mergeLive(readStored() ?? seedDemoOrders(), liveOrders));
    setHydrated(true);
  }, [liveOrders]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    } catch {
      // Demo still works for this visit.
    }
  }, [orders, hydrated]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const oslo = osloNow(now);
  const todayKey = dateKey(oslo);

  const visible = useMemo(
    () => orders.filter((order) => !hidden.includes(order.reference)),
    [orders, hidden],
  );

  const filtered = useMemo(() => {
    return sortDesk(
      visible.filter((order) => {
        const day = pickupDateKey(order);
        const kind = customerKindOf(order);
        if (kindFilter !== "all" && kind !== kindFilter) return false;

        if (statusFilter === "open") return order.fulfillment === "new";
        if (statusFilter === "ready") {
          return order.fulfillment === "ready" && day >= todayKey;
        }
        if (statusFilter === "cancelled") {
          return order.fulfillment === "cancelled";
        }
        return day < todayKey && order.fulfillment !== "cancelled";
      }),
    );
  }, [visible, statusFilter, kindFilter, todayKey]);

  const days = useMemo(() => {
    const groups = groupByPickupDay(filtered);
    if (statusFilter === "past") return [...groups].reverse();
    return groups;
  }, [filtered, statusFilter]);

  const waiting = visible.filter((order) => order.fulfillment === "new").length;

  function patch(reference: string, next: Partial<DeskOrder>) {
    setOrders((current) =>
      current.map((order) =>
        order.reference === reference ? { ...order, ...next } : order,
      ),
    );
  }

  function remove(reference: string) {
    setHidden((current) =>
      current.includes(reference) ? current : [...current, reference],
    );
  }

  function resetDemo() {
    window.localStorage.removeItem(STORAGE_KEY);
    setHidden([]);
    setStatusFilter("open");
    setKindFilter("all");
    setOrders(mergeLive(seedDemoOrders(), liveOrders));
  }

  return (
    <div className="admin">
      <header className="admin-top">
        <div>
          <p className="admin-kicker">Today</p>
          <h1 className="admin-date">{formatDeskDate(oslo)}</h1>
          <p className="admin-clock">
            {formatDeskTime(now)} Oslo
            {waiting ? ` · ${waiting} waiting` : " · all caught up"}
          </p>
        </div>

        <div className="admin-shop">
          <p className="admin-shop-state">
            {shopOpen ? "Online shop is open" : "Online shop is paused"}
          </p>
          <button
            type="button"
            className={shopOpen ? "button" : "button button--solid"}
            onClick={() => setShopOpen(!shopOpen)}
          >
            {shopOpen ? "Close online shop" : "Reopen online shop"}
          </button>
        </div>
      </header>

      <AdminClosedDays />

      <div className="admin-filters">
        <div className="admin-filter-row" role="tablist" aria-label="Order status">
          <FilterChip
            active={statusFilter === "open"}
            onClick={() => setStatusFilter("open")}
          >
            To make
          </FilterChip>
          <FilterChip
            active={statusFilter === "ready"}
            onClick={() => setStatusFilter("ready")}
          >
            Ready
          </FilterChip>
          <FilterChip
            active={statusFilter === "past"}
            onClick={() => setStatusFilter("past")}
          >
            Past
          </FilterChip>
          <FilterChip
            active={statusFilter === "cancelled"}
            onClick={() => setStatusFilter("cancelled")}
          >
            Cancelled
          </FilterChip>
        </div>
        <div
          className="admin-filter-row"
          role="tablist"
          aria-label="Customer type"
        >
          <FilterChip
            active={kindFilter === "all"}
            onClick={() => setKindFilter("all")}
          >
            All
          </FilterChip>
          <FilterChip
            active={kindFilter === "privat"}
            onClick={() => setKindFilter("privat")}
          >
            Privat
          </FilterChip>
          <FilterChip
            active={kindFilter === "bedrift"}
            onClick={() => setKindFilter("bedrift")}
          >
            Bedrift
          </FilterChip>
        </div>
      </div>

      <section className="admin-section">
        <h2>
          {sectionTitle(statusFilter, kindFilter)}
          <span>{filtered.length}</span>
        </h2>
        {filtered.length === 0 ? (
          <p className="admin-empty">Nothing in this view.</p>
        ) : (
          days.map((day) => (
            <div className="admin-day" key={day.key}>
              <h3 className="admin-day-title">
                {day.key === todayKey ? `Today · ${day.title}` : day.title}
                <span>
                  {day.orders.length}{" "}
                  {day.orders.length === 1 ? "order" : "orders"}
                </span>
              </h3>
              <div className="admin-grid">
                {day.orders.map((order) => (
                  <OrderCard
                    key={order.reference}
                    order={order}
                    onPatch={patch}
                    onRemove={remove}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      <button type="button" className="link-button" onClick={resetDemo}>
        Reset demo orders
      </button>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={active ? "admin-chip is-on" : "admin-chip"}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function OrderCard({
  order,
  onPatch,
  onRemove,
}: {
  order: DeskOrder;
  onPatch: (reference: string, next: Partial<DeskOrder>) => void;
  onRemove: (reference: string) => void;
}) {
  const closed = order.fulfillment === "cancelled";
  const kind = customerKindOf(order);

  return (
    <article className={`admin-order is-${order.fulfillment}`}>
      <div className="admin-pickup">
        <div>
          <strong>{pickupLine(order)}</strong>
          <span>{order.pickup.detail}</span>
        </div>
        <span className={`status-pill is-${order.fulfillment}`}>
          {fulfillmentLabel(order.fulfillment)}
        </span>
      </div>

      <p className="admin-paid">
        {isCompanyInvoice(order) ? (
          <>
            <span>
              {order.paidAt ? "Invoice paid" : "Invoice"} · Bedrift
            </span>
            {order.paidAt ? formatDeskStamp(order.paidAt) : "Awaiting payment"}
          </>
        ) : (
          <>
            <span>Payment received · {paymentLabel(order.provider)}</span>
            {formatDeskStamp(order.paidAt ?? order.createdAt)}
          </>
        )}
      </p>

      <ul className="admin-lines">
        {order.lines.map((item) => (
          <li key={`${order.reference}-${item.bouquetId}`}>
            <span>
              {item.quantity} × {item.name}
            </span>
            <span>{formatNok(item.unitPriceOre * item.quantity)}</span>
          </li>
        ))}
        <li className="admin-total">
          <span>Total</span>
          <span>{formatNok(order.totalOre)}</span>
        </li>
      </ul>

      <div className="admin-customer">
        <span className="admin-kind">{kind === "bedrift" ? "Bedrift" : "Privat"}</span>
        <strong>
          {kind === "bedrift" && order.companyName
            ? order.companyName
            : order.customerName}
        </strong>
        {kind === "bedrift" && order.companyName ? (
          <span>{order.customerName}</span>
        ) : null}
        {order.orgNumber ? <span>Org.nr {order.orgNumber}</span> : null}
        <a href={`tel:${order.customerPhone.replace(/\s/g, "")}`}>
          {order.customerPhone}
        </a>
        <a href={`mailto:${order.customerEmail}`}>{order.customerEmail}</a>
        <span className="admin-ref">{order.reference}</span>
      </div>

      {order.message ? (
        <p className="admin-customer-note">
          <span>From the customer</span>
          {order.message}
        </p>
      ) : null}

      <OrderNotes order={order} onPatch={onPatch} />

      <div className="admin-actions">
        <button
          type="button"
          className="button button--solid"
          disabled={closed || order.fulfillment === "ready"}
          onClick={() => onPatch(order.reference, { fulfillment: "ready" })}
        >
          {order.fulfillment === "ready" ? "Ready" : "Mark ready"}
        </button>
        <button
          type="button"
          className="button admin-cancel"
          disabled={closed}
          onClick={() =>
            onPatch(order.reference, {
              fulfillment: "cancelled",
              status: "cancelled",
            })
          }
        >
          {closed ? "Cancelled" : "Cancel order"}
        </button>
        <button
          type="button"
          className="link-button admin-delete"
          onClick={() => onRemove(order.reference)}
        >
          Delete
        </button>
      </div>
    </article>
  );
}

function OrderNotes({
  order,
  onPatch,
}: {
  order: DeskOrder;
  onPatch: (reference: string, next: Partial<DeskOrder>) => void;
}) {
  const hasNote = order.shopNote.trim().length > 0;
  const [open, setOpen] = useState(hasNote);

  if (!hasNote && !open) {
    return (
      <button
        type="button"
        className="link-button"
        onClick={() => setOpen(true)}
      >
        Your notes
      </button>
    );
  }

  return (
    <label className="field admin-note">
      <span>Your notes</span>
      <textarea
        value={order.shopNote}
        onChange={(event) =>
          onPatch(order.reference, { shopNote: event.target.value })
        }
        placeholder="A call, a change, anything you want on this order."
      />
    </label>
  );
}

function fulfillmentLabel(status: Fulfillment): string {
  if (status === "ready") return "Ready";
  if (status === "cancelled") return "Cancelled";
  return "To make";
}

function sectionTitle(status: StatusFilter, kind: KindFilter): string {
  const who =
    kind === "privat" ? " · Privat" : kind === "bedrift" ? " · Bedrift" : "";
  if (status === "ready") return `Ready${who}`;
  if (status === "past") return `Past${who}`;
  if (status === "cancelled") return `Cancelled${who}`;
  return `To make${who}`;
}
