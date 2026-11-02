import { NextResponse } from "next/server";
import { readGoogleCache } from "@/lib/googleBudget";

/**
 * Exact pins, closures and each place's first photo from Google, as last looked up by the
 * weekly job (app/api/pins/refresh). This only reads what's saved: a visitor never causes a
 * Google call.
 */
export const dynamic = "force-dynamic";

export type GoogleBody = { enabled: true; pins: Record<string, [number, number]>; closed: string[]; photos: Record<string, { name: string; author: string }> };
const OFF = { enabled: false, pins: {}, closed: [], photos: {} };

export async function GET() {
  if (!process.env.GOOGLE_PLACES_API_KEY) return NextResponse.json(OFF);
  const saved = await readGoogleCache<GoogleBody>("pins");
  if (!saved) return NextResponse.json(OFF, { headers: { "Cache-Control": "public, s-maxage=900" } });
  return NextResponse.json(saved.body, { headers: { "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400" } });
}
