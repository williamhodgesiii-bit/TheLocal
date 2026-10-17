import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase-env";

export const dynamic = "force-dynamic";

/**
 * Deletes the signed-in member's account and everything tied to it: reviews, photos, stamps,
 * saved places and submissions go with it (foreign keys cascade); their uploaded files are removed
 * from storage first. Needs the server-only key the Vercel ↔ Supabase integration provides
 * (SUPABASE_SECRET_KEY, or the older SUPABASE_SERVICE_ROLE_KEY). Without it the client falls back
 * to the delete_my_account() database function.
 */
export async function POST(req: Request) {
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !secret) return Response.json({ error: "Not configured" }, { status: 501 });
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Sign in first." }, { status: 401 });

  const admin = createClient(SUPABASE_URL, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return Response.json({ error: "Your sign-in expired. Sign in again, then delete." }, { status: 401 });
  const id = data.user.id;

  // their uploads live under spot-photos/<user id>/…
  try {
    const bucket = admin.storage.from("spot-photos");
    const paths: string[] = [];
    const walk = async (prefix: string, depth = 0) => {
      const { data: items } = await bucket.list(prefix, { limit: 1000 });
      for (const it of items ?? []) {
        const p = `${prefix}/${it.name}`;
        if (it.id) paths.push(p);
        else if (depth < 3) await walk(p, depth + 1);
      }
    };
    await walk(id);
    for (let i = 0; i < paths.length; i += 500) await bucket.remove(paths.slice(i, i + 500));
  } catch {
    /* best effort: the account still goes */
  }

  const del = await admin.auth.admin.deleteUser(id);
  if (del.error) return Response.json({ error: "We couldn't delete your account. Email us and we'll do it right away." }, { status: 500 });
  return Response.json({ ok: true });
}
