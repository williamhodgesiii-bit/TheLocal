// Read-only: what the live site and its database look like right now (public key only).
const SITE = "https://www.theplatenextdoor.com";
const out = (k, v) => console.log(`${k.padEnd(28)} ${v}`);
const h = await fetch(`${SITE}/api/health`).then(async (r) => `${r.status} ${await r.text()}`).catch((e) => `error ${e.message}`);
out("health", h);
const html = await (await fetch(`${SITE}/`)).text();
const chunks = [...new Set([...html.matchAll(/\/_next\/static\/chunks\/[^"']+\.js/g)].map((m) => m[0]))];
let url = "", key = "";
for (const c of chunks) {
  const js = await (await fetch(SITE + c)).text();
  url ||= js.match(/https:\/\/[a-z0-9]{20}\.supabase\.co/)?.[0] ?? "";
  key ||= js.match(/sb_publishable_[A-Za-z0-9_-]{20,}/)?.[0] ?? js.match(/eyJhbGciOi[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]*cm9sZSI6ImFub24i[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+/)?.[0] ?? "";
  if (url && key) break;
}
out("supabase url", url || "not found");
out("public key", key ? `${key.slice(0, 16)}… (found)` : "not found");
if (!url || !key) process.exit(0);
const H = { apikey: key, authorization: `Bearer ${key}` };
for (const t of ["spots", "reviews", "review_votes", "submissions", "members", "follows", "review_comments", "notifications", "activities", "gift_clicks", "banned_terms", "push_tokens", "handle_history"]) {
  const r = await fetch(`${url}/rest/v1/${t}?select=*&limit=1`, { headers: H });
  const b = await r.text();
  out(`table ${t}`, `${r.status} ${r.ok ? `ok (${JSON.parse(b).length} visible row)` : b.slice(0, 120)}`);
}
for (const [fn, body] of [["feed", { scope: "everyone", before: null, lim: 1 }], ["search_members", { q: "a" }], ["save_push_token", { t: "00" }], ["has_banned_word", { t: "hello" }]]) {
  const r = await fetch(`${url}/rest/v1/rpc/${fn}`, { method: "POST", headers: { ...H, "content-type": "application/json" }, body: JSON.stringify(body) });
  out(`rpc ${fn}`, `${r.status} ${(await r.text()).slice(0, 140)}`);
}
// the review_votes kind column (Friends reactions) and notifications.pushed_at
for (const [t, col] of [["review_votes", "kind"], ["notifications", "pushed_at"], ["members", "share_visits"], ["review_comments", "reply_to"]]) {
  const r = await fetch(`${url}/rest/v1/${t}?select=${col}&limit=1`, { headers: H });
  out(`column ${t}.${col}`, `${r.status} ${(await r.text()).slice(0, 120)}`);
}
