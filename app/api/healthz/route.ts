import { NextResponse } from "next/server";
import { ping } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const ok = await ping();
  return NextResponse.json({ ok }, { status: 200 });
}
