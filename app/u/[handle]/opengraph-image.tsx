import { memberImage } from "@/lib/og-cards";
import { OG_SIZE, OG_TYPE } from "@/lib/og";

export const runtime = "nodejs";
export const revalidate = 3600;

export async function generateImageMetadata({ params }: { params: { handle: string } }) {
  return [{ id: "card", size: OG_SIZE, contentType: OG_TYPE, alt: `@${params.handle.toLowerCase()}'s Plate Passport on The Plate Next Door` }];
}

export default function Image({ params }: { params: { handle: string } }) {
  return memberImage(params.handle.toLowerCase());
}
