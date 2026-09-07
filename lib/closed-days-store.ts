/**
 * Days the shop will not take pickup — full book or a private event.
 * File-backed locally; in-memory on Vercel until this moves to a database.
 */

import {
  closedReasonLabel,
  type ClosedDay,
  type ClosedReason,
} from "./closed-days";
import { dataFile, readJsonRecord, writeJsonRecord } from "./local-json";
import { openingDaysAhead } from "./pickup";

const DATA_FILE = dataFile("closed-days.json");

let memory: Record<string, ClosedDay> | null = null;
let writeQueue: Promise<unknown> = Promise.resolve();

function seedClosedDays(): Record<string, ClosedDay> {
  const upcoming = openingDaysAhead(new Date(), 8);
  const friday = upcoming.find((day) => day.weekday === 5);
  const saturday = upcoming.find((day) => day.weekday === 6);
  const days: Record<string, ClosedDay> = {};

  if (friday) {
    days[friday.key] = {
      key: friday.key,
      reason: "full",
      note: closedReasonLabel("full"),
    };
  }
  if (saturday) {
    days[saturday.key] = {
      key: saturday.key,
      reason: "event",
      note: closedReasonLabel("event"),
    };
  }

  return days;
}

async function readAll(): Promise<Record<string, ClosedDay>> {
  if (memory) return memory;

  const stored = await readJsonRecord<ClosedDay>(DATA_FILE);
  if (Object.keys(stored).length > 0) {
    memory = stored;
    return memory;
  }

  // Demo seed only on a writable local disk — never on Vercel.
  if (!process.env.VERCEL) {
    memory = seedClosedDays();
    await writeJsonRecord(DATA_FILE, memory);
    return memory;
  }

  memory = {};
  return memory;
}

async function mutate<T>(
  change: (days: Record<string, ClosedDay>) => T | Promise<T>,
): Promise<T> {
  const run = writeQueue.then(async () => {
    const days = await readAll();
    const result = await change(days);
    memory = days;
    await writeJsonRecord(DATA_FILE, days);
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
