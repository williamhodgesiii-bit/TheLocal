import { NEWSLETTER } from "@/lib/brand";
import { weekAlt, weekImage } from "@/lib/og-cards";
import { OG_SIZE, OG_TYPE } from "@/lib/og";
import { isLetterWeek } from "@/lib/weeks";

export const runtime = "nodejs";
export const revalidate = 86400;

export async function generateImageMetadata({ params }: { params: { week: string } }) {
  return [{ id: "week", size: OG_SIZE, contentType: OG_TYPE, alt: isLetterWeek(params.week) ? weekAlt(params.week) : NEWSLETTER }];
}

export default function Image({ params }: { params: { week: string } }) {
  return weekImage(isLetterWeek(params.week) ? params.week : undefined, { title: NEWSLETTER, foot: `theplatenextdoor.com/thursday/${params.week}` });
}
