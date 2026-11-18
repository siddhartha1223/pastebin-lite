import { createClient } from "redis";

export type Paste = {
  content: string;
  expires_at: number | null; // epoch ms
  max_views: number | null;
};

export type FetchResult =
  | { ok: true; content: string; remaining_views: number | null; expires_at: string | null }
  | { ok: false };

const key = (id: string) => `paste:${id}`;

/**
 * Atomic fetch: checks expiry, then decrements the view budget, all inside one
 * Lua script so concurrent requests can never serve a paste beyond its limits.
 * Returns {-1} when unavailable, otherwise {content, remaining(-1 = unlimited), expires_at(-1 = none)}.
 */
const FETCH_SCRIPT = `
local k = KEYS[1]
local now = tonumber(ARGV[1])
if redis.call('EXISTS', k) == 0 then return {-1} end
local content = redis.call('HGET', k, 'content')
local exp = tonumber(redis.call('HGET', k, 'expires_at') or '-1')
local maxv = tonumber(redis.call('HGET', k, 'max_views') or '-1')
if exp >= 0 and now >= exp then
  redis.call('DEL', k)
  return {-1}
end
local remaining = -1
if maxv >= 0 then
  local used = redis.call('HINCRBY', k, 'views', 1)
  if used > maxv then
    redis.call('DEL', k)
    return {-1}
  end
  remaining = maxv - used
end
return {content, tostring(remaining), tostring(exp)}
`;

// A fresh connection per invocation keeps the server stateless for serverless runtimes.
async function withRedis<T>(fn: (c: ReturnType<typeof createClient>) => Promise<T>): Promise<T> {
  const url = process.env.REDIS_URL || process.env.KV_URL;
  if (!url) throw new Error("REDIS_URL is not configured");
  const client = createClient({ url, socket: { connectTimeout: 4000, reconnectStrategy: false } });
  client.on("error", () => {});
  await client.connect();
  try {
    return await fn(client);
  } finally {
    client.disconnect().catch(() => {});
  }
}

export async function ping(): Promise<{ ok: boolean; error?: string }> {
  try {
    const ok = await withRedis(async (c) => (await c.ping()) === "PONG");
    return { ok };
  } catch (e) {
    // Error type/message only; connection strings are never included.
    const err = e as { name?: string; code?: string; message?: string };
    return { ok: false, error: `${err.code ?? err.name ?? "Error"}: ${(err.message ?? "").slice(0, 120)}` };
  }
}

export async function createPaste(
  id: string,
  p: { content: string; ttl_seconds?: number; max_views?: number },
  now: number
): Promise<void> {
  await withRedis(async (c) => {
    const fields: Record<string, string> = {
      content: p.content,
      views: "0",
      expires_at: p.ttl_seconds ? String(now + p.ttl_seconds * 1000) : "-1",
      max_views: p.max_views ? String(p.max_views) : "-1",
    };
    const multi = c.multi().hSet(key(id), fields);
    if (p.ttl_seconds) {
      // Housekeeping only; real expiry is decided by the (possibly mocked) clock in the script.
      // Generous margin so mocked "future" clocks in tests still find the key.
      multi.expire(key(id), p.ttl_seconds + 60 * 60 * 24 * 30);
    }
    await multi.exec();
  });
}

export async function fetchPaste(id: string, now: number): Promise<FetchResult> {
  return withRedis(async (c) => {
    const res = (await c.eval(FETCH_SCRIPT, { keys: [key(id)], arguments: [String(now)] })) as unknown[];
    if (!res || res[0] === -1) return { ok: false } as const;
    const remaining = Number(res[1]);
    const exp = Number(res[2]);
    return {
      ok: true,
      content: String(res[0]),
      remaining_views: remaining >= 0 ? remaining : null,
      expires_at: exp >= 0 ? new Date(exp).toISOString() : null,
    } as const;
  });
}
