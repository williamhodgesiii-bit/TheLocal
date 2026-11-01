import { NextResponse } from "next/server";
import { SPOTS, distanceKm } from "@/lib/data";
import { rateLimited } from "@/lib/ratelimit";

/**
 * Exact pin locations from Google, with no script to run: once GOOGLE_PLACES_API_KEY
 * is set on Vercel, this looks every curated place up and Vercel's CDN keeps the answer
 * for a week (until the next deploy), so it costs roughly 80 lookups a week. A bad run
 * (key not switched on yet, Google down) is only cached for five minutes.
 *
 * A Google match only moves a pin if it lands within 3 km of where we already had it,
 * so a wrong match (same name, other town) can't throw a pin across the map.
 *
 * Only Google's "Permanently closed" status takes a place off the list. Being closed
 * for the night (opening hours) is never checked here, and "Temporarily closed"
 * (renovation, a holiday) keeps the place on the map.
 */
export const dynamic = "force-dynamic";

const WEEK = 604800;
const MAX_MOVE_KM = 3;

type Hit = { id: string; coords?: [number, number]; closed?: boolean; photo?: { name: string; author: string } };
/** photos: each place's first Google photo (its resource name and who took it), for cards; see /api/cover */
type Body = { enabled: true; pins: Record<string, [number, number]>; closed: string[]; photos: Record<string, { name: string; author: string }> };

// last good answer on this server, so a cache-busting URL can't trigger fresh (paid) lookups
let memo: { body: Body; at: number } | null = null;

export async function GET(req: Request) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return NextResponse.json({ enabled: false, pins: {}, closed: [], photos: {} });
  if (memo && Date.now() - memo.at < WEEK * 1000) return NextResponse.json(memo.body, { headers: cacheFor(WEEK) });
  if (rateLimited(req, "pins", 4)) return NextResponse.json({ enabled: false, pins: {}, closed: [], photos: {} }, { status: 429 });

  const results: Hit[] = [];
  const queue = [...SPOTS];
  // a few at a time so one slow lookup doesn't stall the rest
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      for (let s = queue.shift(); s; s = queue.shift()) {
        try {
          const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": key,
              // photos is in the same (Pro) tier as businessStatus, so asking for it costs nothing more
              "X-Goog-FieldMask": "places.location,places.businessStatus,places.photos",
            },
            body: JSON.stringify({ textQuery: `${s.name}, ${s.address}, Birmingham area, AL`, maxResultCount: 1 }),
            cache: "no-store",
            signal: AbortSignal.timeout(8000),
          });
          const p = (await r.json()).places?.[0];
          if (!p?.location) continue;
          const at: [number, number] = [+p.location.latitude.toFixed(5), +p.location.longitude.toFixed(5)];
          if (distanceKm(at, s.coords) > MAX_MOVE_KM) continue;
          const ph = p.photos?.[0];
          results.push({
            id: s.id,
            coords: at,
            closed: p.businessStatus === "CLOSED_PERMANENTLY" /* not hours, not temporary */,
            ...(ph?.name ? { photo: { name: ph.name as string, author: (ph.authorAttributions?.[0]?.displayName as string) || "Google user" } } : {}),
          });
        } catch {
          /* leave this pin where it was */
        }
      }
    })
  );

  const body: Body = {
    enabled: true,
    pins: Object.fromEntries(results.filter((x) => x.coords).map((x) => [x.id, x.coords!])),
    closed: results.filter((x) => x.closed).map((x) => x.id),
    photos: Object.fromEntries(results.filter((x) => x.photo).map((x) => [x.id, x.photo!])),
  };
  const good = results.length >= SPOTS.length / 2;
  if (good) memo = { body, at: Date.now() };
  return NextResponse.json(body, { headers: cacheFor(good ? WEEK : 300) });
}

const cacheFor = (s: number) => ({ "Cache-Control": `public, s-maxage=${s}, stale-while-revalidate=${s}` });
