"use client";

import { useEffect, useState } from "react";

import {
  closedReasonLabel,
  type ClosedDay,
  type ClosedReason,
} from "@/lib/closed-days";
import { formatDayLong, openingDaysAhead } from "@/lib/pickup";

export function AdminClosedDays() {
  const [days, setDays] = useState<ClosedDay[]>([]);
  const upcoming = openingDaysAhead(new Date(), 8);

  useEffect(() => {
    void fetch("/api/closed-days")
      .then((response) => response.json())
      .then((body: { days?: ClosedDay[] }) => {
        if (Array.isArray(body.days)) setDays(body.days);
      })
      .catch(() => undefined);
  }, []);

  async function update(key: string, next: { reason?: ClosedReason; open?: boolean }) {
    const response = await fetch("/api/closed-days", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, ...next }),
    });
    const body = (await response.json()) as { days?: ClosedDay[] };
    if (Array.isArray(body.days)) setDays(body.days);
  }

  return (
    <section className="admin-section">
      <h2>
        Pickup days
        <span>{days.length} closed</span>
      </h2>
      <p className="admin-empty" style={{ marginBottom: "0.85rem" }}>
        Close a day when you are full or have a private event. It will not be
        offered on checkout.
      </p>
      <ul className="admin-closed">
        {upcoming.map((day) => {
          const shut = days.find((item) => item.key === day.key);
          return (
            <li key={day.key} className={shut ? "is-shut" : undefined}>
              <div>
                <strong>{formatDayLong(day.key)}</strong>
                <span>{shut ? shut.note : "Taking pickup"}</span>
              </div>
              {shut ? (
                <button
                  type="button"
                  className="button button--solid"
                  onClick={() => void update(day.key, { open: true })}
                >
                  Reopen
                </button>
              ) : (
                <span className="admin-closed-actions">
                  <button
                    type="button"
                    className="button"
                    onClick={() => void update(day.key, { reason: "full" })}
                  >
                    {closedReasonLabel("full")}
                  </button>
                  <button
                    type="button"
                    className="button"
                    onClick={() => void update(day.key, { reason: "event" })}
                  >
                    {closedReasonLabel("event")}
                  </button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
