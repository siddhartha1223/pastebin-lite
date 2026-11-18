# Pastebin Lite

A small Pastebin-like app built with Next.js (App Router). Create a text paste, get a shareable link, and view it. Pastes can optionally expire after a number of seconds (TTL) and/or after a maximum number of views.

## Run locally

Requirements: Node 18+ and a Redis instance.

```bash
npm install
cp .env.example .env.local   # set REDIS_URL
npm run dev                  # or: npm run build && npm start
```

Then open the URL printed by Next.js (port 3000 by default).

Environment variables:

| Name | Purpose |
|------|---------|
| `REDIS_URL` | Redis connection string (Upstash, Redis Cloud, a local `redis-server`, ...) |
| `TEST_MODE` | If `1`, the `x-test-now-ms` request header is used as "now" for expiry logic only |

## Deploy (Vercel)

Import the repo, add a Redis database from the Vercel Marketplace (e.g. Upstash Redis) or set `REDIS_URL` manually, and deploy. No migrations or shell access needed.

## Persistence layer

Redis. Each paste is a Redis hash (`paste:<id>`) holding `content`, `views`, `max_views` and `expires_at`. Redis survives across serverless invocations, unlike in-memory storage.

## Design decisions

- **Atomic view counting.** Fetching a paste runs a single Lua script that checks expiry, increments the view counter and enforces `max_views` in one step, so concurrent requests can never exceed the limit and `remaining_views` never goes negative.
- **Stateless server.** No module-level mutable state; a Redis connection is opened per invocation, which suits serverless.
- **Deterministic time.** With `TEST_MODE=1`, `x-test-now-ms` overrides the clock for expiry. Expiry is evaluated against stored `expires_at`, not Redis key TTL (a long Redis TTL is only used for cleanup).
- **Safe rendering.** `/p/:id` renders content as an escaped React text node inside `<pre>`; no HTML or scripts from pastes are ever interpreted.
- **Consistent 404s.** Missing, expired and exhausted pastes all return 404 (JSON for the API, HTML page for `/p/:id`). Both the API fetch and the HTML view count as a view.
- **Health check.** `GET /api/healthz` returns `{"ok": true|false}` with HTTP 200 depending on whether Redis answers a `PING`.

## API

- `GET /api/healthz`
- `POST /api/pastes` — `{ "content": string, "ttl_seconds"?: int>=1, "max_views"?: int>=1 }` → `201 { id, url }`; invalid input → `400 { error }`
- `GET /api/pastes/:id` → `200 { content, remaining_views, expires_at }` or `404 { error }`
- `GET /p/:id` — HTML view
