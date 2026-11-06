import { thursdayOf } from "@/lib/letter";
import { weekAlt, weekImage } from "@/lib/og-cards";
import { OG_SIZE, OG_TYPE } from "@/lib/og";

export const runtime = "nodejs";
export const revalidate = 3600;

/** the front page's card shows this week's three, so it's new every Thursday */
export async function generateImageMetadata() {
  // the address changes with the week, so apps that keep old previews fetch the new picture
  const week = thursdayOf(new Date());
  return [{ id: `week-${week}`, size: OG_SIZE, contentType: OG_TYPE, alt: weekAlt(week) }];
}

export default function Image() {
  return weekImage();
}
