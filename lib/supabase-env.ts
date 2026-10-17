/**
 * Supabase connection settings. Reads either key name: the Vercel ↔ Supabase
 * integration now injects NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, older projects
 * use NEXT_PUBLIC_SUPABASE_ANON_KEY. Without both URL and key the site runs in
 * on-device demo mode.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY);
