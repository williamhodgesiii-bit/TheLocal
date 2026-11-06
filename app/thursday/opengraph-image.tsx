import { NEWSLETTER } from "@/lib/brand";
import { thursdayOf } from "@/lib/letter";
import { weekAlt, weekImage } from "@/lib/og-cards";
import { OG_SIZE, OG_TYPE } from "@/lib/og";

export const runtime = "nodejs";
export const revalidate = 3600;

export async function generateImageMetadata() {
  const week = thursdayOf(new Date());
  return [{ id: `week-${week}`, size: OG_SIZE, contentType: OG_TYPE, alt: weekAlt(week) }];
}

export default function Image() {
  return weekImage(thursdayOf(new Date()), { title: NEWSLETTER, foot: "theplatenextdoor.com/thursday" });
}
