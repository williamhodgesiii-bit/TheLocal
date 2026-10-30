import { BRAND, NEWSLETTER } from "@/lib/brand";
import { SITE, serviceDb, signatureOk } from "@/lib/letter-mail";

export const dynamic = "force-dynamic";

/**
 * Stop The Thursday Plate. The link in each email opens a page with one button (so a mail
 * scanner opening the link doesn't unsubscribe anyone); the button, and mail apps' own
 * one-click unsubscribe (List-Unsubscribe-Post), POST here and it's done.
 */
const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const page = (title: string, body: string, status = 200) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title>
<style>body{margin:0;background:#f4efe1;color:#22201c;font:16px/1.5 Arial,Helvetica,sans-serif}main{max-width:460px;margin:12vh auto;padding:28px 24px;background:#fbf8ef;border:1px solid #22201c}h1{margin:0 0 8px;font:400 26px/1.2 Georgia,serif}p{margin:8px 0}button{margin-top:12px;padding:12px 22px;border:0;background:#2c5a43;color:#fff;font:700 16px Arial,sans-serif;cursor:pointer}a{color:#2c5a43}</style></head>
<body><main><p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#b23a24;font-weight:bold">${esc(BRAND)}</p>${body}</main></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }
  );

function who(req: Request) {
  const u = new URL(req.url);
  const e = (u.searchParams.get("e") ?? "").trim();
  return { e, ok: signatureOk(e, u.searchParams.get("t") ?? "") };
}

export async function GET(req: Request) {
  const { e, ok } = who(req);
  if (!ok) return page("That link didn't work", `<h1>That link didn't work</h1><p>Use the "Stop these emails" link in the newest email, or write to us and we'll take you off.</p>`, 400);
  return page(
    `Stop ${NEWSLETTER}?`,
    `<h1>Stop ${esc(NEWSLETTER)}?</h1><p>${esc(e)} won't get it anymore.</p><form method="post"><button>Stop the emails</button></form><p><a href="${SITE}">Never mind, back to the map</a></p>`
  );
}

export async function POST(req: Request) {
  const { e, ok } = who(req);
  const db = serviceDb();
  if (!ok || !db) return page("That didn't work", `<h1>That didn't work</h1><p>Write to us and we'll take you off the list.</p>`, ok ? 501 : 400);
  const { error } = await db.from("subscribers").delete().eq("email", e);
  if (error) return page("That didn't work", `<h1>That didn't go through</h1><p>Try the button again in a minute, or write to us.</p>`, 500);
  return page("You're off the list", `<h1>You're off the list</h1><p>${esc(e)} won't get ${esc(NEWSLETTER)} anymore. If you change your mind, sign up again at the bottom of the map.</p><p><a href="${SITE}">Back to the map</a></p>`);
}
