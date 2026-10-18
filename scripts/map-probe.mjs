// Temporary, read-only: check the live database has the review update, using the site's
// public (publishable) key from its own JavaScript. Only status codes are saved, never the key.
import { mkdir, writeFile } from "node:fs/promises";
const SB = "https://wylpbzopmpqaahtbkvkn.supabase.co";
const out = { key: false, checks: {} };
const site = "https://www.theplatenextdoor.com";
const html = await (await fetch(site)).text();
let key = null;
for (const c of [...new Set([...html.matchAll(/\/_next\/static\/[^"']+\.js/g)].map((m) => m[0]))]) {
  const js = await (await fetch(new URL(c, site))).text();
  if (!js.includes("wylpbzopmpqaahtbkvkn")) continue;
  key = js.match(/sb_publishable_[A-Za-z0-9_-]{20,}/)?.[0] ?? js.match(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/)?.[0] ?? null;
  if (key) break;
}
out.key = !!key;
const get = async (name, path) => {
  const r = await fetch(`${SB}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  const t = await r.text();
  out.checks[name] = { status: r.status, note: r.ok ? `rows: ${(() => { try { return JSON.parse(t).length; } catch { return "?"; } })()}` : t.slice(0, 160) };
};
if (key) {
  await get("reviews new columns", "reviews?select=id,go_back,ordered,good_for,visited_on,status&limit=1");
  await get("ratings with go-back share", "spot_ratings?select=spot_id,go_back_pct&limit=1");
  await get("helpful counts", "review_helpful?select=review_id,helpful&limit=1");
  await get("reviewer totals", "reviewer_totals?select=user_id,reviews&limit=1");
}
await mkdir("probe", { recursive: true });
await writeFile("probe/commons.json", JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
