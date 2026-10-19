// Temporary, read-only: which of our places sell gift cards online, read from their own websites.
// Websites come from OpenStreetMap; each homepage (and its gift card page) is opened and read.
import { mkdir, readFile, writeFile } from "node:fs/promises";

const places = JSON.parse(await readFile("probe/places.json", "utf8"));
const UA = "Mozilla/5.0 (compatible; ThePlateNextDoor-check/1.0; +https://www.theplatenextdoor.com/about)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, ms = 20000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { redirect: "follow", signal: c.signal, headers: { "user-agent": UA, accept: "text/html,*/*" } });
    const text = (r.headers.get("content-type") ?? "").includes("html") || (r.headers.get("content-type") ?? "").includes("text") ? await r.text() : "";
    return { status: r.status, url: r.url, text };
  } catch (e) {
    return { status: 0, url, text: "", err: String(e.message ?? e).slice(0, 80) };
  } finally {
    clearTimeout(t);
  }
}
const title = (t) => t.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim().slice(0, 120) ?? null;
const textOf = (t) => t.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ");
const POS = /toasttab\.com|squareup\.com\/gift|square\.link|squareup\.com\/store|\.square\.site|giftup\.(app|com)|app\.giftup|spoton|clover\.com|yiftee|giftfly|egift|gift-card|giftcard|gift_card|giftcertificate|gift-certificate|paytronix|givex|mobo|nbo|tango|revelsystems|lightspeed|shopify/i;
function links(html, base) {
  const out = [];
  for (const m of html.matchAll(/<a\b[^>]*?href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let href;
    try {
      href = new URL(m[1].replace(/&amp;/g, "&"), base).href;
    } catch {
      continue;
    }
    out.push({ href, text: m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 60) });
  }
  for (const m of html.matchAll(/<iframe\b[^>]*src\s*=\s*["']([^"']+)["']/gi)) out.push({ href: m[1], text: "(iframe)" });
  if (/giftup/i.test(html)) out.push({ href: "giftup-embed", text: html.match(/data-site-id\s*=\s*["']([^"']+)/i)?.[1] ?? "(Gift Up! script on page)" });
  return out;
}
const isGift = (l) => /gift/i.test(l.href) || /gift/i.test(l.text);

// 1. OpenStreetMap: eating and drinking places in the area, with their websites
const BB = "33.15,-87.10,33.65,-86.55";
const oq = `[out:json][timeout:120];(nwr["amenity"~"^(restaurant|cafe|bar|pub|fast_food|ice_cream|biergarten|food_court)$"](${BB});nwr["shop"~"^(bakery|coffee|deli|wine|alcohol|butcher|confectionery|pastry|tea)$"](${BB});nwr["craft"~"^(brewery|winery|distillery)$"](${BB}););out tags center;`;
let osm = [];
const osmLog = [];
for (const ep of ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]) {
  try {
    const r = await fetch(ep + "?data=" + encodeURIComponent(oq), { headers: { "user-agent": UA } });
    const t = await r.text();
    osmLog.push(`${ep} ${r.status} ${t.length} ${t.slice(0, 120).replace(/\s+/g, " ")}`);
    if (r.ok && t.startsWith("{")) {
      osm = JSON.parse(t).elements ?? [];
      if (osm.length) break;
    }
  } catch (e) {
    osmLog.push(`${ep} error ${e.message}`);
  }
}
const norm = (s) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/&/g, " and ").replace(/['’`.]/g, "").replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|restaurant|bar|cafe|grill|kitchen|co|company|birmingham|bhm|al)\b/g, " ").replace(/\s+/g, " ").trim();
const dist = (a, b) => {
  const R = 6371e3, r = Math.PI / 180;
  const x = (b[1] - a[1]) * r * Math.cos(((a[0] + b[0]) / 2) * r), y = (b[0] - a[0]) * r;
  return Math.sqrt(x * x + y * y) * R;
};
const osmRows = osm
  .map((e) => ({ name: e.tags?.name, n: norm(e.tags?.name), at: e.center ? [e.center.lat, e.center.lon] : [e.lat, e.lon], site: e.tags?.website || e.tags?.["contact:website"] || e.tags?.url || null, brand: e.tags?.brand ?? null }))
  .filter((e) => e.name && e.at[0]);
const res = { osmCount: osmRows.length, osmLog, places: {}, verify: {} };
for (const p of places) {
  const pn = norm(p.name);
  let best = null;
  for (const o of osmRows) {
    const d = Math.min(...p.pts.map((pt) => dist(pt, o.at)));
    const nameHit = o.n && pn && (o.n === pn || (pn.length >= 4 && o.n.includes(pn)) || (o.n.length >= 4 && pn.includes(o.n)));
    if (nameHit && d < 800 && (!best || d < best.d)) best = { ...o, d: Math.round(d) };
  }
  res.places[p.id] = { osm: best ? { name: best.name, d: best.d, site: best.site } : null };
}

// 2. Each website: does it link to a gift card page, and where does that page send you to buy?
const queue = places.filter((p) => res.places[p.id].osm?.site || p.website);
async function check(p) {
  let site = p.website || res.places[p.id].osm.site;
  if (!/^https?:/i.test(site)) site = "https://" + site;
  const home = await get(site);
  const row = { site, status: home.status, final: home.url, title: title(home.text), err: home.err };
  if (!home.text) return (res.places[p.id].web = row);
  const ls = links(home.text, home.url);
  const gifts = ls.filter(isGift);
  row.giftLinks = [...new Map(gifts.map((l) => [l.href, l])).values()].slice(0, 6);
  row.mentions = /gift\s*cards?|e-?gift|gift certificates?/i.test(textOf(home.text));
  row.toast = [...new Set(ls.map((l) => l.href).filter((h) => /toasttab\.com/i.test(h)))].slice(0, 4);
  // one step further: an on-site gift card page usually holds the real buy link
  const sub = row.giftLinks.find((l) => { try { return new URL(l.href).host === new URL(home.url).host; } catch { return false; } });
  if (sub) {
    const g = await get(sub.href);
    const gl = links(g.text, g.url).filter((l) => POS.test(l.href) && isGift(l));
    row.giftPage = { url: sub.href, status: g.status, title: title(g.text), buy: [...new Map(gl.map((l) => [l.href, l])).values()].slice(0, 5), text: (textOf(g.text).match(/.{0,120}gift.{0,160}/i)?.[0] ?? "").slice(0, 280) };
  }
  res.places[p.id].web = row;
}
for (let i = 0; i < queue.length; i += 6) {
  await Promise.all(queue.slice(i, i + 6).map(check));
  await sleep(300);
}

// 3. Pages the researchers found in search results, opened for real; plus Toast's gift card page for each Toast shop seen
const toastSlugs = new Set(["paper-doll", "pizza-grace", "the-essential-2215-1st-avenue-north", "b&tdowntown", "paramount-195-oxmoor-rd-ste-101", "surf-hound-2721-cahaba-road", "abhi-eatery-and-bar-2721-cahaba-rd", "carriganspub", "carrigansmtnbrook", "current-charcoal-grill", "helen"]);
for (const p of Object.values(res.places)) for (const h of p.web?.toast ?? []) {
  const m = h.match(/toasttab\.com\/(?:local\/order\/|online\/|local\/)?([^/?#]+)/i);
  if (m && !/^(local|order|online|restaurants|login)$/i.test(m[1])) toastSlugs.add(decodeURIComponent(m[1]));
}
const verify = [
  "https://squareup.com/gift/0CB4VEJKT2DQR/order",
  "https://squareup.com/gift/6C9MA0MG52AJN/order",
  "https://www.toasttab.com/brick-tin/giftcards",
  "https://www.toasttab.com/paramount-birmingham-200-20th-st-n/giftcards",
  "https://charbar7.com/gift-cards",
  "https://yomamasmeals.square.site/",
  "https://www.toasttab.com/automatic-seafood-and-oysters/giftcards",
  "https://www.toasttab.com/saw-s-soul-kitchen/giftcards",
  "https://www.ovenbirdrestaurant.com/store",
  ...[...toastSlugs].map((s) => `https://www.toasttab.com/${encodeURIComponent(s)}/giftcards`),
];
for (const u of [...new Set(verify)]) {
  let g = await get(u);
  for (let k = 0; k < 2 && g.status === 403; k++) {
    await sleep(6000);
    g = await get(u.replace("https://www.toasttab.com/", "https://order.toasttab.com/egiftcards/").replace(/\/giftcards$/, ""));
    if (g.status === 403) g = await get(u);
  }
  const t = textOf(g.text);
  res.verify[u] = { status: g.status, final: g.url, title: title(g.text), unavailable: /unavailable|not (currently )?available|no longer/i.test(t), snippet: (t.match(/.{0,80}gift.{0,140}/i)?.[0] ?? t.slice(0, 160)).slice(0, 220), giftFlags: (g.text.match(/"(giftCard[A-Za-z]*|isGiftCard[A-Za-z]*|egift[A-Za-z]*)"\s*:\s*(true|false)/gi) ?? []).slice(0, 6) };
  await sleep(2500);
}
await mkdir("probe", { recursive: true });
await writeFile("probe/commons.json", JSON.stringify(res, null, 1));
const withSite = Object.values(res.places).filter((p) => p.web).length;
console.log(`osm ${res.osmCount}, matched ${Object.values(res.places).filter((p) => p.osm).length}, sites ${withSite}`);
