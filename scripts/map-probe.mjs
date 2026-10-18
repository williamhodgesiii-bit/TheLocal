// Temporary, read-only: is the live site on the new review code, and did reviews reach the
// database? Reviews are public on the site; only place ids, scores and dates are saved here.
import { mkdir, writeFile } from "node:fs/promises";
const SB = "https://wylpbzopmpqaahtbkvkn.supabase.co";
const site = "https://www.theplatenextdoor.com";
const out = { newReviewCode: false, oldReviewCode: false, chunks: 0, reviews: null, ratings: null, builtAt: null };
const seen = new Set();
let key = null;
for (const p of ["/", "/spot/the-battery"]) {
  const html = await (await fetch(site + p, { headers: { "cache-control": "no-cache" } })).text();
  out.builtAt ??= html.match(/"NEXT_PUBLIC_BUILT_AT"[^0-9]*([0-9]{10,})/)?.[1] ?? null;
  for (const c of [...html.matchAll(/\/_next\/static\/[^"']+\.js/g)].map((m) => m[0])) {
    if (seen.has(c)) continue;
    seen.add(c);
    const js = await (await fetch(new URL(c, site))).text();
    if (js.includes("Would you go back?")) out.newReviewCode = true;
    if (js.includes("What people are saying")) out.oldReviewCode = true;
    if (!key && js.includes("wylpbzopmpqaahtbkvkn")) key = js.match(/sb_publishable_[A-Za-z0-9_-]{20,}/)?.[0] ?? js.match(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/)?.[0] ?? null;
  }
}
out.chunks = seen.size;
if (key) {
  const h = { apikey: key, Authorization: `Bearer ${key}` };
  const r = await fetch(`${SB}/rest/v1/reviews?select=spot_id,rating,created_at,status,go_back&order=created_at.desc&limit=10`, { headers: h });
  out.reviews = { status: r.status, rows: await r.json().catch(() => null) };
  const s = await fetch(`${SB}/rest/v1/spot_ratings?select=*`, { headers: h });
  out.ratings = { status: s.status, rows: await s.json().catch(() => null) };
}
await mkdir("probe", { recursive: true });
await writeFile("probe/commons.json", JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
