// Temporary, read-only: what search engines see on the live site, and whether Google Analytics is installed.
import { mkdir, writeFile } from "node:fs/promises";
const S = "https://www.theplatenextdoor.com";
const out = {};
const get = async (p, opt = {}) => { const r = await fetch(S + p, { redirect: "manual", ...opt }); return { r, t: r.status < 300 ? await r.text() : "" }; };
const head = (t) => ({
  title: t.match(/<title>([^<]*)<\/title>/)?.[1],
  description: t.match(/<meta name="description" content="([^"]*)"/)?.[1]?.slice(0, 160),
  canonical: t.match(/<link rel="canonical" href="([^"]*)"/)?.[1],
  robots: t.match(/<meta name="robots" content="([^"]*)"/)?.[1] ?? null,
  ogImage: !!t.match(/<meta property="og:image"/),
  jsonLd: [...t.matchAll(/"@type":"([A-Za-z]+)"/g)].map((m) => m[1]).filter((v, i, a) => a.indexOf(v) === i).slice(0, 12),
  h1: t.match(/<h1[^>]*>(.*?)<\/h1>/)?.[1]?.replace(/<[^>]+>/g, "").slice(0, 80) ?? null,
  words: t.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length,
});
const home = await get("/");
out.home = { status: home.r.status, ...head(home.t), gscMeta: home.t.match(/google-site-verification" content="([^"]{4})/)?.[1] ? "present" : "missing" };
const robots = await get("/robots.txt"); out.robots = robots.t.slice(0, 300);
const sm = await get("/sitemap.xml");
const urls = [...sm.t.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
out.sitemap = { status: sm.r.status, count: urls.length, spots: urls.filter((u) => u.includes("/spot/")).length, guides: urls.filter((u) => /\/best\/|\/neighborhood\//.test(u)).length,
  removedOrMerged: urls.filter((u) => /\/spot\/(eagles|fifes|green-acres|dg|big-spoon-edgewood|cala-coffee-mb|taco-mama-crestline)$/.test(u)), nonWww: urls.filter((u) => !u.startsWith(S)).length };
for (const p of ["/spot/the-battery", "/spot/salice", "/best/bbq", "/best", "/neighborhood/avondale", "/neighborhood"]) {
  const g = await get(p); out[p] = { status: g.r.status, ...head(g.t) };
}
for (const p of ["/spot/big-spoon-edgewood", "/spot/eagles", "/llms.txt", "/45c4878c9c60706ce2d60d079da711bc.txt"]) {
  const g = await get(p); out[p] = { status: g.r.status, location: g.r.headers.get("location"), robots: g.t.match(/<meta name="robots" content="([^"]*)"/)?.[1] ?? null };
}
const apex = await fetch("https://theplatenextdoor.com/spot/salice", { redirect: "manual" }); out.apex = { status: apex.status, to: apex.headers.get("location") };
// Google Analytics: the measurement id is built into the site's JavaScript when NEXT_PUBLIC_GA_ID is set
let ga = null, gtag = false;
for (const c of [...new Set([...home.t.matchAll(/\/_next\/static\/[^"']+\.js/g)].map((m) => m[0]))]) {
  const js = await (await fetch(new URL(c, S))).text();
  ga ??= js.match(/["'`](G-[A-Z0-9]{6,12})["'`]/)?.[1] ?? null;
  if (js.includes("googletagmanager.com/gtag/js")) gtag = true;
}
out.analytics = { measurementId: ga ? ga.slice(0, 4) + "…" : null, gtagLoader: gtag };
await mkdir("probe", { recursive: true });
await writeFile("probe/commons.json", JSON.stringify(out, null, 1));
console.log(JSON.stringify(out));
