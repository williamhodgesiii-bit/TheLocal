import type { MetadataRoute } from "next";
import { SPOTS } from "@/lib/data";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/partners`, changeFrequency: "monthly", priority: 0.6 },
    ...SPOTS.map((s) => ({ url: `${base}/spot/${s.id}`, changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
