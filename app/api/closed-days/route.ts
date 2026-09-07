import { NextResponse } from "next/server";

import { closeDay, listClosedDays, openDay } from "@/lib/closed-days-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ days: await listClosedDays() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    key?: string;
    reason?: string;
    open?: boolean;
  };

  const key = typeof body.key === "string" ? body.key : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    return NextResponse.json({ error: "Choose a day." }, { status: 400 });
  }

  if (body.open) {
    await openDay(key);
    return NextResponse.json({ days: await listClosedDays() });
  }

  const reason = body.reason === "event" ? "event" : "full";
  await closeDay(key, reason);
  return NextResponse.json({ days: await listClosedDays() });
}
