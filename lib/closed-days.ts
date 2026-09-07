import { formatDayLong } from "./pickup";

export type ClosedReason = "full" | "event";

export type ClosedDay = {
  key: string;
  reason: ClosedReason;
  note: string;
};

export function closedReasonLabel(reason: ClosedReason): string {
  return reason === "full" ? "Fully booked" : "Private event";
}

export function closedKeysOf(days: ClosedDay[]): string[] {
  return days.map((day) => day.key);
}

export function closedNote(days: ClosedDay[], key: string): string | undefined {
  return days.find((day) => day.key === key)?.note;
}

export function describeClosedDay(day: ClosedDay): string {
  return `${formatDayLong(day.key)} · ${day.note}`;
}
