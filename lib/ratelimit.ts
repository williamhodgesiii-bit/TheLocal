// Best-effort, per-instance throttle for routes that call paid upstream APIs.
const hits = new Map<string, { n: number; t: number }>();

export function rateLimited(req: Request, bucket: string, max: number, windowMs = 10 * 60_000) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const h = hits.get(key);
  if (!h || now - h.t > windowMs) {
    hits.set(key, { n: 1, t: now });
    if (hits.size > 5000) hits.clear();
    return false;
  }
  return ++h.n > max;
}
