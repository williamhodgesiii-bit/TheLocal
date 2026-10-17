// One-tap Supabase setup, so nothing has to be pasted into the dashboard (its editors
// don't take a paste on a phone). Run by .github/workflows/setup-supabase.yml.
//
// Does, in order: the database (supabase/schema.sql) → sign-in settings (site URL,
// redirect URLs, 6-digit codes) → the free Resend email sender (if RESEND_API_KEY is set)
// → the sign-in email templates → Google sign-in (if its keys are set). Safe to run again.
//
// Env: SUPABASE_ACCESS_TOKEN (required), PROJECT (project URL or ref, required),
//      RESEND_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SITE_URL, SENDER_EMAIL (optional)
import { readFileSync } from "node:fs";

const API = process.env.SUPABASE_API_BASE || "https://api.supabase.com";
const TOKEN = (process.env.SUPABASE_ACCESS_TOKEN || "").trim();
const RAW = (process.env.PROJECT || "").trim();
const REF = (RAW.match(/^https?:\/\/([a-z0-9]{20})\.supabase\.co/i)?.[1] || RAW.match(/project\/([a-z0-9]{20})/i)?.[1] || RAW).toLowerCase();
const SITE = (process.env.SITE_URL || "https://www.theplatenextdoor.com").replace(/\/$/, "");
const SENDER = process.env.SENDER_EMAIL || "emails@theplatenextdoor.com";
const RESEND = (process.env.RESEND_API_KEY || "").trim();
const G_ID = (process.env.GOOGLE_CLIENT_ID || "").trim();
const G_SECRET = (process.env.GOOGLE_CLIENT_SECRET || "").trim();

const ok = (m) => console.log(`✓ ${m}`);
const warn = (m) => console.log(`! ${m}`);
function fail(m) {
  console.log(`✗ ${m}`);
  process.exit(1);
}

if (!TOKEN) fail("Add the SUPABASE_ACCESS_TOKEN secret first (Supabase → Account → Access Tokens → Generate new token).");
if (!/^[a-z0-9]{20}$/.test(REF)) fail(`"${RAW}" doesn't look like a Supabase project. Paste the Project URL, like https://abcdefghijklmnopqrst.supabase.co`);

async function call(method, path, body) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* not json */
  }
  return { ok: r.ok, status: r.status, json, text };
}
const why = (r) => (r.json?.message || r.json?.error || r.text || `HTTP ${r.status}`).toString().slice(0, 300);

// 0) the token and project work
const me = await call("GET", `/v1/projects/${REF}`);
if (me.status === 401) fail("Supabase didn't accept the access token. Generate a new one and update the SUPABASE_ACCESS_TOKEN secret.");
if (!me.ok) fail(`Couldn't open project ${REF}: ${why(me)}`);
ok(`Project found: ${me.json?.name ?? REF}`);

// 1) database tables, security rules and staff list
const sql = readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8");
const db = await call("POST", `/v1/projects/${REF}/database/query`, { query: sql, read_only: false });
if (!db.ok) fail(`Database setup didn't go through: ${why(db)}`);
ok("Database ready (members, passport, saved places, reviews, photos, staff)");

// 2) sign-in basics
const base = {
  site_url: SITE,
  uri_allow_list: [`${SITE}/**`, `${SITE.replace("://www.", "://")}/**`, "http://localhost:3000/**"].join(","),
  external_email_enabled: true,
  mailer_otp_length: 6,
  mailer_otp_exp: 3600,
};
const s1 = await call("PATCH", `/v1/projects/${REF}/config/auth`, base);
if (!s1.ok) fail(`Sign-in settings didn't save: ${why(s1)}`);
ok(`Sign-in settings saved (site ${SITE}, 6-digit codes good for an hour)`);

// 3) the free email sender (Resend), which also unlocks templates on the free plan
if (RESEND) {
  const s2 = await call("PATCH", `/v1/projects/${REF}/config/auth`, {
    smtp_host: "smtp.resend.com",
    smtp_port: "465",
    smtp_user: "resend",
    smtp_pass: RESEND,
    smtp_admin_email: SENDER,
    smtp_sender_name: "The Plate Next Door",
  });
  if (!s2.ok) fail(`Email sender didn't save: ${why(s2)}`);
  ok(`Email sender connected: The Plate Next Door <${SENDER}> via Resend (free)`);
} else {
  const cur = await call("GET", `/v1/projects/${REF}/config/auth`);
  if (cur.ok && cur.json?.smtp_host) ok(`Email sender already connected: ${cur.json.smtp_sender_name ?? ""} <${cur.json.smtp_admin_email}> (${cur.json.smtp_host})`);
  else warn("No RESEND_API_KEY secret yet, so the email sender wasn't connected. Add it and run this again.");
}

// 4) the sign-in email (same for new and returning people)
const html = readFileSync(new URL("../supabase/templates/sign-in-code.html", import.meta.url), "utf8");
const subject = "{{ .Token }} is your Plate Next Door code";
const s3 = await call("PATCH", `/v1/projects/${REF}/config/auth`, {
  mailer_subjects_confirmation: subject,
  mailer_templates_confirmation_content: html,
  mailer_subjects_magic_link: subject,
  mailer_templates_magic_link_content: html,
});
if (!s3.ok) {
  if (!RESEND) fail(`Email templates are locked until the email sender is connected (free). Add the RESEND_API_KEY secret, then run this again. (${why(s3)})`);
  fail(`Email templates didn't save: ${why(s3)}`);
}
ok(`Sign-in email set: "${subject}"`);

// 5) Google sign-in (optional)
if (G_ID && G_SECRET) {
  const s4 = await call("PATCH", `/v1/projects/${REF}/config/auth`, {
    external_google_enabled: true,
    external_google_client_id: G_ID,
    external_google_secret: G_SECRET,
  });
  if (!s4.ok) fail(`Google sign-in didn't save: ${why(s4)}`);
  ok("Google sign-in switched on");
} else if (G_ID || G_SECRET) {
  warn("Google sign-in needs both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET; skipped.");
}

// 6) read it back
const cfg = await call("GET", `/v1/projects/${REF}/config/auth`);
if (cfg.ok) {
  const c = cfg.json || {};
  console.log("\nNow set in Supabase:");
  console.log(`  site URL ............ ${c.site_url}`);
  console.log(`  code length ......... ${c.mailer_otp_length}`);
  console.log(`  email sender ........ ${c.smtp_host ? `${c.smtp_sender_name} <${c.smtp_admin_email}> (${c.smtp_host})` : "Supabase default (2 emails an hour; add RESEND_API_KEY)"}`);
  console.log(`  email subject ....... ${c.mailer_subjects_magic_link}`);
  console.log(`  Google sign-in ...... ${c.external_google_enabled ? "on" : "off"}`);
}
console.log(`\nVercel needs: NEXT_PUBLIC_SUPABASE_URL = https://${REF}.supabase.co, plus the publishable and secret keys from Supabase → Settings → API Keys.`);
