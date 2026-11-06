import { BEST_GUIDES, PLACE_GUIDES, hrefOf, publishable } from "@/lib/guides";
import { localClock, thursdayOf } from "@/lib/letter";
import { lastActivity } from "@/lib/live";
import { siteUrl } from "@/lib/site";

/**
 * Daily: tell Bing (whose index ChatGPT search reads), Yandex and the other IndexNow engines which
 * pages changed since yesterday, so a new review or a new Thursday Plate shows up in hours, not
 * weeks. Google doesn't take IndexNow; it reads the sitemap's honest lastmod dates instead.
 *
 * Sends only what changed: places with a new review or photo in the last 26 hours, the guides
 * they're in, and on Thursdays the week's page. Set CRON_SECRET in Vercel and only Vercel can call it.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** public on purpose: IndexNow checks that this same key is served at /<key>.txt */
const KEY = process.env.INDEXNOW_KEY || "45c4878c9c60706ce2d60d079da711bc";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Not allowed" }, { status: 401 });
  const base = siteUrl();
  if (!base.startsWith("https://www.theplatenextdoor.com") && !process.env.NEXT_PUBLIC_SITE_URL) return Response.json({ skipped: "not the live site" });

  const since = new Date(Date.now() - 26 * 3600 * 1000).toISOString();
  const activity = await lastActivity();
  const changed = Object.entries(activity)
    .filter(([, at]) => at >= since)
    .map(([id]) => id);
  const urls = new Set<string>(changed.map((id) => `${base}/spot/${id}`));
  if (changed.length) {
    urls.add(`${base}/`);
    for (const g of [...BEST_GUIDES, ...PLACE_GUIDES].filter(publishable)) if (g.spots().some((s) => changed.includes(s.id))) urls.add(`${base}${hrefOf(g)}`);
  }
  // Thursday: the new letter, the front page and the feed
  if (localClock(new Date()).day === 4) {
    urls.add(`${base}/thursday`);
    urls.add(`${base}/`);
    urls.add(`${base}/feed.xml`);
    const last = thursdayOf(new Date(Date.now() - 7 * 86400 * 1000));
    urls.add(`${base}/thursday/${last}`);
  }
  if (!urls.size) return Response.json({ sent: 0, note: "nothing changed" });

  const host = new URL(base).host;
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host, key: KEY, keyLocation: `${base}/${KEY}.txt`, urlList: [...urls].slice(0, 10000) }),
    signal: AbortSignal.timeout(15000),
  }).catch((e: Error) => ({ ok: false, status: 0, statusText: e.message }) as const);
  return Response.json({ sent: urls.size, status: res.status, ok: res.ok, urls: [...urls] });
}
