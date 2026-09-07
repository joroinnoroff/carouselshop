"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { ClosedDay } from "@/lib/closed-days";
import { closedKeysOf, closedNote } from "@/lib/closed-days";
import {
  firstOpenDay,
  formatDayLong,
  isDayBookable,
  monthCells,
  slotsOnDay,
  type PickupOption,
} from "@/lib/pickup";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function CalendarIcon() {
  return (
    <svg
      className="pickup-date-icon"
      viewBox="0 0 16 16"
      width="14"
      height="14"
      aria-hidden
    >
      <rect
        x="1.5"
        y="2.75"
        width="13"
        height="11.75"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path
        d="M1.5 6.25h13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
      />
      <path
        d="M5 1.5v3M11 1.5v3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

type Props = {
  nowIso: string;
  closedDays: ClosedDay[];
  openingHours: string;
  value: string;
  onChange: (id: string) => void;
};

function dayFromOption(id: string, fallback: string): string {
  if (id === "now") return fallback;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(id);
  return match?.[1] ?? fallback;
}

export function PickupDateField({
  nowIso,
  closedDays,
  openingHours,
  value,
  onChange,
}: Props) {
  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const closedKeys = useMemo(() => closedKeysOf(closedDays), [closedDays]);
  const first = firstOpenDay(now, closedKeys);
  const firstKey = first?.key ?? "";

  const [dayKey, setDayKey] = useState(() => dayFromOption(value, firstKey));
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => ({
    year: first?.year ?? now.getFullYear(),
    month: first?.month ?? now.getMonth() + 1,
  }));
  const rootRef = useRef<HTMLDivElement>(null);

  const slots = dayKey ? slotsOnDay(dayKey, now, closedKeys) : [];

  useEffect(() => {
    if (!value) return;
    if (!dayKey || slots.length > 0 || !firstKey) return;
    setDayKey(firstKey);
    const next = slotsOnDay(firstKey, now, closedKeys);
    if (next[0]) onChange(next[0].id);
  }, [closedKeys, dayKey, firstKey, now, onChange, slots.length, value]);

  useEffect(() => {
    if (!open) return;

    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function chooseDay(key: string) {
    if (!isDayBookable(key, now, closedKeys)) return;
    setDayKey(key);
    setOpen(false);
    const nextSlots = slotsOnDay(key, now, closedKeys);
    const keep = nextSlots.find((slot) => slot.id === value);
    onChange(keep?.id ?? "");
  }

  function shiftMonth(delta: number) {
    setView((current) => {
      const date = new Date(Date.UTC(current.year, current.month - 1 + delta, 1));
      return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
      };
    });
  }

  const monthLabel = new Date(Date.UTC(view.year, view.month - 1, 1)).toLocaleDateString(
    "en-GB",
    { timeZone: "UTC", month: "long", year: "numeric" },
  );

  return (
    <div className="pickup" ref={rootRef}>
      <div className="pickup-date-wrap">
      <button
        type="button"
        className="pickup-date"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="pickup-date-text">
          <strong>{dayKey ? formatDayLong(dayKey) : "Choose a day"}</strong>
          <span className="pickup-date-hint">
            <CalendarIcon />
            {dayKey ? "click to change" : "click to choose"}
          </span>
        </span>
        <span className="pickup-date-caret" aria-hidden>
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open ? (
        <div className="pickup-cal" role="dialog" aria-label="Pickup calendar">
          <div className="pickup-cal-head">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => shiftMonth(-1)}
            >
              ‹
            </button>
            <strong>{monthLabel}</strong>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => shiftMonth(1)}
            >
              ›
            </button>
          </div>

          <div className="pickup-cal-week">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="pickup-cal-grid">
            {monthCells(view.year, view.month).map((cell, index) => {
              if (!cell) return <span key={`empty-${index}`} />;
              const shut = closedNote(closedDays, cell.key);
              const wouldBeOpen = isDayBookable(cell.key, now);
              const bookable = isDayBookable(cell.key, now, closedKeys);
              return (
                <button
                  key={cell.key}
                  type="button"
                  className={
                    shut && wouldBeOpen
                      ? "pickup-cal-day is-shut"
                      : cell.key === dayKey
                        ? "pickup-cal-day is-on"
                        : "pickup-cal-day"
                  }
                  disabled={!bookable}
                  title={shut}
                  onClick={() => chooseDay(cell.key)}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>
          <p className="pickup-cal-legend">
            A struck-through day is fully booked or a private event.
          </p>
        </div>
      ) : null}
      </div>

      <div className="option-list pickup-slots">
        {slots.map((option: PickupOption) => (
          <label className="option" key={option.id}>
            <input
              type="radio"
              name="pickupOptionId"
              value={option.id}
              checked={value === option.id}
              onChange={() => onChange(option.id)}
            />
            <span className="option-text">
              <strong>{option.label}</strong>
              <span>{option.detail}</span>
            </span>
            {option.kind === "now" ? (
              <span className="option-badge">Open now</span>
            ) : null}
          </label>
        ))}
      </div>

      <p className="field-hint">
        Collection at Grünersgate 14A. We are open {openingHours}.
      </p>
    </div>
  );
}
