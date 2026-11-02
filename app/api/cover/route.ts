import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

/**
 * A place's Google photo: /api/cover?n=places/…/photos/… (a name /api/pins or /api/places handed
 * out) redirects to the picture. One size only (800px wide), and each photo is looked up at most
 * once a week (Vercel's data cache, which survives deploys), so the whole site stays inside
 * Google's free 1,000 photo lookups a month. The key never leaves the server. Without a key, or
 * past the daily cap set in Google Cloud, it's a 404 and the card shows its matchbook instead.
 */
export const dynamic = "force-dynamic";
const NAME = /^places\/[A-Za-z0-9_-]{6,200}\/photos\/[A-Za-z0-9_-]{6,800}$/;
const WEEK = 604800;

const photoUri = unstable_cache(
  async (name: string, key: string) => {
    const r = await fetch(`https://places.googleapis.com/v1/${name}/media?maxWidthPx=800&skipHttpRedirect=true&key=${key}`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    const m = (await r.json().catch(() => ({}))) as { photoUri?: string };
    if (!r.ok || !m.photoUri) throw new Error("no photo"); // not cached; tried again later
    return m.photoUri;
  },
  ["google-photo-v1"],
  { revalidate: WEEK }
);

export async function GET(req: Request) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const n = new URL(req.url).searchParams.get("n") ?? "";
  if (!key || !NAME.test(n)) return new NextResponse(null, { status: 404 });
  try {
    const uri = await photoUri(n, key);
    return NextResponse.redirect(uri, { status: 302, headers: { "Cache-Control": `public, s-maxage=${WEEK}, stale-while-revalidate=86400` } });
  } catch {
    return new NextResponse(null, { status: 404, headers: { "Cache-Control": "public, s-maxage=3600" } });
  }
}
