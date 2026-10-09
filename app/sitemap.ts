import type { MetadataRoute } from "next";
import { SPOTS } from "@/lib/data";
import { OPEN_CITIES, cityPath } from "@/lib/regions";
import { siteUrl } from "@/lib/site";
import { fetchCommunitySpotIds } from "@/lib/server-spots";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const community = await fetchCommunitySpotIds();
  return [
    ...OPEN_CITIES.map((c) => ({ url: `${base}${cityPath(c)}`, changeFrequency: "daily" as const, priority: 1 })),
    { url: `${base}/partners`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/credits`, changeFrequency: "monthly", priority: 0.2 },
    ...[...SPOTS.map((s) => s.id), ...community].map((id) => ({ url: `${base}/spot/${id}`, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
