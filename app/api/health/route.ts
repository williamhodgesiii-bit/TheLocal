import { SUPABASE_KEY, SUPABASE_URL, restHeaders } from "@/lib/supabase-env";

export const dynamic = "force-dynamic";

/**
 * A tiny check that also keeps the free Supabase project awake: free projects pause after a
 * week with no activity, and a paused project means nobody can sign in. The keepalive workflow
 * (.github/workflows/keepalive.yml) calls this every few days.
 */
export async function GET() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return Response.json({ ok: true, database: "not connected (preview mode)" });
  try {
    const [db, auth] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/spots?select=id&limit=1`, { headers: restHeaders(), cache: "no-store" }),
      fetch(`${SUPABASE_URL}/auth/v1/health`, { headers: { apikey: SUPABASE_KEY }, cache: "no-store" }),
    ]);
    const ok = db.ok && auth.ok;
    return Response.json({ ok, database: db.ok ? "awake" : `HTTP ${db.status}`, signIn: auth.ok ? "awake" : `HTTP ${auth.status}` }, { status: ok ? 200 : 502 });
  } catch {
    return Response.json({ ok: false, database: "unreachable" }, { status: 502 });
  }
}
