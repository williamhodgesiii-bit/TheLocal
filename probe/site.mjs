// A full check of the live site after setup. Reads only, except one call to /api/notify,
// which emails the team about new places and photos waiting to be checked (what it's for).
const SITE = "https://www.theplatenextdoor.com";
const WANT = "255e376";
const out = (k, v) => console.log(`${k.padEnd(30)} ${v}`);
const get = async (u, init) => {
  try {
    const r = await fetch(u, init);
    return { status: r.status, text: await r.text(), headers: r.headers };
  } catch (e) {
    return { status: 0, text: String(e.message), headers: new Headers() };
  }
};

// 1. wait for the new deploy
let h = {};
for (let i = 0; i < 20; i++) {
  h = JSON.parse((await get(`${SITE}/api/health`)).text || "{}");
  if (h.version === WANT) break;
  console.log(`live version ${h.version ?? "(old)"}, waiting for ${WANT}`);
  await new Promise((r) => setTimeout(r, 30000));
}
out("HEALTH", JSON.stringify(h));

// 2. pages
for (const p of ["/", "/spot/caveat-coffee", "/spot/slice-pizza", "/friends", "/admin", "/privacy", "/me"]) {
  const r = await get(SITE + p);
  out(`page ${p}`, `${r.status}${p === "/" ? (r.text.includes("This week") ? " (this week's three on it)" : " (no week block in HTML)") : ""}`);
}

// 3. the database, as anyone sees it
const html = (await get(`${SITE}/`)).text;
const chunks = [...new Set([...html.matchAll(/\/_next\/static\/chunks\/[^"']+\.js/g)].map((m) => m[0]))];
let url = "", key = "";
for (const c of chunks) {
  const js = (await get(SITE + c)).text;
  url ||= js.match(/https:\/\/[a-z0-9]{20}\.supabase\.co/)?.[0] ?? "";
  key ||= js.match(/sb_publishable_[A-Za-z0-9_-]{20,}/)?.[0] ?? js.match(/eyJhbGciOi[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]*cm9sZSI6ImFub24i[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+/)?.[0] ?? "";
  if (url && key) break;
}
if (url && key) {
  const H = { apikey: key, authorization: `Bearer ${key}` };
  for (const t of ["members", "follows", "review_comments", "notifications", "activities", "gift_clicks", "banned_terms", "push_tokens", "handle_history", "letters", "photos", "spots", "reviews"]) {
    const r = await get(`${url}/rest/v1/${t}?select=*&limit=1`, { headers: { ...H, Prefer: "count=exact" } });
    out(`table ${t}`, `${r.status} ${r.status < 300 ? `ok, ${r.headers.get("content-range")?.split("/")[1] ?? "?"} visible` : r.text.slice(0, 110)}`);
  }
  for (const [fn, body] of [["feed", { scope: "everyone", before: null, lim: 1 }], ["search_members", { q: "a" }], ["has_banned_word", { t: "hello" }]]) {
    const r = await get(`${url}/rest/v1/rpc/${fn}`, { method: "POST", headers: { ...H, "content-type": "application/json" }, body: JSON.stringify(body) });
    out(`rpc ${fn}`, `${r.status} ${r.text.slice(0, 90)}`);
  }
  for (const [t, col] of [["review_votes", "kind"], ["notifications", "pushed_at"], ["photos", "review_id,featured_at,notified_at"], ["subscribers", "last_letter"], ["submissions", "notified_at"]]) {
    const r = await get(`${url}/rest/v1/${t}?select=${col}&limit=1`, { headers: H });
    out(`column ${t}.${col}`, `${r.status} ${r.text.slice(0, 100)}`);
  }
} else out("supabase", "couldn't find the public key in the page");

// 4. the server side (needs the keys from the integrations)
const view = await get(`${SITE}/api/letter`);
out("letter view", `${view.status} slots:${["Fine dining", "Casual", "Wildcard"].every((x) => view.text.includes(x))} address:${view.text.includes("212 Rockaway Road")} picks: ${(view.text.match(/<h2[^>]*><a[^>]*>([^<]+)</g) || []).map((m) => m.replace(/.*>/, "")).join(" | ")}`);
const cron = await get(`${SITE}/api/letter/cron`);
out("letter daily job (Sunday)", `${cron.status} ${cron.text.slice(0, 200)}`);
const desk = await get(`${SITE}/api/letter/desk`);
out("letter desk, signed out", `${desk.status} ${desk.text.slice(0, 160)}`);
const del = await get(`${SITE}/api/account/delete`, { method: "POST" });
out("account delete, signed out", `${del.status} ${del.text.slice(0, 120)}`);
const uns = await get(`${SITE}/api/letter/unsubscribe?e=x%40example.com&t=nope`);
out("unsubscribe, forged link", `${uns.status}`);
const notify = await get(`${SITE}/api/notify`, { method: "POST" });
out("team emails (notify)", `${notify.status} ${notify.text.slice(0, 160)}`);
const again = await get(`${SITE}/api/notify`, { method: "POST" });
out("team emails, second call", `${again.status} ${again.text.slice(0, 160)}`);
