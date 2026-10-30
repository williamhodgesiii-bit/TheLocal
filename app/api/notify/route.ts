import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase-env";
import { BRAND, FOUNDER } from "@/lib/brand";
import { DRINK_KINDS, GENRE_BY_ID, SPOT_BY_ID, type GenreId } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * Emails the team about places people add (with the photo they sent, so it can be checked) and
 * about every new member photo, through Resend (the same free account that sends sign-in codes).
 * The site calls this right after a place or photo is sent, and the keepalive workflow calls it
 * every few days to catch any that slipped by. Each one is emailed once: it's claimed
 * (notified_at) before its email goes out and released if sending fails.
 *
 * Needs SUPABASE_SECRET_KEY and RESEND_API_KEY. NOTIFY_EMAIL changes who gets them (default:
 * the founders' address), SENDER_EMAIL who they come from.
 */

type Pic = { id: string; spot_id: string; user_id: string; display_name: string; url: string; kind: string; caption: string | null; review_id: string | null; created_at: string };

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

  // new member photos from the last week, all in one email (before the photos update this just finds none)
  const { data: pics } = await admin
    .from("photos")
    .select("id, spot_id, user_id, display_name, url, kind, caption, review_id, created_at")
    .is("notified_at", null)
    .gt("created_at", new Date(Date.now() - 7 * 864e5).toISOString())
    .order("created_at")
    .limit(24);
  if (pics?.length) {
    const ids = pics.map((p) => p.id);
    const { data: claimed } = await admin.from("photos").update({ notified_at: new Date().toISOString() }).in("id", ids).is("notified_at", null).select("id");
    const mine = (pics as Pic[]).filter((p) => claimed?.some((c) => c.id === p.id));
    if (mine.length) {
      const ok = await photoEmail(admin, key, mine).catch(() => false);
      if (ok) sent++;
      else await admin.from("photos").update({ notified_at: null }).in("id", mine.map((p) => p.id));
    }
  }
  return Response.json({ ok: true, sent });
}

/** the place's name, from the curated list or the community spots */
async function placeNames(admin: SupabaseClient, ids: string[]) {
  const out: Record<string, string> = {};
  const rest = ids.filter((id) => (SPOT_BY_ID[id] ? ((out[id] = SPOT_BY_ID[id].name), false) : true));
  if (rest.length) {
    const { data } = await admin.from("spots").select("id, name").in("id", rest);
    for (const r of data ?? []) out[r.id] = r.name;
  }
  return out;
}

async function photoEmail(admin: SupabaseClient, key: string, pics: Pic[]) {
  const names = await placeNames(admin, Array.from(new Set(pics.map((p) => p.spot_id))));
  const reviewIds = pics.map((p) => p.review_id).filter((x): x is string => !!x);
  const reviews: Record<string, string> = {};
  if (reviewIds.length) {
    const { data } = await admin.from("reviews").select("id, body").in("id", reviewIds);
    for (const r of data ?? []) reviews[r.id] = r.body;
  }
  const desk = `${SITE}/admin?tab=photos`;
  const what = (p: Pic) => (p.review_id ? "on their review" : p.kind === "building" ? "of the front" : p.kind === "vibe" ? "of the room" : "of the food");
  const cards = pics
    .map((p) => {
      const place = names[p.spot_id] ?? p.spot_id;
      const words = p.review_id && reviews[p.review_id] ? `<p style="margin:6px 0 0;font-size:13px;line-height:1.45;color:#3d3a33">&ldquo;${esc(reviews[p.review_id].slice(0, 220))}${reviews[p.review_id].length > 220 ? "…" : ""}&rdquo;</p>` : "";
      return `<tr><td style="padding:0 0 22px">
        <a href="${esc(p.url)}"><img src="${esc(p.url)}" width="504" alt="Photo of ${esc(place)} by ${esc(p.display_name)}" style="display:block;width:100%;max-width:504px;height:auto;border:1px solid #22201c"></a>
        <p style="margin:8px 0 0;font-size:14px"><b>${esc(place)}</b> &middot; ${esc(p.display_name)}, ${esc(what(p))}${p.caption ? ` &middot; &ldquo;${esc(p.caption)}&rdquo;` : ""}</p>${words}
      </td></tr>`;
    })
    .join("");
  const n = pics.length;
  const html = `<div style="margin:0;padding:24px 12px;background:#f4efe1;font-family:Arial,Helvetica,sans-serif;color:#22201c">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fbf8ef;border:1px solid #22201c">
    <tr><td style="padding:26px 28px 6px">
      <p style="margin:0 0 6px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#b23a24;font-weight:bold">${n === 1 ? "A new photo" : `${n} new photos`}</p>
      <h1 style="margin:0 0 6px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:24px;line-height:1.2">Check ${n === 1 ? "it's" : "they're"} all right</h1>
      <p style="margin:0 0 18px;font-size:14px;line-height:1.5;color:#3d3a33">${n === 1 ? "It's" : "They're"} up on the site now. If one shouldn't be, take it down in the desk. You can also feature one there, so it's the picture for that place.</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%">${cards}</table>
      <p style="margin:0 0 8px"><a href="${desk}" style="display:inline-block;background:#2c5a43;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 22px">Open the photos in the desk</a></p>
    </td></tr>
    <tr><td style="padding:14px 28px 24px;font-size:12px;line-height:1.5;color:#6b665b">Every photo members add comes here once.</td></tr>
  </table>
</div>`;
  const text = [`${n === 1 ? "A new photo" : `${n} new photos`} to check:`, "", ...pics.map((p) => `${names[p.spot_id] ?? p.spot_id}, by ${p.display_name} (${what(p)}): ${p.url}`), "", `Take one down or feature it: ${desk}`].join("\n");
  const place = names[pics[0].spot_id] ?? pics[0].spot_id;
  const subject = n === 1 ? `New photo to check: ${place}` : `${n} new photos to check (${place} and more)`;
  return send(key, { subject, html, text });
}

async function send(key: string, m: { subject: string; html: string; text: string; reply_to?: string }) {
  const r = await fetch(`${RESEND}/emails`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [TO], ...m }),
  }).catch(() => null);
  return !!r?.ok;
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
      ${
        s.photo_url
          ? `<p style="margin:18px 0 4px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#6b665b">Their photo</p>
      <a href="${esc(s.photo_url)}"><img src="${esc(s.photo_url)}" width="504" alt="The photo sent with ${esc(s.name)}" style="display:block;width:100%;max-width:504px;height:auto;border:1px solid #22201c"></a>`
          : `<p style="margin:18px 0 0;font-size:13px;color:#6b665b">No photo sent with it.</p>`
      }
      <p style="margin:22px 0 8px"><a href="${desk}" style="display:inline-block;background:#2c5a43;color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px;padding:12px 22px">Check it in the Verification desk</a></p>
    </td></tr>
    <tr><td style="padding:14px 28px 24px;font-size:12px;line-height:1.5;color:#6b665b">
      Sent ${esc(new Date(s.created_at).toLocaleString("en-US", { timeZone: "America/Chicago", dateStyle: "medium", timeStyle: "short" }))}. ${from ? "Reply to this email to write back to them." : ""}
    </td></tr>
  </table>
</div>`;
  const text = [`A place to check: ${s.name}`, "", ...shown.map(([k, v]) => `${k}: ${v}`), ...(s.photo_url ? [`Their photo: ${s.photo_url}`] : []), "", `Check it: ${desk}`].join("\n");
  return send(key, { ...(from ? { reply_to: from } : {}), subject: `New place to check: ${s.name} (${s.area_label})`, html, text });
}

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
