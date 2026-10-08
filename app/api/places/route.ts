import { NextResponse } from "next/server";
import { SPOT_BY_ID } from "@/lib/data";

// Optional enrichment: real storefront/food photos + Google rating via Places API (New).
// Enabled when GOOGLE_PLACES_API_KEY is set on the server. Responses are CDN-cached for a day.
export const dynamic = "force-dynamic";

type PlacesPhoto = { name: string; authorAttributions?: { displayName?: string; uri?: string }[] };

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("spot") ?? "";
  const spot = SPOT_BY_ID[id];
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!spot) return NextResponse.json({ error: "unknown spot" }, { status: 404 });
  if (!key) return NextResponse.json({ enabled: false, photos: [] }, { headers: cache(86400) });

  try {
    const search = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.id,places.photos,places.rating,places.userRatingCount,places.googleMapsUri,places.websiteUri,places.location",
      },
      body: JSON.stringify({ textQuery: `${spot.name}, ${spot.address}, Birmingham, AL`, maxResultCount: 1 }),
    });
    const json = await search.json();
    const place = json.places?.[0];
    if (!place) return NextResponse.json({ enabled: true, photos: [] }, { headers: cache(3600) });

    const photos = await Promise.all(
      ((place.photos ?? []) as PlacesPhoto[]).slice(0, 6).map(async (p) => {
        const r = await fetch(`https://places.googleapis.com/v1/${p.name}/media?maxWidthPx=1100&skipHttpRedirect=true&key=${key}`);
        const m = await r.json();
        const a = p.authorAttributions?.[0];
        return m.photoUri ? { url: m.photoUri as string, author: a?.displayName ?? "Google user", authorUri: a?.uri ?? null } : null;
      })
    );

    return NextResponse.json(
      {
        enabled: true,
        photos: photos.filter(Boolean),
        rating: place.rating ?? null,
        ratingCount: place.userRatingCount ?? null,
        website: place.websiteUri ?? null,
        mapsUri: place.googleMapsUri ?? null,
      },
      { headers: cache(86400) }
    );
  } catch {
    return NextResponse.json({ enabled: true, photos: [] }, { status: 200, headers: cache(600) });
  }
}

function cache(seconds: number) {
  return { "Cache-Control": `public, s-maxage=${seconds}, stale-while-revalidate=${seconds * 7}` };
}
