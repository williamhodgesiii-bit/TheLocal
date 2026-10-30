import { SUPABASE_KEY, SUPABASE_URL, restHeaders } from "@/lib/supabase-env";
import { missing } from "@/lib/letter-mail";

export const dynamic = "force-dynamic";

/**
 * A tiny check that also keeps the free Supabase project awake: free projects pause after a
 * week with no activity, and a paused project means nobody can sign in. The keepalive workflow
 * (.github/workflows/keepalive.yml) calls this every few days.
 */
export async function GET() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return Response.json({ ok: true, database: "not connected (preview mode)" });
  try {
    const [db, auth, friends, photos, letters] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/spots?select=id&limit=1`, { headers: restHeaders(), cache: "no-store" }),
      fetch(`${SUPABASE_URL}/auth/v1/health`, { headers: { apikey: SUPABASE_KEY }, cache: "no-store" }),
      fetch(`${SUPABASE_URL}/rest/v1/members?select=id&limit=1`, { headers: restHeaders(), cache: "no-store" }),
      fetch(`${SUPABASE_URL}/rest/v1/photos?select=review_id,featured_at&limit=1`, { headers: restHeaders(), cache: "no-store" }),
      fetch(`${SUPABASE_URL}/rest/v1/letters?select=week&limit=1`, { headers: restHeaders(), cache: "no-store" }),
    ]);
    const letterNeeds = [...(letters.ok ? [] : ["the database update"]), ...missing()];
    const ok = db.ok && auth.ok;
    const server = !!(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
    return Response.json(
      {
        ok,
        database: db.ok ? "awake" : `HTTP ${db.status}`,
        signIn: auth.ok ? "awake" : `HTTP ${auth.status}`,
        // what's switched on, so a setup problem shows here instead of as a quiet failure
        friends: friends.ok ? "ready" : "waiting for the database update",
        reviewPhotos: photos.ok ? "ready" : "waiting for the database update",
        thursdayLetter: letterNeeds.length ? `off (needs ${letterNeeds.join(", ")})` : "on",
        databaseUpdates: process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL || process.env.SUPABASE_DB_URL ? "automatic" : "by hand",
        placeEmails: server && process.env.RESEND_API_KEY ? "on" : `off (needs ${[!server && "SUPABASE_SECRET_KEY", !process.env.RESEND_API_KEY && "RESEND_API_KEY"].filter(Boolean).join(" and ")} in Vercel)`,
      },
      { status: ok ? 200 : 502 }
    );
  } catch {
    return Response.json({ ok: false, database: "unreachable" }, { status: 502 });
  }
}
