import { NextResponse } from "next/server";
import { fetchPaste } from "@/lib/store";
import { nowMs } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const r = await fetchPaste(id, nowMs(req.headers));
    if (!r.ok) return NextResponse.json({ error: "Paste not found or unavailable" }, { status: 404 });
    return NextResponse.json({
      content: r.content,
      remaining_views: r.remaining_views,
      expires_at: r.expires_at,
    });
  } catch {
    return NextResponse.json({ error: "Storage unavailable" }, { status: 500 });
  }
}
