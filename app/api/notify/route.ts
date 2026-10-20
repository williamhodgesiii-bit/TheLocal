import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase-env";
import { BRAND, FOUNDER } from "@/lib/brand";
import { DRINK_KINDS, GENRE_BY_ID, type GenreId } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * Emails the team about places people add, through Resend (the same free account that sends
 * sign-in codes). The site calls this right after a place is sent, and the keepalive workflow
 * calls it every few days to catch any that slipped by. It sends each waiting place once:
 * a place is claimed (notified_at) before its email goes out and released if sending fails.
 *
 * Needs SUPABASE_SECRET_KEY and RESEND_API_KEY. NOTIFY_EMAIL changes who gets them (default:
 * the founders' address), SENDER_EMAIL who they come from.
 */

type Sub = {
  id: string;
  name: string;
  address: string;
  area_label: string;
  city_id: string;
  genres: string[];
  drinks: string[];
  price: number;
  known_for: string;
  blurb: string;
  website: string | null;
  phone: string | null;
  tags: string[];
  note: string | null;
  photo_url: string | null;
  submitted_by: string;
  submitter_name: string;
  created_at: string;
};

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.theplatenextdoor.com").replace(/\/$/, "");
const TO = process.env.NOTIFY_EMAIL || FOUNDER.email || "emails@theplatenextdoor.com";
const FROM = `${BRAND} <${process.env.SENDER_EMAIL || "emails@theplatenextdoor.com"}>`;
const RESEND = process.env.RESEND_API_URL || "https://api.resend.com";

export async function POST() {
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const key = process.env.RESEND_API_KEY;
  if (!SUPABASE_URL || !secret || !key) return Response.json({ error: "Not configured" }, { status: 501 });
  const admin = createClient(SUPABASE_URL, secret, { auth: { persistSession: false, autoRefreshToken: false } });

  // places still waiting from the last week that nobody's been told about (usually just the one sent)
  const { data: waiting, error } = await admin
    .from("submissions")
    .select("*")
    .eq("status", "pending")
    .is("notified_at", null)
    .gt("created_at", new Date(Date.now() - 7 * 864e5).toISOString())
    .order("created_at")
    .limit(10);
  if (error) return Response.json({ error: "Database not ready" }, { status: 503 });

  let sent = 0;
  for (const s of (waiting ?? []) as Sub[]) {
    const { data: mine } = await admin.from("submissions").update({ notified_at: new Date().toISOString() }).eq("id", s.id).is("notified_at", null).select("id");
    if (!mine?.length) continue; // another call has it
    const ok = await email(admin, key, s).catch(() => false);
    if (ok) sent++;
    else await admin.from("submissions").update({ notified_at: null }).eq("id", s.id);
  }
  return Response.json({ ok: true, sent });
}

async function email(admin: SupabaseClient, key: string, s: Sub) {
  // their email, so Reply reaches them (the place still goes out without it)
  const from = await admin.auth.admin
    .getUserById(s.submitted_by)
    .then(({ data }) => data.user?.email ?? null)
    .catch(() => null);
  const kinds = s.genres.map((g) => GENRE_BY_ID[g as GenreId]?.label ?? g);
  const drinks = s.drinks.map((d) => DRINK_KINDS.find((k) => k.id === d)?.label ?? d);
  const rows: [string, string | null][] = [
    ["Where", `${s.address} (${s.area_label})`],
    ["Kind", [...kinds, ...drinks].join(", ")],
    ["Price", "$".repeat(Math.max(1, Math.min(4, s.price)))],
    ["Known for", s.known_for],
    ["About it", s.blurb],
    ["Website", s.website],
    ["Phone", s.phone],
    ["Tags", s.tags.length ? s.tags.join(", ") : null],
    ["Their note", s.note],
    ["Photo", s.photo_url],
    ["Sent by", `${s.submitter_name}${from ? ` (${from})` : ""}`],
  ];
  const shown = rows.filter((r): r is [string, string] => !!r[1]);
  const desk = `${SITE}/admin`;
  const link = (v: string) => (/^https?:\/\//i.test(v) ? `<a href="${esc(v)}" style="color:#2c5a43">${esc(v)}</a>` : esc(v));
  const html = `<div style="margin:0;padding:24px 12px;background:#f4efe1;font-family:Arial,Helvetica,sans-serif;color:#22201c">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fbf8ef;border:1px solid #22201c">
    <tr><td style="padding:26px 28px 6px">
      <p style="margin:0 0 6px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#b23a24;font-weight:bold">A place to check</p>
      <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:26px;line-height:1.2">${esc(s.name)}</h1>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;line-height:1.5">
        ${shown.map(([k, v]) => `<tr><td style="padding:5px 12px 5px 0;vertical-align:top;color:#6b665b;white-space:nowrap">${esc(k)}</td><td style="padding:5px 0">${link(v)}</td></tr>`).join("")}
      </table>
      <p style="margin:22px 0 8px"><a href="${desk}" style="display:inline-block;background:#2c5a43;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 22px">Check it in the Verification desk</a></p>
    </td></tr>
    <tr><td style="padding:14px 28px 24px;font-size:12px;line-height:1.5;color:#6b665b">
      Sent ${esc(new Date(s.created_at).toLocaleString("en-US", { timeZone: "America/Chicago", dateStyle: "medium", timeStyle: "short" }))}. ${from ? "Reply to this email to write back to them." : ""}
    </td></tr>
  </table>
</div>`;
  const text = [`A place to check: ${s.name}`, "", ...shown.map(([k, v]) => `${k}: ${v}`), "", `Check it: ${desk}`].join("\n");
  const r = await fetch(`${RESEND}/emails`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [TO], ...(from ? { reply_to: from } : {}), subject: `New place to check: ${s.name} (${s.area_label})`, html, text }),
  }).catch(() => null);
  return !!r?.ok;
}

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
