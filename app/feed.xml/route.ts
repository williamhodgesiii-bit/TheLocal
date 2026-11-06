import { BRAND, MANTRA, NEWSLETTER } from "@/lib/brand";
import { SPOTS, SPOT_BY_ID } from "@/lib/data";
import { SLOTS, letterFor, thursdayOf, weekLabel } from "@/lib/letter";
import { latestReviews, letterRow } from "@/lib/live";
import { siteUrl } from "@/lib/site";
import { getThe } from "@/lib/seo";
import { letterWeeks } from "@/lib/weeks";

export const revalidate = 900;

const x = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * The site as a feed (RSS 2.0): every Thursday Plate and the newest reviews. Feed readers, news
 * apps and AI crawlers pick up what's new here without waiting for a crawl.
 */
export async function GET() {
  const base = siteUrl();
  const now = thursdayOf(new Date());
  const weeks = letterWeeks().slice(0, 8);
  const [rows, reviews] = await Promise.all([Promise.all(weeks.map((w) => letterRow(w))), latestReviews(25)]);
  type Item = { title: string; link: string; guid: string; date: Date; body: string };
  const items: Item[] = [];
  weeks.forEach((w, i) => {
    const l = letterFor(w, SPOTS, rows[i]);
    const picks = SLOTS.flatMap((s) => (l.picks[s.id] ? [{ slot: s, spot: l.picks[s.id]! }] : []));
    const link = `${base}${w === now ? "/thursday" : `/thursday/${w}`}`;
    items.push({
      title: `${NEWSLETTER}, ${weekLabel(w, { month: "long", day: "numeric" })}: ${picks.map((p) => p.spot.name).join(", ")}`,
      link,
      guid: `${base}/thursday/${w}`,
      date: new Date(`${w}T13:00:00Z`),
      body: picks.map((p) => `<p><b>${x(p.slot.label)}: <a href="${base}/spot/${p.spot.id}">${x(p.spot.name)}</a></b>. ${x(getThe(p.spot.knownFor))}. ${x(p.spot.blurb)}</p>`).join(""),
    });
  });
  for (const r of reviews) {
    const s = SPOT_BY_ID[r.spotId];
    if (!s) continue;
    items.push({
      title: `${r.author} on ${s.name}: ${r.rating} out of 5`,
      link: `${base}/spot/${s.id}`,
      guid: `${base}/spot/${s.id}#review-${r.id}`,
      date: new Date(r.at),
      body: `<p>${x(r.body)}</p><p>${x(s.name)}, ${x(s.knownFor)}.</p>`,
    });
  }
  items.sort((a, b) => b.date.getTime() - a.date.getTime());
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${x(BRAND)}</title>
<link>${base}</link>
<atom:link href="${base}/feed.xml" rel="self" type="application/rss+xml"/>
<description>${x(`${MANTRA} ${NEWSLETTER} every week, and the newest reviews of Birmingham's locally owned restaurants, coffee shops and bars.`)}</description>
<language>en-us</language>
<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
<image><url>${base}/icon-512.png</url><title>${x(BRAND)}</title><link>${base}</link></image>
${items
  .slice(0, 40)
  .map(
    (it) => `<item>
<title>${x(it.title)}</title>
<link>${x(it.link)}</link>
<guid isPermaLink="${it.guid.includes("#") ? "false" : "true"}">${x(it.guid)}</guid>
<pubDate>${it.date.toUTCString()}</pubDate>
<description><![CDATA[${it.body}]]></description>
</item>`
  )
  .join("\n")}
</channel>
</rss>`;
  return new Response(xml, {
    headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, s-maxage=900, stale-while-revalidate=3600" },
  });
}
