/**
 * Days the shop will not take pickup — full book or a private event.
 * File-backed for the demo; swap list/close/open for Supabase later.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  closedReasonLabel,
  type ClosedDay,
  type ClosedReason,
} from "./closed-days";
import { openingDaysAhead } from "./pickup";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "closed-days.json");

let writeQueue: Promise<unknown> = Promise.resolve();

function seedClosedDays(): ClosedDay[] {
  const upcoming = openingDaysAhead(new Date(), 8);
  const friday = upcoming.find((day) => day.weekday === 5);
  const saturday = upcoming.find((day) => day.weekday === 6);
  const days: ClosedDay[] = [];

  if (friday) {
    days.push({
      key: friday.key,
      reason: "full",
      note: closedReasonLabel("full"),
    });
  }
  if (saturday) {
    days.push({
      key: saturday.key,
      reason: "event",
      note: closedReasonLabel("event"),
    });
  }

  return days;
}

async function readAll(): Promise<Record<string, ClosedDay>> {
  try {
    return JSON.parse(await readFile(DATA_FILE, "utf8")) as Record<
      string,
      ClosedDay
    >;
  } catch {
    const seeded: Record<string, ClosedDay> = {};
    for (const day of seedClosedDays()) seeded[day.key] = day;
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify(seeded, null, 2), "utf8");
    return seeded;
  }
}

async function mutate<T>(
  change: (days: Record<string, ClosedDay>) => T | Promise<T>,
): Promise<T> {
  const run = writeQueue.then(async () => {
    const days = await readAll();
    const result = await change(days);
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify(days, null, 2), "utf8");
    return result;
  });
  writeQueue = run.catch(() => undefined);
  return run;
}

export async function listClosedDays(): Promise<ClosedDay[]> {
  return Object.values(await readAll()).sort((a, b) =>
    a.key.localeCompare(b.key),
  );
}

export async function closeDay(
  key: string,
  reason: ClosedReason,
): Promise<ClosedDay> {
  return mutate((days) => {
    const next: ClosedDay = {
      key,
      reason,
      note: closedReasonLabel(reason),
    };
    days[key] = next;
    return next;
  });
}

export async function openDay(key: string): Promise<void> {
  await mutate((days) => {
    delete days[key];
  });
}
