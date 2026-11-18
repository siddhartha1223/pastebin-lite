/** Current time in ms. Honours x-test-now-ms only when TEST_MODE=1. */
export function nowMs(headers: Headers): number {
  if (process.env.TEST_MODE === "1") {
    const h = headers.get("x-test-now-ms");
    if (h && /^\d+$/.test(h.trim())) return Number(h);
  }
  return Date.now();
}
