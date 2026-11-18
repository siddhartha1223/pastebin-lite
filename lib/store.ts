import { NextResponse } from "next/server";
import { ping } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const r = await ping();
  return NextResponse.json(r.ok ? { ok: true } : { ok: false, error: r.error }, { status: 200 });
}
