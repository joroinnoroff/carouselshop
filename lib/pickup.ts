/**
 * Opening hours and pickup slots.
 *
 * Everything the admin panel will eventually edit lives in the three consts at
 * the top: OPENING_HOURS, PICKUP_WINDOWS and PREP_MINUTES.
 *
 * All reasoning is done in Oslo wall-clock time, so the shop behaves the same
 * whether the server runs in Oslo, UTC or anywhere else.
 */

export const TIMEZONE = "Europe/Oslo";

/** Minutes we need before a "pick up now" order is ready. */
export const PREP_MINUTES = 20;

type OpeningHours = { opens: number; closes: number } | null;

/** Indexed by JS weekday: 0 = Sunday … 6 = Saturday. Minutes from midnight. */
export const OPENING_HOURS: OpeningHours[] = [
  null, // Sun
  null, // Mon
  null, // Tue
  { opens: 12 * 60, closes: 17 * 60 }, // Wed
  { opens: 12 * 60, closes: 17 * 60 }, // Thu
  { opens: 12 * 60, closes: 17 * 60 }, // Fri
  { opens: 12 * 60, closes: 17 * 60 }, // Sat
];

/** The three bookable windows inside an opening day. */
export const PICKUP_WINDOWS = [
  { start: 12 * 60, end: 13 * 60 + 30 },
  { start: 13 * 60 + 30, end: 15 * 60 },
  { start: 15 * 60, end: 17 * 60 },
];

/** How many scheduled slots to offer alongside "pick up now". */
export const SLOT_COUNT = 3;

/** Furthest ahead a customer can book from the calendar. */
export const BOOKING_HORIZON_DAYS = 56;

export type PickupOption = {
  /** Stable id — "now", or "2026-09-09T720" (date + window start minute). */
  id: string;
  kind: "now" | "slot";
  label: string;
  /** Secondary line, e.g. "Today" / "Saturday 12 Sep". */
  detail: string;
};

type OsloNow = {
  year: number;
  month: number; // 1-12
  day: number;
  weekday: number; // 0-6
  minutes: number; // minutes from midnight
};

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  weekday: "short",
  hour12: false,
});

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function osloNow(at: Date): OsloNow {
  const parts = Object.fromEntries(
    partsFormatter.formatToParts(at).map((p) => [p.type, p.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: WEEKDAY_INDEX[parts.weekday as string] ?? 0,
    // Intl gives "24" rather than "00" for midnight with hour12: false.
    minutes: (Number(parts.hour) % 24) * 60 + Number(parts.minute),
  };
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Calendar-only day math — no timezone involved, these are wall-clock dates. */
function addDays(d: { year: number; month: number; day: number }, n: number) {
  const utc = new Date(Date.UTC(d.year, d.month - 1, d.day + n));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
    weekday: utc.getUTCDay(),
  };
}

function dateKey(d: { year: number; month: number; day: number }): string {
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

function describeDay(
  d: { year: number; month: number; day: number; weekday: number },
  today: OsloNow,
): string {
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

export function isOpenNow(at: Date = new Date()): boolean {
  const now = osloNow(at);
  const hours = OPENING_HOURS[now.weekday];
  if (!hours) return false;
  return now.minutes >= hours.opens && now.minutes < hours.closes;
}

/**
 * "Pick up now" (only while we are open and can still make it before closing)
 * plus the next three scheduled windows, rolling into the following open days.
 */
export function getPickupOptions(at: Date = new Date()): PickupOption[] {
  const now = osloNow(at);
  const options: PickupOption[] = [];

  const todayHours = OPENING_HOURS[now.weekday];
  const canPickUpNow =
    !!todayHours &&
    now.minutes >= todayHours.opens &&
    now.minutes + PREP_MINUTES <= todayHours.closes;

  if (canPickUpNow) {
    options.push({
      id: "now",
      kind: "now",
      label: "Pick up now",
      detail: `Ready in about ${PREP_MINUTES} minutes — we'll have it waiting`,
    });
  }

  const today = { year: now.year, month: now.month, day: now.day };

  let slots = 0;
  // Look ahead a fortnight at most; that is plenty to find three open windows.
  for (let dayOffset = 0; dayOffset < 14 && slots < SLOT_COUNT; dayOffset++) {
    const day = addDays(today, dayOffset);
    const hours = OPENING_HOURS[day.weekday];
    if (!hours) continue;

    const isToday = dateKey(day) === dateKey(now);

    for (const win of PICKUP_WINDOWS) {
      if (slots >= SLOT_COUNT) break;
      if (win.start < hours.opens || win.end > hours.closes) continue;
      // A window still counts today if we can be ready before it ends.
      if (isToday && now.minutes + PREP_MINUTES > win.end) continue;

      options.push({
        id: `${dateKey(day)}T${win.start}`,
        kind: "slot",
        label: `${formatMinutes(win.start)} – ${formatMinutes(win.end)}`,
        detail: describeDay(day, now),
      });
      slots++;
    }
  }

  return options;
}

export type PickupDay = {
  key: string;
  year: number;
  month: number;
  day: number;
  weekday: number;
};

function toPickupDay(d: {
  year: number;
  month: number;
  day: number;
  weekday: number;
}): PickupDay {
  return { ...d, key: dateKey(d) };
}

export function formatDayLong(key: string): string {
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

export function firstOpenDay(
  at: Date = new Date(),
  closedKeys?: Iterable<string>,
): PickupDay | undefined {
  const now = osloNow(at);
  const today = { year: now.year, month: now.month, day: now.day };
  for (let offset = 0; offset < BOOKING_HORIZON_DAYS; offset += 1) {
    const day = addDays(today, offset);
    if (slotsOnDay(dateKey(day), at, closedKeys).length > 0) {
      return toPickupDay(day);
    }
  }
  return undefined;
}

export function openingDaysAhead(
  at: Date = new Date(),
  count = 8,
): PickupDay[] {
  const now = osloNow(at);
  const today = { year: now.year, month: now.month, day: now.day };
  const days: PickupDay[] = [];
  for (let offset = 0; offset < BOOKING_HORIZON_DAYS && days.length < count; offset += 1) {
    const day = addDays(today, offset);
    if (slotsOnDay(dateKey(day), at).length > 0) days.push(toPickupDay(day));
  }
  return days;
}

export function slotsOnDay(
  key: string,
  at: Date = new Date(),
  closedKeys?: Iterable<string>,
): PickupOption[] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return [];

  const year = Number(match[1]);
  const month = Number(match[2]);
  const dayNum = Number(match[3]);
  const weekday = new Date(Date.UTC(year, month - 1, dayNum)).getUTCDay();
  const hours = OPENING_HOURS[weekday];
  if (!hours) return [];
  if (new Set(closedKeys ?? []).has(key)) return [];

  const now = osloNow(at);
  const todayKey = dateKey(now);
  if (key < todayKey) return [];
  if (key > dateKey(addDays(now, BOOKING_HORIZON_DAYS))) return [];

  const day = { year, month, day: dayNum, weekday };
  const options: PickupOption[] = [];

  if (key === todayKey) {
    const canPickUpNow =
      now.minutes >= hours.opens && now.minutes + PREP_MINUTES <= hours.closes;
    if (canPickUpNow) {
      options.push({
        id: "now",
        kind: "now",
        label: "Pick up now",
        detail: `Ready in about ${PREP_MINUTES} minutes — we'll have it waiting`,
      });
    }
  }

  for (const win of PICKUP_WINDOWS) {
    if (win.start < hours.opens || win.end > hours.closes) continue;
    if (key === todayKey && now.minutes + PREP_MINUTES > win.end) continue;
    options.push({
      id: `${key}T${win.start}`,
      kind: "slot",
      label: `${formatMinutes(win.start)} – ${formatMinutes(win.end)}`,
      detail: describeDay(day, now),
    });
  }

  return options;
}

export function isDayBookable(
  key: string,
  at: Date = new Date(),
  closedKeys?: Iterable<string>,
): boolean {
  return slotsOnDay(key, at, closedKeys).length > 0;
}

/** Monday-first month cells for the checkout calendar. */
export function monthCells(
  year: number,
  month: number,
): Array<PickupDay | null> {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const mondayOffset = firstWeekday === 0 ? 6 : firstWeekday - 1;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: Array<PickupDay | null> = Array.from(
    { length: mondayOffset },
    () => null,
  );

  for (let day = 1; day <= daysInMonth; day += 1) {
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    cells.push(toPickupDay({ year, month, day, weekday }));
  }

  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** Server-side validation: a real open-day window inside the booking horizon. */
export function findPickupOption(
  id: string,
  at: Date = new Date(),
  closedKeys?: Iterable<string>,
): PickupOption | undefined {
  if (id === "now") {
    const now = osloNow(at);
    return slotsOnDay(dateKey(now), at, closedKeys).find(
      (option) => option.id === "now",
    );
  }

  const match = /^(\d{4}-\d{2}-\d{2})T(\d+)$/.exec(id);
  if (!match) return undefined;
  return slotsOnDay(match[1], at, closedKeys).find((option) => option.id === id);
}

export const OPENING_HOURS_LABEL = "Wed – Sat, 12 – 17";
export const SHOP_ADDRESS = "Grünersgate 14A, Oslo";

/** The UTC offset of `tz` at a given instant, in milliseconds. */
function offsetAt(instant: Date): number {
  const parts = Object.fromEntries(
    partsFormatter.formatToParts(instant).map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
  );
  // Seconds are not in the formatter, so line the instant up to the minute.
  return asUtc - Math.floor(instant.getTime() / 60_000) * 60_000;
}

/** Oslo wall-clock → the actual instant, allowing for summer time. */
function osloWallClockToInstant(
  year: number,
  month: number,
  day: number,
  minutes: number,
): Date {
  const naive = Date.UTC(year, month - 1, day, 0, minutes);
  // One correction pass is enough except exactly inside a DST jump, which our
  // 12–17 opening hours never touch.
  const guess = new Date(naive - offsetAt(new Date(naive)));
  return new Date(naive - offsetAt(guess));
}

/**
 * When the customer can actually collect: the start of their window, or
 * PREP_MINUTES from now for a "pick up now" order.
 */
export function pickupReadyAt(option: PickupOption, placedAt: Date): Date {
  if (option.kind === "now") {
    return new Date(placedAt.getTime() + PREP_MINUTES * 60_000);
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d+)$/.exec(option.id);
  if (!match) return new Date(placedAt.getTime() + PREP_MINUTES * 60_000);

  return osloWallClockToInstant(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4]),
  );
}
