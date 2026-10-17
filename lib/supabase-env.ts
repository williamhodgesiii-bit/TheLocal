/**
 * Supabase connection settings. Reads either key name: the Vercel ↔ Supabase
 * integration now injects NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, older projects
 * use NEXT_PUBLIC_SUPABASE_ANON_KEY. Without both URL and key the site runs in
 * on-device demo mode.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);

/**
 * Headers for calling Supabase's REST API directly from the server. The newer
 * publishable keys (sb_publishable_…) aren't JWTs and must go in `apikey` only;
 * the older anon key also goes in Authorization as before.
 */
export function restHeaders(): Record<string, string> {
  return SUPABASE_KEY.startsWith("sb_") ? { apikey: SUPABASE_KEY } : { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };
}
