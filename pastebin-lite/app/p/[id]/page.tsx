import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { fetchPaste } from "@/lib/store";
import { nowMs } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function PastePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const h = await headers();
  let r;
  try {
    r = await fetchPaste(id, nowMs(h));
  } catch {
    r = { ok: false } as const;
  }
  if (!r.ok) notFound();
  // React escapes text children, so content is never interpreted as HTML/script.
  return (
    <div>
      <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", background: "#f5f5f5", padding: 12 }}>
        {r.content}
      </pre>
      <p style={{ color: "#555" }}>
        {r.remaining_views !== null && <>Remaining views: {r.remaining_views}. </>}
        {r.expires_at && <>Expires at {r.expires_at}.</>}
      </p>
    </div>
  );
}
