import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createPaste } from "@/lib/store";
import { nowMs } from "@/lib/time";

export const dynamic = "force-dynamic";

const err = (status: number, error: string) => NextResponse.json({ error }, { status });

function isPosInt(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 1;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err(400, "Request body must be valid JSON");
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return err(400, "Request body must be a JSON object");
  }
  const { content, ttl_seconds, max_views } = body as Record<string, unknown>;

  if (typeof content !== "string" || content.trim().length === 0) {
    return err(400, "content is required and must be a non-empty string");
  }
  if (ttl_seconds !== undefined && ttl_seconds !== null && !isPosInt(ttl_seconds)) {
    return err(400, "ttl_seconds must be an integer >= 1");
  }
  if (max_views !== undefined && max_views !== null && !isPosInt(max_views)) {
    return err(400, "max_views must be an integer >= 1");
  }

  const id = randomBytes(6).toString("base64url");
  try {
    await createPaste(
      id,
      {
        content,
        ttl_seconds: (ttl_seconds as number | null | undefined) ?? undefined,
        max_views: (max_views as number | null | undefined) ?? undefined,
      },
      nowMs(req.headers)
    );
  } catch {
    return err(500, "Storage unavailable");
  }

  const origin = new URL(req.url).origin;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  const base = host ? `${proto}://${host}` : origin;
  return NextResponse.json({ id, url: `${base}/p/${id}` }, { status: 201 });
}
