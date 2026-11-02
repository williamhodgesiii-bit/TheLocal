import { SUPABASE_URL } from "./supabase-env";

/**
 * A hard cap on Google Places calls, enforced by our own server: before every call it takes one
 * from this month's allowance, counted in the database (public.google_calls, via google_take).
 * No database, no Google: if the count can't be checked, the call isn't made. Past the
 * allowance the site shows its own covers and pins until the 1st.
 *
 * The limits sit under Google's free monthly calls (5,000 Text Search Pro, 1,000 photo
 * lookups), so the bill stays at $0. The key is restricted to Places API (New) and only this
 * server holds it.
 */
export const GOOGLE_MONTHLY = { search: 3000, photo: 800 } as const;
export type GoogleKind = keyof typeof GOOGLE_MONTHLY;

const secretKey = () => process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const headers = (secret: string) => ({ "Content-Type": "application/json", apikey: secret, ...(secret.startsWith("sb_") ? {} : { Authorization: `Bearer ${secret}` }) });

export async function takeGoogle(kind: GoogleKind): Promise<boolean> {
  const secret = secretKey();
  if (!secret || !SUPABASE_URL) return false;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/google_take`, {
      method: "POST",
      headers: headers(secret),
      body: JSON.stringify({ k: kind, lim: GOOGLE_MONTHLY[kind] }),
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    return r.ok && (await r.json()) === true;
  } catch {
    return false;
  }
}

/** results we keep from Google (the weekly pins), so visitors never trigger a lookup */
export async function readGoogleCache<T>(key: string): Promise<{ body: T; updatedAt: string } | null> {
  const secret = secretKey();
  if (!secret || !SUPABASE_URL) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/google_cache?key=eq.${encodeURIComponent(key)}&select=body,updated_at`, { headers: headers(secret), cache: "no-store", signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    const [row] = (await r.json()) as { body: T; updated_at: string }[];
    return row ? { body: row.body, updatedAt: row.updated_at } : null;
  } catch {
    return null;
  }
}

export async function writeGoogleCache(key: string, body: unknown): Promise<boolean> {
  const secret = secretKey();
  if (!secret || !SUPABASE_URL) return false;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/google_cache?on_conflict=key`, {
      method: "POST",
      headers: { ...headers(secret), Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ key, body, updated_at: new Date().toISOString() }),
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    return r.ok;
  } catch {
    return false;
  }
}
