import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase-env";
import { BRAND, FOUNDER, NEWSLETTER } from "@/lib/brand";
import { SPOT_BY_ID } from "@/lib/data";
import { rateLimited } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/**
 * The "For restaurants" form (claim a listing, report a change, featured or sponsor interest):
 * saves it with the others (partner_leads) and emails the team, with Reply going to the sender.
 * Needs SUPABASE_SECRET_KEY and RESEND_API_KEY; without them it answers 501 and the site saves
 * the message straight to the database as before.
 */

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.theplatenextdoor.com").replace(/\/$/, "");
const TO = process.env.NOTIFY_EMAIL || FOUNDER.email || "emails@theplatenextdoor.com";
const FROM = `${BRAND} <${process.env.SENDER_EMAIL || "emails@theplatenextdoor.com"}>`;
const RESEND = process.env.RESEND_API_URL || "https://api.resend.com";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const WHAT: Record<string, string> = {
  neighbor: "Wants to claim their free listing",
  regular: "Interested in Partner ($39 a month)",
  institution: "Interested in Featured ($99 a month)",
  newsletter: `Interested in sponsoring ${NEWSLETTER}`,
  correction: "A listing is closed or wrong",
  patron: "A member wants to be a founding Patron",
  verify: "A member asked to be verified",
  invites: "Interested in inviting local reviewers (Plate Invites)",
};
const SUBJECT: Record<string, string> = {
  neighbor: "Listing claim",
  regular: "Partner interest",
  institution: "Featured interest",
  newsletter: "Sponsor interest",
  correction: "Listing correction",
  patron: "Patron list",
  verify: "Verification request",
  invites: "Plate Invites interest",
};

export async function POST(req: Request) {
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const key = process.env.RESEND_API_KEY;
  if (!SUPABASE_URL || !secret || !key) return Response.json({ error: "Not configured" }, { status: 501 });
  if (rateLimited(req, "contact", 5)) return Response.json({ error: "That's a lot of messages. Try again in a few minutes." }, { status: 429 });

  const b = await req.json().catch(() => ({}));
  const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
  const lead = { name: clip(b.name, 80), business: clip(b.business, 120), email: clip(b.email, 160).toLowerCase(), tier: WHAT[b.tier] ? (b.tier as string) : "neighbor", message: clip(b.message, 2000) || null };
  if (!lead.name || !lead.business || !EMAIL_RE.test(lead.email)) return Response.json({ error: "Add your name, the business and your email." }, { status: 400 });
  const spot = typeof b.spot === "string" ? SPOT_BY_ID[b.spot] : undefined;

  const admin = createClient(SUPABASE_URL, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const saved = await admin.from("partner_leads").insert({ ...lead, message: spot ? `${lead.message ?? ""}${lead.message ? "\n\n" : ""}(sent from ${spot.name}'s page)` : lead.message });
  if (saved.error) return Response.json({ error: "Couldn't save it." }, { status: 500 });

  const rows: [string, string][] = [
    ["What", WHAT[lead.tier]],
    ["Business", lead.business],
    ...(spot ? ([["Their page", `${SITE}/spot/${spot.id}`]] as [string, string][]) : []),
    ["From", `${lead.name} (${lead.email})`],
    ...(lead.message ? ([["Message", lead.message]] as [string, string][]) : []),
  ];
  const link = (v: string) => (/^https?:\/\//i.test(v) ? `<a href="${esc(v)}" style="color:#2c5a43">${esc(v)}</a>` : esc(v).replace(/\n/g, "<br>"));
  const html = `<div style="margin:0;padding:24px 12px;background:#f4efe1;font-family:Arial,Helvetica,sans-serif;color:#22201c">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fbf8ef;border:1px solid #22201c">
    <tr><td style="padding:26px 28px 6px">
      <p style="margin:0 0 6px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#b23a24;font-weight:bold">${esc(SUBJECT[lead.tier])}</p>
      <h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:26px;line-height:1.2">${esc(lead.business)}</h1>
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;line-height:1.5">
        ${rows.map(([k, v]) => `<tr><td style="padding:5px 12px 5px 0;vertical-align:top;color:#6b665b;white-space:nowrap">${esc(k)}</td><td style="padding:5px 0">${link(v)}</td></tr>`).join("")}
      </table>
    </td></tr>
    <tr><td style="padding:14px 28px 24px;font-size:12px;line-height:1.5;color:#6b665b">Sent from the For restaurants form. Reply to this email to write back to ${esc(lead.name)}.</td></tr>
  </table>
</div>`;
  const text = [`${SUBJECT[lead.tier]}: ${lead.business}`, "", ...rows.map(([k, v]) => `${k}: ${v}`)].join("\n");
  const r = await fetch(`${RESEND}/emails`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [TO], reply_to: lead.email, subject: `${SUBJECT[lead.tier]}: ${lead.business}`, html, text }),
  }).catch(() => null);
  // it's saved either way; the team sees it in the database if the email didn't go
  return Response.json({ ok: true, emailed: !!r?.ok });
}

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
