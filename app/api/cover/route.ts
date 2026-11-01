import { NextResponse } from "next/server";
import { rateLimited } from "@/lib/ratelimit";

/**
 * A place's Google photo for its card: /api/cover?n=places/…/photos/… (the name /api/pins hands
 * out) redirects to the picture itself. The key never leaves the server, and the CDN keeps the
 * redirect for a week, so each photo costs about one lookup a week. Without a key it's a 404 and
 * the card shows our own cover instead.
 */
export const dynamic = "force-dynamic";
const NAME = /^places\/[A-Za-z0-9_-]{6,200}\/photos\/[A-Za-z0-9_-]{6,800}$/;

export async function GET(req: Request) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  const n = new URL(req.url).searchParams.get("n") ?? "";
  const w = Math.min(1200, Math.max(200, Number(new URL(req.url).searchParams.get("w")) || 640));
  if (!key || !NAME.test(n)) return new NextResponse(null, { status: 404 });
  if (rateLimited(req, "cover", 240)) return new NextResponse(null, { status: 429 });
  try {
    const r = await fetch(`https://places.googleapis.com/v1/${n}/media?maxWidthPx=${w}&skipHttpRedirect=true&key=${key}`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    const m = (await r.json()) as { photoUri?: string };
    if (!m.photoUri) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "public, s-maxage=3600" } });
    return NextResponse.redirect(m.photoUri, { status: 302, headers: { "Cache-Control": "public, s-maxage=604800, stale-while-revalidate=86400" } });
  } catch {
    return new NextResponse(null, { status: 502, headers: { "Cache-Control": "public, s-maxage=300" } });
  }
}
