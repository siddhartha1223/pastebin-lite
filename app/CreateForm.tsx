"use client";
import { useState } from "react";

export default function CreateForm() {
  const [content, setContent] = useState("");
  const [ttl, setTtl] = useState("");
  const [views, setViews] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUrl(null);
    const body: Record<string, unknown> = { content };
    if (ttl.trim()) body.ttl_seconds = Number(ttl);
    if (views.trim()) body.max_views = Number(views);
    setBusy(true);
    try {
      const res = await fetch("/api/pastes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Something went wrong");
      else setUrl(data.url);
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={10}
        placeholder="Paste your text here"
        style={{ width: "100%", fontFamily: "monospace" }}
      />
      <label>
        Expire after (seconds, optional){" "}
        <input type="number" min={1} step={1} value={ttl} onChange={(e) => setTtl(e.target.value)} />
      </label>
      <label>
        Max views (optional){" "}
        <input type="number" min={1} step={1} value={views} onChange={(e) => setViews(e.target.value)} />
      </label>
      <button type="submit" disabled={busy} style={{ width: 160, padding: 8 }}>
        {busy ? "Creating…" : "Create paste"}
      </button>
      {error && <p role="alert" style={{ color: "#b00020" }}>Error: {error}</p>}
      {url && (
        <p>
          Share link: <a href={url}>{url}</a>
        </p>
      )}
    </form>
  );
}
