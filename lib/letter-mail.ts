import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "./supabase-env";
import { BRAND, FOUNDER, MAILING_ADDRESS, NEWSLETTER } from "./brand";
import { GENRE_BY_ID, SPOTS, SPOT_BY_ID, areaLabelOf, cleanGenres, priceLabel, type Spot } from "./data";
import { DEFAULT_CITY } from "./regions";
import { frontFor, pickCovers, type MemberCover } from "./photos";
import { SLOTS, addWeeks, letterFor, mapLetter, weekLabel, type Letter } from "./letter";

/**
 * The Thursday Plate on the server: builds the email from the week's three (lib/letter.ts) and
 * sends it through Resend, the same account that sends sign-in codes. app/api/letter/* uses it.
 * Needs SUPABASE_SECRET_KEY (to read the sign-up list), RESEND_API_KEY and a mailing address.
 */

export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.theplatenextdoor.com").replace(/\/$/, "");
const RESEND = process.env.RESEND_API_URL || "https://api.resend.com";
export const TEAM = process.env.NOTIFY_EMAIL || FOUNDER.email || "emails@theplatenextdoor.com";
const SENDER = process.env.SENDER_EMAIL || "emails@theplatenextdoor.com";
const FROM = `${NEWSLETTER} <${SENDER}>`;
const ADDRESS = (process.env.LETTER_ADDRESS || MAILING_ADDRESS).trim();
const SECRET = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

/** the database as the server (reads the sign-up list); null without the secret key */
export function serviceDb() {
  return SUPABASE_URL && SECRET ? createClient(SUPABASE_URL, SECRET, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
}
/** the database as anyone (picks, places and photos are public) */
export const publicDb = () => (SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }) : null);

/** what's still needed before the letter can go out, in plain words */
export function missing() {
  const m: string[] = [];
  if (!SUPABASE_URL || !SECRET) m.push("SUPABASE_SECRET_KEY in Vercel");
  if (!process.env.RESEND_API_KEY) m.push("RESEND_API_KEY in Vercel");
  if (!ADDRESS) m.push("a mailing address for the footer (lib/brand.ts or LETTER_ADDRESS)");
  return m;
}

/** is this signed-in person on the team? (the same rule as is_admin() in the database) */
export async function staffEmail(db: SupabaseClient, req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await db.auth.getUser(token);
  const u = data.user;
  if (!u?.email) return null;
  const [a, b] = await Promise.all([
    db.from("admins").select("user_id").eq("user_id", u.id).maybeSingle(),
    u.email_confirmed_at ? db.from("admin_emails").select("email").eq("email", u.email.toLowerCase()).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  return a.data || b.data ? u.email : null;
}

/* ------------------------------------------------------------- the content */

type Loaded = { letter: Letter; covers: Record<string, MemberCover>; fresh: Spot[]; row: Record<string, any> | null };

const toSpot = (r: Record<string, any>): Spot => ({
  id: r.id, city: r.city_id, name: r.name, genres: cleanGenres(r.genres), area: r.area, areaLabel: r.area_label ?? undefined, address: r.address,
  coords: [r.lat, r.lng], price: r.price, knownFor: r.known_for, blurb: r.blurb, tags: r.tags ?? [], pop: r.pop ?? 60, addedBy: r.added_by ?? undefined,
  verifiedAt: r.verified_at ?? undefined,
});

/** a week's letter: the picks (the team's, the rest automatic), the photos to show and what's new */
export async function loadLetter(db: SupabaseClient | null, week: string): Promise<Loaded> {
  const [row, spots, pics] = db
    ? await Promise.all([
        db.from("letters").select("*").eq("week", week).maybeSingle(),
        db.from("spots").select("*").eq("city_id", DEFAULT_CITY).eq("status", "live"),
        db.from("photos").select("spot_id, url, display_name, kind, featured_at, created_at").or("featured_at.not.is.null,kind.eq.building").order("created_at", { ascending: false }).limit(2000),
      ])
    : [{ data: null }, { data: [] }, { data: [] }];
  const community = ((spots.data ?? []) as Record<string, any>[]).map(toSpot).filter((s) => !SPOT_BY_ID[s.id]);
  const r = (row.data as Record<string, any> | null) ?? null;
  const letter = letterFor(week, [...SPOTS, ...community], r ? mapLetter(r) : null);
  const covers = pickCovers(((pics.data ?? []) as any[]).map((p) => ({ spotId: p.spot_id, url: p.url, by: p.display_name, kind: p.kind, featuredAt: p.featured_at ?? null })));
  // places members added that went up in the week before this one
  const from = Date.parse(`${addWeeks(week, -1)}T00:00:00Z`), to = Date.parse(`${week}T12:00:00Z`);
  const fresh = community.filter((s) => s.verifiedAt && +new Date(s.verifiedAt) >= from && +new Date(s.verifiedAt) < to).slice(0, 5);
  return { letter, covers, fresh, row: r };
}

/** fill in the automatic picks, so the week can't shift under the email (a new place added mid-week) */
export async function freeze(db: SupabaseClient, l: Letter) {
  const row: Record<string, unknown> = { week: l.week };
  for (const { id } of SLOTS) if (l.picks[id]) row[id] = l.picks[id]!.id;
  const { data } = await db.from("letters").select("fine, casual, wild").eq("week", l.week).maybeSingle();
  // only the empty ones: what the team chose stays
  for (const { id } of SLOTS) if (data?.[id]) delete row[id];
  if (Object.keys(row).length > 1) await db.from("letters").upsert(row, { onConflict: "week" });
}

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const abs = (u: string) => (u.startsWith("/") ? SITE + u : u);
export const UNSUB = "{{unsubscribe}}";

/**
 * The email. `UNSUB` stands where each person's own unsubscribe link goes (swap it per
 * person); `banner` is a note on top for the team's preview and test copies.
 */
export function render({ letter, covers, fresh }: Loaded, banner?: string) {
  const link = (s: Spot) => `${SITE}/spot/${s.id}?utm_source=letter&utm_medium=email&utm_campaign=${letter.week}`;
  const blocks = SLOTS.flatMap((slot) => {
    const s = letter.picks[slot.id];
    if (!s) return [];
    const f = frontFor(s, covers[s.id]);
    const img = f.kind === "img" ? abs(f.src(960)) : null;
    const why = letter.notes[slot.id] || s.blurb;
    const meta = `${s.genres.map((g) => GENRE_BY_ID[g]?.short ?? g).join(", ")} &middot; ${esc(areaLabelOf(s))} &middot; ${priceLabel(s.price)}`;
    return [
      {
        html: `<tr><td style="padding:22px 28px 4px">
      <p style="margin:0 0 6px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#2c5a43;font-weight:bold">${esc(slot.label)}</p>
      ${img ? `<a href="${link(s)}"><img src="${esc(img)}" width="504" alt="${esc(f.alt)}" style="display:block;width:100%;max-width:504px;height:auto;margin:0 0 12px;border:1px solid #22201c"></a>` : ""}
      <h2 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:24px;line-height:1.2"><a href="${link(s)}" style="color:#22201c;text-decoration:none">${esc(s.name)}</a></h2>
      <p style="margin:4px 0 0;font-size:13px;color:#6b665b">${meta}</p>
      <p style="margin:10px 0 0;font-size:15px;line-height:1.5"><b>Order:</b> ${esc(s.knownFor)}</p>
      <p style="margin:6px 0 0;font-size:15px;line-height:1.5;color:#3d3a33">${esc(why)}</p>
      <p style="margin:10px 0 0"><a href="${link(s)}" style="color:#b23a24;font-weight:bold;font-size:14px;text-decoration:none">See the place &rarr;</a></p>
    </td></tr>`,
        text: [slot.label.toUpperCase(), s.name, `${s.genres.map((g) => GENRE_BY_ID[g]?.short ?? g).join(", ")} · ${areaLabelOf(s)} · ${priceLabel(s.price)}`, `Order: ${s.knownFor}`, why, link(s)].join("\n"),
      },
    ];
  });
  const newHtml = fresh.length
    ? `<tr><td style="padding:22px 28px 4px"><p style="margin:0 0 6px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#b23a24;font-weight:bold">New on the map</p>
      ${fresh.map((s) => `<p style="margin:6px 0 0;font-size:15px;line-height:1.45"><a href="${link(s)}" style="color:#22201c;font-weight:bold">${esc(s.name)}</a>, ${esc(areaLabelOf(s))}. ${esc(s.knownFor)}.${s.addedBy ? ` <span style="color:#6b665b">Written in by ${esc(s.addedBy)}.</span>` : ""}</p>`).join("")}
    </td></tr>`
    : "";
  const view = `${SITE}/api/letter?week=${letter.week}`;
  const date = weekLabel(letter.week, { weekday: "long", month: "long", day: "numeric" });
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(NEWSLETTER)}, ${esc(date)}</title></head>
<body style="margin:0;padding:0;background:#f4efe1">
<div style="margin:0;padding:24px 12px;background:#f4efe1;font-family:Arial,Helvetica,sans-serif;color:#22201c">
  ${banner ? `<p style="max-width:560px;margin:0 auto 12px;padding:10px 14px;background:#fff1c4;border:1px solid #dda526;font-size:13px;line-height:1.5">${banner}</p>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fbf8ef;border:1px solid #22201c">
    <tr><td style="padding:26px 28px 0">
      <p style="margin:0;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#b23a24;font-weight:bold">${esc(BRAND)}</p>
      <h1 style="margin:4px 0 0;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:30px;line-height:1.15">${esc(NEWSLETTER)}</h1>
      <p style="margin:4px 0 0;font-size:13px;color:#6b665b">${esc(date)} &middot; one fine dining, one casual, one wildcard</p>
      ${letter.intro ? `<p style="margin:16px 0 0;font-size:15px;line-height:1.55">${esc(letter.intro)}</p>` : ""}
    </td></tr>
    ${blocks.map((b) => b.html).join("")}
    ${newHtml}
    <tr><td style="padding:26px 28px 24px;font-size:12px;line-height:1.6;color:#6b665b">
      Locally owned places only, picked and checked by people, and nobody pays to be in here.<br>
      You're getting this because you signed up at theplatenextdoor.com. <a href="${UNSUB}" style="color:#6b665b">Stop these emails</a> &middot; <a href="${view}" style="color:#6b665b">View in a browser</a><br>
      ${esc(BRAND)}${ADDRESS ? ` &middot; ${esc(ADDRESS)}` : ""}
    </td></tr>
  </table>
</div></body></html>`;
  const text = [
    `${NEWSLETTER}, ${date}`,
    "One fine dining, one casual, one wildcard.",
    ...(letter.intro ? ["", letter.intro] : []),
    ...blocks.flatMap((b) => ["", b.text]),
    ...(fresh.length ? ["", "NEW ON THE MAP", ...fresh.map((s) => `${s.name}, ${areaLabelOf(s)}: ${link(s)}`)] : []),
    "",
    `Stop these emails: ${UNSUB}`,
    `${BRAND}${ADDRESS ? `, ${ADDRESS}` : ""}`,
  ].join("\n");
  const [a, b] = [letter.picks.fine, letter.picks.casual];
  const subject = a && b ? `${a.name}, ${b.name} and a wildcard` : `${NEWSLETTER} for ${weekLabel(letter.week)}`;
  return { subject, html, text };
}

/* ---------------------------------------------------------------- sending */

const KEY = () => createHmac("sha256", `unsubscribe:${SECRET}`);
const sign = (email: string) => KEY().update(email.toLowerCase()).digest("base64url").slice(0, 32);
export const unsubscribeUrl = (email: string) => `${SITE}/api/letter/unsubscribe?e=${encodeURIComponent(email)}&t=${sign(email)}`;
export function signatureOk(email: string, t: string) {
  if (!SECRET || !email || !t) return false;
  const a = Buffer.from(sign(email)), b = Buffer.from(t);
  return a.length === b.length && timingSafeEqual(a, b);
}

type Mail = { subject: string; html: string; text: string };
const personal = (m: Mail, to: string, unsub: string) => ({
  from: FROM,
  to: [to],
  reply_to: TEAM,
  subject: m.subject,
  html: m.html.split(UNSUB).join(unsub),
  text: m.text.split(UNSUB).join(unsub),
  headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
});

/** one copy to one person (the team's preview, a test); the unsubscribe link goes to the site */
export async function sendOne(m: Mail, to: string) {
  const r = await fetch(`${RESEND}/emails`, {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify(personal(m, to, `${SITE}/#letter-signup`)),
  }).catch(() => null);
  return !!r?.ok;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * The week's letter to everyone who signed up and hasn't had it, 100 at a time. Each batch is
 * claimed (last_letter) before it goes and released if it fails, so nobody gets it twice. When the
 * email service says no (its daily limit on the free plan), it stops; the next day's run sends the rest.
 */
export async function sendToList(db: SupabaseClient, m: Mail, week: string, budgetMs = 45000) {
  const end = Date.now() + budgetMs;
  const waiting = `last_letter.is.null,last_letter.lt.${week}`;
  // the send has started (Friday's run finishes it if today's stops early)
  const { data: was } = await db.from("letters").select("sent_at, sent_count").eq("week", week).maybeSingle();
  if (!was?.sent_at) await db.from("letters").upsert({ week, sent_at: new Date().toISOString() }, { onConflict: "week" });
  let sent = 0;
  let stopped: string | null = null;
  while (Date.now() < end) {
    const { data, error } = await db.from("subscribers").select("email").or(waiting).order("email").limit(100);
    if (error) {
      stopped = "the sign-up list isn't ready (run the database update)";
      break;
    }
    if (!data?.length) break;
    const { data: mine } = await db.from("subscribers").update({ last_letter: week }).in("email", data.map((d) => d.email)).or(waiting).select("email");
    const to = (mine ?? []).map((d) => d.email as string);
    if (!to.length) continue;
    const r = await fetch(`${RESEND}/emails/batch`, {
      method: "POST",
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify(to.map((e) => personal(m, e, unsubscribeUrl(e)))),
    }).catch(() => null);
    if (!r?.ok) {
      await db.from("subscribers").update({ last_letter: null }).in("email", to);
      const why = r ? await r.text().catch(() => "") : "";
      stopped = r?.status === 429 || /quota|limit/i.test(why) ? "the email service's daily limit (it picks up tomorrow)" : `the email service said no (${r?.status ?? "no answer"})`;
      break;
    }
    sent += to.length;
    await sleep(600); // Resend allows a couple of requests a second
  }
  if (sent) {
    const { data } = await db.from("letters").select("sent_count").eq("week", week).maybeSingle();
    await db.from("letters").update({ sent_count: (data?.sent_count ?? 0) + sent }).eq("week", week);
  }
  return { sent, stopped };
}

/** how many people are on the list (the server can count them; nobody else can read it) */
export async function listSize(db: SupabaseClient) {
  const { count } = await db.from("subscribers").select("email", { count: "exact", head: true });
  return count ?? 0;
}
