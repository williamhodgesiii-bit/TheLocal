/**
 * Live data for search engines and share cards, read on the server: ratings, recent reviews,
 * what changed lately and the week's letter. Every read is cached for an hour (Next's data cache)
 * and fails soft: with no database, or a slow one, pages still build from the guide's own data.
 *
 * This is what keeps the public pages honest and current: a place's rating, its newest reviews
 * and its "last updated" date move as members post, without a redeploy.
 */
import { SUPABASE_URL, hasSupabase, restHeaders } from "./supabase-env";
import { mapLetter } from "./letter";
import type { LetterWeek } from "./backend";

const HOUR = 3600;

async function rest<T>(path: string, revalidate = HOUR): Promise<T | null> {
  if (!hasSupabase) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: restHeaders(),
      next: { revalidate },
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export type Rating = { avg: number; count: number; goBack: number | null };

/** every place's rating, from live reviews only (held or removed ones never count) */
export async function ratings(): Promise<Record<string, Rating>> {
  const rows = await rest<{ spot_id: string; avg_rating: number; review_count: number; go_back_pct: number | null }[]>(
    "spot_ratings?select=spot_id,avg_rating,review_count,go_back_pct"
  );
  return Object.fromEntries(
    (rows ?? []).map((r) => [r.spot_id, { avg: Number(r.avg_rating), count: Number(r.review_count), goBack: r.go_back_pct }])
  );
}

export async function ratingFor(id: string): Promise<Rating | null> {
  return (await ratings())[id] ?? null;
}

export type PublicReview = { id: string; spotId: string; author: string; rating: number; body: string; at: string; updated?: string };
type ReviewRow = { id: string; spot_id: string; display_name: string; rating: number; body: string; created_at: string; updated_at: string | null };
const toReview = (r: ReviewRow): PublicReview => ({
  id: r.id,
  spotId: r.spot_id,
  author: r.display_name,
  rating: r.rating,
  body: r.body,
  at: r.created_at,
  updated: r.updated_at ?? undefined,
});
const REVIEW_COLS = "id,spot_id,display_name,rating,body,created_at,updated_at";

/** a place's newest live reviews (the ones that show first on its page) */
export async function reviewsFor(id: string, limit = 3): Promise<PublicReview[]> {
  if (!/^[a-z0-9-]{2,80}$/.test(id)) return [];
  const rows = await rest<ReviewRow[]>(`reviews?spot_id=eq.${id}&status=eq.live&select=${REVIEW_COLS}&order=created_at.desc&limit=${limit}`);
  return (rows ?? []).map(toReview);
}

/** the newest live reviews anywhere (the feed) */
export async function latestReviews(limit = 20): Promise<PublicReview[]> {
  const rows = await rest<ReviewRow[]>(`reviews?status=eq.live&select=${REVIEW_COLS}&order=created_at.desc&limit=${limit}`, 900);
  return (rows ?? []).map(toReview);
}

/**
 * When each place last changed in a way a reader would notice: a new or edited review, or a new
 * photo. This is the honest "last modified" for the sitemap (Google ignores dates that are faked).
 */
export async function lastActivity(): Promise<Record<string, string>> {
  const [reviews, photos] = await Promise.all([
    rest<{ spot_id: string; created_at: string; updated_at: string | null }[]>("reviews?status=eq.live&select=spot_id,created_at,updated_at&order=created_at.desc&limit=5000"),
    rest<{ spot_id: string; created_at: string }[]>("photos?select=spot_id,created_at&order=created_at.desc&limit=5000"),
  ]);
  const out: Record<string, string> = {};
  const bump = (id: string, at?: string | null) => {
    if (at && (!out[id] || at > out[id])) out[id] = at;
  };
  for (const r of reviews ?? []) {
    bump(r.spot_id, r.created_at);
    bump(r.spot_id, r.updated_at);
  }
  for (const p of photos ?? []) bump(p.spot_id, p.created_at);
  return out;
}

/** the team's choices for a week's letter, if they made any (the rest are picked automatically) */
export async function letterRow(week: string): Promise<LetterWeek | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) return null;
  const rows = await rest<Record<string, unknown>[]>(`letters?week=eq.${week}&select=*`);
  return rows?.[0] ? mapLetter(rows[0]) : null;
}

export type MemberCard = { name: string; handle: string; avatar?: string; stamps: number; reviews: number; top: string[]; private: boolean };

/** what a member's share card shows: only what their public page already shows */
export async function memberCard(handle: string): Promise<MemberCard | null> {
  if (!hasSupabase || !/^[a-z0-9_.]{2,30}$/.test(handle)) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/member_page`, {
      method: "POST",
      headers: { ...restHeaders(), "content-type": "application/json" },
      body: JSON.stringify({ h: handle }),
      next: { revalidate: HOUR },
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const j = (await r.json()) as any;
    const m = j?.member;
    if (!m) return null;
    const open = !!j.visible;
    return {
      name: String(m.name ?? handle),
      handle: String(m.handle ?? handle),
      avatar: typeof m.avatar === "string" && m.avatar.startsWith("https://") ? m.avatar : undefined,
      stamps: open ? Number(j.stats?.been ?? 0) || 0 : 0,
      reviews: Number(j.stats?.reviews ?? 0) || 0,
      top: open && Array.isArray(m.top) ? (m.top as string[]).slice(0, 4) : [],
      private: !open,
    };
  } catch {
    return null;
  }
}
