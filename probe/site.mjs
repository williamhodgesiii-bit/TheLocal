// Read-only: the Friends feed and search, called the way the app calls them.
const SITE = "https://www.theplatenextdoor.com";
const out = (k, v) => console.log(`${k.padEnd(30)} ${v}`);
const html = await (await fetch(`${SITE}/`)).text();
const chunks = [...new Set([...html.matchAll(/\/_next\/static\/chunks\/[^"']+\.js/g)].map((m) => m[0]))];
let url = "", key = "";
for (const c of chunks) {
  const js = await (await fetch(SITE + c)).text();
  url ||= js.match(/https:\/\/[a-z0-9]{20}\.supabase\.co/)?.[0] ?? "";
  key ||= js.match(/sb_publishable_[A-Za-z0-9_-]{20,}/)?.[0] ?? js.match(/eyJhbGciOi[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]*cm9sZSI6ImFub24i[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+/)?.[0] ?? "";
  if (url && key) break;
}
const H = { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json" };
const rpc = async (fn, body) => {
  const r = await fetch(`${url}/rest/v1/rpc/${fn}`, { method: "POST", headers: H, body: JSON.stringify(body) });
  const t = await r.text();
  let n = "";
  try { n = ` (${JSON.parse(t).length} rows)`; } catch {}
  return `${r.status}${n} ${t.slice(0, 160)}`;
};
out("rpc feed everyone", await rpc("feed", { scope: "everyone", before_at: null, before_id: null, lim: 5 }));
out("rpc suggested_members", await rpc("suggested_members", {}));
for (const q of ["wi", "la", "an"]) out(`rpc search_members "${q}"`, await rpc("search_members", { q, lim: 5 }));
const m = await fetch(`${url}/rest/v1/members?select=id,handle&limit=3`, { headers: { ...H, Prefer: "count=exact" } });
out("members (public columns)", `${m.status} total=${m.headers.get("content-range")} ${(await m.text()).slice(0, 160)}`);
const h = await (await fetch(`${SITE}/api/health`)).json();
out("health", JSON.stringify(h));
