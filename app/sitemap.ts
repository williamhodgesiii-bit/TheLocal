import type { MetadataRoute } from "next";
import { SPOTS, SPOT_BY_ID } from "@/lib/data";
import { OPEN_CITIES, cityPath } from "@/lib/regions";
import { siteUrl } from "@/lib/site";
import { fetchCommunitySpotIds } from "@/lib/server-spots";
import { BEST_GUIDES, PLACE_GUIDES, hrefOf, publishable } from "@/lib/guides";
import { thursdayOf } from "@/lib/letter";
import { lastActivity } from "@/lib/live";
import { letterWeeks } from "@/lib/weeks";

export const revalidate = 3600;

/** the day the guide's own list was last checked by hand (bump it when lib/data.ts changes) */
const LIST_CHECKED = "2026-11-03";

/**
 * Every public page, with an honest "last modified": the newest review or photo for a place, the
 * newest change on any place in a guide, and each Thursday Plate's own date. Google only trusts
 * lastmod when it's accurate, so nothing here is set to "now" just to look fresh.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const week = thursdayOf(new Date());
  const [community, activity] = await Promise.all([fetchCommunitySpotIds(), lastActivity()]);
  const guides = [...BEST_GUIDES, ...PLACE_GUIDES].filter(publishable);
  const newest = (ids: string[]) => [LIST_CHECKED, ...ids.map((id) => activity[id]?.slice(0, 10)).filter(Boolean)].sort().pop()!;
  const everything = newest(SPOTS.map((s) => s.id));
  const latest = [week, everything].sort().pop()!;

  const entries: MetadataRoute.Sitemap = [
    ...OPEN_CITIES.map((c) => ({ url: `${base}${cityPath(c)}`, lastModified: latest, changeFrequency: "daily" as const, priority: 1 })),
    { url: `${base}/thursday`, lastModified: week, changeFrequency: "weekly", priority: 0.9 },
    ...letterWeeks()
      .filter((w) => w !== week)
      .map((w) => ({ url: `${base}/thursday/${w}`, lastModified: w, changeFrequency: "yearly" as const, priority: 0.5 })),
    { url: `${base}/best`, lastModified: everything, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/neighborhood`, lastModified: everything, changeFrequency: "weekly", priority: 0.9 },
    ...guides.map((g) => ({ url: `${base}${hrefOf(g)}`, lastModified: newest(g.spots().map((s) => s.id)), changeFrequency: "weekly" as const, priority: 0.8 })),
    { url: `${base}/explore`, lastModified: everything, changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/partners`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/quiz`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/credits`, changeFrequency: "monthly", priority: 0.2 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.2 },
    ...[...SPOTS.map((s) => s.id), ...community].map((id) => ({
      url: `${base}/spot/${id}`,
      lastModified: activity[id]?.slice(0, 10) ?? (SPOT_BY_ID[id] ? LIST_CHECKED : undefined),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];

  // de-dupe by URL (Birmingham's city path is "/", same as the home page)
  const seen = new Set<string>();
  return entries.filter((e) => (seen.has(e.url) ? false : (seen.add(e.url), true)));
}
