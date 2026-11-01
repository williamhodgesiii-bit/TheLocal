import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SPOTS, SPOT_BY_ID, spotIdsOf } from "@/lib/data";
import { SUPABASE_URL } from "@/lib/supabase-env";
import { rateLimited } from "@/lib/ratelimit";

/**
 * The owner snapshot on /partners: how many people have a place on their want-to-try list, have
 * stamped it, reviewed it or put it on one of their own lists. Counts only, never who. With no
 * place, the totals for the whole site. Needs SUPABASE_SECRET_KEY; without it everything is null
 * and the page simply leaves the numbers out. Cached for an hour.
 */
export const dynamic = "force-dynamic";
type Counts = { saves: number | null; stamps: number | null; reviews: number | null; lists: number | null; members?: number | null };

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("spot") ?? "";
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const none: Counts = { saves: null, stamps: null, reviews: null, lists: null, members: null };
  if (id && !SPOT_BY_ID[id] && !/^[a-z0-9-]{3,80}$/.test(id)) return NextResponse.json({ ...none, places: SPOTS.length }, { status: 400 });
  if (!secret || !SUPABASE_URL) return NextResponse.json({ ...none, places: SPOTS.length }, { headers: cache(3600) });
  if (rateLimited(req, "snapshot", 60)) return NextResponse.json({ ...none, places: SPOTS.length }, { status: 429 });
  const db = createClient(SUPABASE_URL, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const n = async (q: PromiseLike<{ count: number | null; error: unknown }>) => {
    try {
      const r = await q;
      return r.error ? null : r.count ?? 0;
    } catch {
      return null;
    }
  };
  const ids = id ? spotIdsOf(id) : null;
  const head = { count: "exact" as const, head: true };
  const [saves, stamps, reviews, lists, members] = await Promise.all([
    n(ids ? db.from("saved_spots").select("spot_id", head).in("spot_id", ids) : db.from("saved_spots").select("spot_id", head)),
    n(ids ? db.from("stamps").select("spot_id", head).in("spot_id", ids) : db.from("stamps").select("spot_id", head)),
    n(ids ? db.from("reviews").select("id", head).in("spot_id", ids).eq("status", "live") : db.from("reviews").select("id", head).eq("status", "live")),
    n(ids ? db.from("user_lists").select("id", head).overlaps("spot_ids", ids) : db.from("user_lists").select("id", head)),
    ids ? Promise.resolve(undefined) : n(db.from("members").select("id", head)),
  ]);
  return NextResponse.json({ saves, stamps, reviews, lists, ...(members !== undefined ? { members } : {}), places: SPOTS.length }, { headers: cache(3600) });
}

const cache = (s: number) => ({ "Cache-Control": `public, s-maxage=${s}, stale-while-revalidate=${s * 6}` });
