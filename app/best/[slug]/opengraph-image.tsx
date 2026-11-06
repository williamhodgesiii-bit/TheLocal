import { notFound } from "next/navigation";
import { BEST_BY_SLUG, hrefOf } from "@/lib/guides";
import { guideAlt, guideImage } from "@/lib/og-cards";
import { OG_SIZE, OG_TYPE } from "@/lib/og";

export const runtime = "nodejs";
export const revalidate = 86400;

export async function generateImageMetadata({ params }: { params: { slug: string } }) {
  const g = BEST_BY_SLUG[params.slug];
  return [{ id: "card", size: OG_SIZE, contentType: OG_TYPE, alt: g ? guideAlt(g) : "A guide on The Plate Next Door" }];
}

export default function Image({ params }: { params: { slug: string } }) {
  const g = BEST_BY_SLUG[params.slug];
  if (!g) notFound();
  return guideImage(g, hrefOf(g));
}
