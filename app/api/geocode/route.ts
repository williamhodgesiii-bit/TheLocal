import { NextResponse } from "next/server";
import { CITY_BY_ID, stateName } from "@/lib/regions";
import { rateLimited } from "@/lib/ratelimit";

// Address/place lookup for the "Add a spot" form and the moderation queue.
// Google Places (New) when GOOGLE_PLACES_API_KEY is set — it also reports businessStatus,
// which helps staff confirm a place is real and open. Otherwise OpenStreetMap Nominatim.
export const dynamic = "force-dynamic";

type Result = { name: string; address: string; lat: number; lng: number; source: "google" | "osm"; status?: string; mapsUri?: string; website?: string };

export async function GET(req: Request) {
  if (rateLimited(req, "geocode", 40)) return NextResponse.json({ results: [], error: "Too many lookups — drop the pin by hand." }, { status: 429 });
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 200);
  const city = CITY_BY_ID[url.searchParams.get("city") ?? ""];
  if (q.length < 3 || !city) return NextResponse.json({ results: [] }, { status: 400 });
  const key = process.env.GOOGLE_PLACES_API_KEY;

  try {
    if (key) {
      const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location,places.businessStatus,places.googleMapsUri,places.websiteUri",
        },
        body: JSON.stringify({
          textQuery: `${q}, ${city.name}, ${city.state}`,
          maxResultCount: 4,
          locationBias: { circle: { center: { latitude: city.center[0], longitude: city.center[1] }, radius: 40000 } },
        }),
      });
      const j = await r.json();
      const results: Result[] = (j.places ?? []).map((p: any) => ({
        name: p.displayName?.text ?? q,
        address: p.formattedAddress ?? "",
        lat: p.location.latitude,
        lng: p.location.longitude,
        source: "google",
        status: p.businessStatus,
        mapsUri: p.googleMapsUri,
        website: p.websiteUri,
      }));
      return NextResponse.json({ results });
    }

    const [lat, lng] = city.center;
    const box = [lng - 0.35, lat + 0.3, lng + 0.35, lat - 0.3].join(",");
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=4&addressdetails=0&bounded=1&viewbox=${box}&q=${encodeURIComponent(`${q}, ${city.name}, ${stateName(city.state)}`)}`,
      { headers: { "User-Agent": "TheLocal/1.0 (independent restaurant guide)", "Accept-Language": "en" } }
    );
    const j = await r.json();
    const results: Result[] = (Array.isArray(j) ? j : []).map((p: any) => ({
      name: p.name || q,
      address: p.display_name,
      lat: +p.lat,
      lng: +p.lon,
      source: "osm",
    }));
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
