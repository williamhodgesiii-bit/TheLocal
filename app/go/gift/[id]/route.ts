import { NextResponse, type NextRequest } from "next/server";
import { canonicalSpotId } from "@/lib/data";
import { GIFTS } from "@/lib/gifts";
import { SUPABASE_URL, hasSupabase, restHeaders } from "@/lib/supabase-env";

/**
 * A gift card link-out: count it (which place, which seller, from where; never who), then send
 * the visitor to the place's own gift card page. Only places we've checked are listed in lib/gifts.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = canonicalSpotId(params.id);
  const g = GIFTS[id];
  if (!g) return NextResponse.redirect(new URL(`/spot/${encodeURIComponent(id)}`, req.url), 302);
  const surface = (req.nextUrl.searchParams.get("from") ?? "").replace(/[^a-z-]/g, "").slice(0, 40) || null;
  if (hasSupabase) {
    // best effort: a slow database never holds up the gift
    await Promise.race([
      fetch(`${SUPABASE_URL}/rest/v1/gift_clicks`, {
        method: "POST",
        headers: { ...restHeaders(), "content-type": "application/json", prefer: "return=minimal" },
        body: JSON.stringify({ spot_id: id, via: g.via, surface }),
      }).catch(() => null),
      new Promise((r) => setTimeout(r, 800)),
    ]);
  }
  const res = NextResponse.redirect(g.url, 302);
  res.headers.set("cache-control", "no-store");
  res.headers.set("x-robots-tag", "noindex");
  return res;
}
