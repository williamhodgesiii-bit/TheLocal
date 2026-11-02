import { SUPABASE_URL } from "./supabase-env";

/**
 * A hard cap on Google Places calls, enforced here rather than in Google's console: before every
 * call the server takes one from this month's allowance, kept in the database
 * (public.google_calls, counted by google_take). When the allowance is used up, calls simply
 * aren't made; the site falls back to its own covers and pins until the 1st.
 *
 * The limits sit under Google's free monthly calls (5,000 Text Search Pro, 1,000 photo
 * lookups), so the bill can't go above $0. Our key is restricted to Places API (New) and only
 * this server uses it, so nothing else can spend it.
 */
export const GOOGLE_MONTHLY = { search: 4500, photo: 900 } as const;
export type GoogleKind = keyof typeof GOOGLE_MONTHLY;

// without the database (no secret key, or its update hasn't gone in): a small allowance per
// server instance, so a misconfigured deploy still can't run up a bill
const local: Record<string, number> = {};
const LOCAL_MAX: Record<GoogleKind, number> = { search: 200, photo: 60 };
const monthOf = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" }).slice(0, 7);

export async function takeGoogle(kind: GoogleKind): Promise<boolean> {
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (secret && SUPABASE_URL) {
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/google_take`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: secret, ...(secret.startsWith("sb_") ? {} : { Authorization: `Bearer ${secret}` }) },
        body: JSON.stringify({ k: kind, lim: GOOGLE_MONTHLY[kind] }),
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });
      if (r.ok) return (await r.json()) === true;
    } catch {
      /* fall through to the per-instance allowance */
    }
  }
  const k = `${monthOf()}:${kind}`;
  if ((local[k] ?? 0) >= LOCAL_MAX[kind]) return false;
  local[k] = (local[k] ?? 0) + 1;
  return true;
}
