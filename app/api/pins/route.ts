import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { SPOTS, distanceKm } from "@/lib/data";

/**
 * Exact pin locations, closures and each place's first photo from Google, once
 * GOOGLE_PLACES_API_KEY is set on Vercel. One lookup per place a WEEK, kept in Vercel's data
 * cache, which survives deploys, so redeploying never repeats them (about 600 a month, inside
 * Google's free 5,000 Text Search Pro calls). The fields asked for (location, businessStatus,
 * photos) are all Text Search Pro; nothing Enterprise.
 *
 * A Google match only moves a pin if it lands within 3 km of where we already had it. Only
 * "Permanently closed" takes a place off; closed-for-the-night or temporarily closed never does.
 */
export const dynamic = "force-dynamic";

const WEEK = 604800;
const MAX_MOVE_KM = 3;

type Hit = { id: string; coords?: [number, number]; closed?: boolean; photo?: { name: string; author: string } };
/** photos: each place's first Google photo (its resource name and who took it), for cards; see /api/cover */
type Body = { enabled: true; pins: Record<string, [number, number]>; closed: string[]; photos: Record<string, { name: string; author: string }> };

async function lookUp(key: string): Promise<Body> {
  const results: Hit[] = [];
  const queue = [...SPOTS];
  // a few at a time so one slow lookup doesn't stall the rest
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      for (let s = queue.shift(); s; s = queue.shift()) {
        try {
          const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "places.location,places.businessStatus,places.photos" },
            body: JSON.stringify({ textQuery: `${s.name}, ${s.address}, Birmingham area, AL`, maxResultCount: 1 }),
            cache: "no-store",
            signal: AbortSignal.timeout(8000),
          });
          if (!r.ok) continue; // over the daily cap, or Google is down: leave this pin as it was
          const p = (await r.json()).places?.[0];
          if (!p?.location) continue;
          const at: [number, number] = [+p.location.latitude.toFixed(5), +p.location.longitude.toFixed(5)];
          if (distanceKm(at, s.coords) > MAX_MOVE_KM) continue;
          const ph = p.photos?.[0];
          results.push({
            id: s.id,
            coords: at,
            closed: p.businessStatus === "CLOSED_PERMANENTLY",
            ...(ph?.name ? { photo: { name: ph.name as string, author: (ph.authorAttributions?.[0]?.displayName as string) || "Google user" } } : {}),
          });
        } catch {
          /* leave this pin where it was */
        }
      }
    })
  );
  // a bad run (key not switched on, the daily cap reached) isn't kept: it throws, so nothing is cached
  if (results.length < SPOTS.length / 2) throw new Error(`only ${results.length} places found`);
  return {
    enabled: true,
    pins: Object.fromEntries(results.filter((x) => x.coords).map((x) => [x.id, x.coords!])),
    closed: results.filter((x) => x.closed).map((x) => x.id),
    photos: Object.fromEntries(results.filter((x) => x.photo).map((x) => [x.id, x.photo!])),
  };
}

const weekly = unstable_cache((key: string) => lookUp(key), ["google-pins-v2"], { revalidate: WEEK });

export async function GET() {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json({ enabled: false, pins: {}, closed: [], photos: {} });
  try {
    return NextResponse.json(await weekly(key), { headers: { "Cache-Control": `public, s-maxage=${WEEK}, stale-while-revalidate=${WEEK}` } });
  } catch {
    // try again in an hour, not on every visit
    return NextResponse.json({ enabled: false, pins: {}, closed: [], photos: {} }, { headers: { "Cache-Control": "public, s-maxage=3600" } });
  }
}
