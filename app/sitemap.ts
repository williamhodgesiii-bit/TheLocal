import type { MetadataRoute } from "next";
import { SPOTS } from "@/lib/data";
import { OPEN_CITIES, cityPath } from "@/lib/regions";
import { siteUrl } from "@/lib/site";
import { fetchCommunitySpotIds } from "@/lib/server-spots";
import { BEST_GUIDES, PLACE_GUIDES, hrefOf, publishable } from "@/lib/guides";
import { weekStart } from "@/lib/collections";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const week = weekStart(new Date()); // this week's Thursday — bumps freshness weekly
  const community = await fetchCommunitySpotIds();
  const guides = [...BEST_GUIDES, ...PLACE_GUIDES].filter(publishable);

  const entries: MetadataRoute.Sitemap = [
    ...OPEN_CITIES.map((c) => ({ url: `${base}${cityPath(c)}`, lastModified: week, changeFrequency: "daily" as const, priority: 1 })),
    { url: `${base}/best`, lastModified: week, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/neighborhood`, lastModified: week, changeFrequency: "weekly", priority: 0.9 },
    ...guides.map((g) => ({ url: `${base}${hrefOf(g)}`, lastModified: week, changeFrequency: "weekly" as const, priority: 0.8 })),
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/partners`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/credits`, changeFrequency: "monthly", priority: 0.2 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    ...[...SPOTS.map((s) => s.id), ...community].map((id) => ({ url: `${base}/spot/${id}`, lastModified: week, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];

  // de-dupe by URL (Birmingham's city path is "/", same as the home page)
  const seen = new Set<string>();
  return entries.filter((e) => (seen.has(e.url) ? false : (seen.add(e.url), true)));
}
