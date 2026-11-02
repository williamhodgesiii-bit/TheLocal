import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { SPOT_BY_ID } from "@/lib/data";
import { CITY_BY_ID } from "@/lib/regions";
import { rateLimited } from "@/lib/ratelimit";

/**
 * Google photos for a place that /api/pins doesn't cover (places members added). Asks for the
 * photos field only (Text Search Pro, never Enterprise fields like rating or website), returns
 * up to three photo names (pictures come through /api/cover), and looks each place up at most
 * once a week (Vercel's data cache). Enabled when GOOGLE_PLACES_API_KEY is set on the server.
 */
export const dynamic = "force-dynamic";

type Found = { photos: { name: string; author: string; authorUri: string | null }[] };

const lookUp = unstable_cache(
  async (query: string, key: string): Promise<Found> => {
    const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "places.photos" },
      body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error(`google ${r.status}`); // over the cap: not cached
    const place = (await r.json()).places?.[0];
    return {
      photos: ((place?.photos ?? []) as { name: string; authorAttributions?: { displayName?: string; uri?: string }[] }[])
        .slice(0, 3)
        .map((p) => ({ name: p.name, author: p.authorAttributions?.[0]?.displayName ?? "Google user", authorUri: p.authorAttributions?.[0]?.uri ?? null })),
    };
  },
  ["google-place-photos-v1"],
  { revalidate: 604800 }
);

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const id = params.get("spot") ?? "";
  const spot = SPOT_BY_ID[id] ?? (params.get("name") && params.get("address") ? { name: params.get("name")!.slice(0, 80), address: params.get("address")!.slice(0, 160) } : null);
  const city = CITY_BY_ID[params.get("city") ?? ""] ?? CITY_BY_ID["birmingham-al"];
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!spot) return NextResponse.json({ error: "unknown spot" }, { status: 404 });
  if (!key) return NextResponse.json({ enabled: false, photos: [] }, { headers: cache(86400) });
  if (rateLimited(req, "places", 30)) return NextResponse.json({ enabled: true, photos: [] }, { status: 429 });
  try {
    const found = await lookUp(`${spot.name}, ${spot.address}, ${city.name}, ${city.state}`, key);
    return NextResponse.json({ enabled: true, ...found }, { headers: cache(604800) });
  } catch {
    return NextResponse.json({ enabled: true, photos: [] }, { headers: cache(3600) });
  }
}

function cache(seconds: number) {
  return { "Cache-Control": `public, s-maxage=${seconds}, stale-while-revalidate=${seconds}` };
}
