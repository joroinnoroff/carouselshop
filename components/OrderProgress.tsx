"use client";

import { useEffect, useState } from "react";

const SEGMENTS = 36;

const STAGES = [
  { at: 0, label: "Payment received" },
  { at: 0.15, label: "Stems picked in the shop" },
  { at: 0.6, label: "Tied and wrapped" },
  { at: 1, label: "Waiting for you at the counter" },
];

type Props = {
  placedAt: string;
  readyAt: string;
  /** Server time at render, so the first client paint matches the HTML. */
  renderedAt: string;
  pickupLabel: string;
};

function countdown(msRemaining: number): string {
  if (msRemaining <= 0) return "Ready now";

  const totalMinutes = Math.ceil(msRemaining / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `Ready in ${days} d ${hours} h`;
  if (hours > 0) return `Ready in ${hours} h ${minutes} min`;
  return `Ready in ${minutes} min`;
}

export function OrderProgress({
  placedAt,
  readyAt,
  renderedAt,
  pickupLabel,
}: Props) {
  const placed = new Date(placedAt).getTime();
  const ready = new Date(readyAt).getTime();
  const [now, setNow] = useState(() => new Date(renderedAt).getTime());

  useEffect(() => {
    // Catch up to the real clock, then tick.
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const span = Math.max(ready - placed, 60_000);
  const progress = Math.min(Math.max((now - placed) / span, 0), 1);
  const filled = Math.round(progress * SEGMENTS);
  const done = progress >= 1;

  return (
    <section className="progress" aria-label="Order progress">
      <div className="progress-head">
        <span className="progress-status">
          {done ? "Ready for pickup" : "Your order is being prepared"}
        </span>
        <span className="progress-countdown" aria-live="polite">
          {countdown(ready - now)}
        </span>
      </div>

      <div
        className="progress-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-valuetext={`${Math.round(progress * 100)} per cent of the way to ${pickupLabel}`}
      >
        {Array.from({ length: SEGMENTS }, (_, index) => (
          <span
            key={index}
            className={index < filled ? "seg seg--done" : "seg"}
            /* A short stagger so the bar fills like a wave rather than a jump. */
            style={{ transitionDelay: `${index * 12}ms` }}
          />
        ))}
      </div>

      <ol className="progress-stages">
        {STAGES.map((stage) => (
          <li
            key={stage.label}
            className={progress >= stage.at ? "stage stage--done" : "stage"}
          >
            <span className="stage-dot" aria-hidden />
            {stage.label}
          </li>
        ))}
      </ol>

      <p className="progress-foot">{pickupLabel}</p>
    </section>
  );
}
