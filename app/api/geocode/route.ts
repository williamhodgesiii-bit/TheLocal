import { NextResponse } from "next/server";
import { CITY_BY_ID, stateName, type City } from "@/lib/regions";
import { distanceKm } from "@/lib/data";
import { rateLimited } from "@/lib/ratelimit";

// Address/place lookup for the "Add a spot" form and the moderation queue.
// Google Places (New) when GOOGLE_PLACES_API_KEY is set — it also reports businessStatus,
// which helps staff confirm a place is real and open. Otherwise, free and keyless: the US
// Census Bureau's geocoder for street addresses (it knows every house number, including in
// the suburbs, whose mail says "Birmingham"), then OpenStreetMap Nominatim.
//
// Pass `address` (and `name`, if known), or a single search line as `q`.
export const dynamic = "force-dynamic";

type Result = { name: string; address: string; lat: number; lng: number; source: "google" | "census" | "osm"; status?: string; mapsUri?: string; website?: string };

const UA = "ThePlateNextDoor/1.0 (independent restaurant guide)";
/** anything farther than this from the city center isn't the place they meant */
const RADIUS_KM = 60;

export async function GET(req: Request) {
  if (rateLimited(req, "geocode", 40)) return NextResponse.json({ results: [], error: "Too many lookups. Wait a minute and try again." }, { status: 429 });
  const url = new URL(req.url);
  const get = (k: string) => (url.searchParams.get(k) ?? "").trim().slice(0, 200);
  const name = get("name");
  const address = get("address") || get("q");
  const q = get("q") || [name, address].filter(Boolean).join(", ");
  const city = CITY_BY_ID[url.searchParams.get("city") ?? ""];
  if (q.length < 3 || !city) return NextResponse.json({ results: [] }, { status: 400 });
  const key = process.env.GOOGLE_PLACES_API_KEY;

  try {
    if (key) return NextResponse.json({ results: await google(q, city, key) });
    const near = (r: Result) => distanceKm([r.lat, r.lng], city.center) <= RADIUS_KM;
    const byDistance = (a: Result, b: Result) => distanceKm([a.lat, a.lng], city.center) - distanceKm([b.lat, b.lng], city.center);
    if (/^\d/.test(address)) {
      const found = (await census(address, city)).filter(near).sort(byDistance);
      if (found.length) return NextResponse.json({ results: found });
    }
    return NextResponse.json({ results: (await osm(q, address, city)).filter(near) });
  } catch {
    return NextResponse.json({ results: [] });
  }
}

async function google(q: string, city: City, key: string): Promise<Result[]> {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (j.places ?? []).map((p: any) => ({
    name: p.displayName?.text ?? q,
    address: p.formattedAddress ?? "",
    lat: p.location.latitude,
    lng: p.location.longitude,
    source: "google",
    status: p.businessStatus,
    mapsUri: p.googleMapsUri,
    website: p.websiteUri,
  }));
}

/** "2220 HIGHLAND AVE S, BIRMINGHAM, AL, 35205" → "2220 Highland Ave S, Birmingham, AL 35205" */
function tidyAddress(a: string) {
  const [street = "", town = "", state = "", zip = ""] = a.split(", ");
  const words = (s: string) => s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\b(N|S|E|W|Ne|Nw|Se|Sw)\b/g, (m) => m.toUpperCase());
  return `${words(street)}, ${words(town)}, ${state}${zip ? ` ${zip}` : ""}`;
}

async function census(address: string, city: City): Promise<Result[]> {
  // As typed when it names a state or ZIP. With a town ("…, Mountain Brook"), add the state;
  // with just a street, put it in this city (suburban mail says "Birmingham", so that matches too).
  const street = address.split(",")[0].trim();
  const lines = /\b\d{5}\b|,\s*[A-Za-z]{2}\.?\s*$/.test(address)
    ? [address]
    : address.includes(",")
      ? [`${address}, ${city.state}`, `${street}, ${city.name}, ${city.state}`]
      : [`${address}, ${city.name}, ${city.state}`];
  for (const line of lines) {
    const u = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?benchmark=Public_AR_Current&format=json&address=${encodeURIComponent(line)}`;
    const r = await fetch(u, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(6000) });
    const j = await r.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const found: Result[] = (j?.result?.addressMatches ?? []).slice(0, 4).map((m: any) => {
      const pretty = tidyAddress(m.matchedAddress ?? line);
      return { name: pretty.split(",")[0], address: pretty, lat: +m.coordinates.y, lng: +m.coordinates.x, source: "census" as const };
    });
    if (found.length) return found;
  }
  return [];
}

// street words that don't tell one street from another
const GENERIC = new Set(["st", "street", "ave", "avenue", "rd", "road", "dr", "drive", "ln", "lane", "blvd", "hwy", "highway", "pkwy", "parkway", "ct", "pl", "place", "cir", "way", "n", "s", "e", "w", "north", "south", "east", "west", "suite", "ste"]);

async function osm(q: string, address: string, city: City): Promise<Result[]> {
  const [lat, lng] = city.center;
  const box = [lng - 0.35, lat + 0.3, lng + 0.35, lat - 0.3].join(",");
  // Nominatim gives up on a whole line when the city in it isn't the one it files the street under
  // (Mountain Brook, Hoover…), so it's asked with just the state, inside a box around the city.
  const r = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=4&addressdetails=1&bounded=1&viewbox=${box}&countrycodes=us&q=${encodeURIComponent(`${q}, ${stateName(city.state)}`)}`,
    { headers: { "User-Agent": UA, "Accept-Language": "en" }, signal: AbortSignal.timeout(6000) }
  );
  const j = await r.json();
  // It also likes to answer with something unrelated that merely shares a word ("Heights
  // Village" → a hall in Interurban Heights). For a street address, keep only answers whose
  // street (or name) has every telling word of the street that was typed.
  const first = address.split(",")[0].toLowerCase();
  const street = /^\d/.test(first)
    ? first
        .replace(/^\d+[a-z]?\s+/, "")
        .split(/\s+/)
        .map((w) => w.replace(/\./g, ""))
        .filter((w) => w.length > 1 && !GENERIC.has(w))
    : [];
  type Hit = { name?: string; display_name: string; lat: string; lon: string; address?: { road?: string } };
  return (Array.isArray(j) ? (j as Hit[]) : [])
    .filter((p) => {
      const on = `${p.address?.road ?? ""} ${p.name ?? ""}`.toLowerCase();
      return street.every((w) => on.includes(w));
    })
    .map((p) => ({ name: p.name || q, address: p.display_name, lat: +p.lat, lng: +p.lon, source: "osm" as const }));
}
