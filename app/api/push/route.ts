import { connect } from "node:http2";
import { createPrivateKey, sign } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "@/lib/supabase-env";
import { SPOT_BY_ID, canonicalSpotId } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * Sends a new note (a reply, a follow request…) to the member's iPhone. A Supabase database
 * webhook calls this on every insert into notifications (README → iPhone app). The body only
 * names the note: this route reads it back with the server key and claims it, so each note is
 * pushed once, only while it's fresh, and only to the phones of the person it's for.
 *
 * Needs SUPABASE_SECRET_KEY plus the Apple key: APNS_KEY (the .p8 file's text), APNS_KEY_ID,
 * APPLE_TEAM_ID, and IOS_BUNDLE_ID if it isn't com.theplatenextdoor.app. PUSH_WEBHOOK_SECRET,
 * when set, must match the webhook's x-push-secret header.
 */

/** what goes to the phone; reactions and plain follows stay in the app */
const PUSHED = ["comment", "reply", "mention", "request", "accepted", "gift"] as const;
type Kind = (typeof PUSHED)[number];

type Note = { id: number; user_id: string; actor_id: string | null; kind: string; spot_id: string | null; detail: string | null };

const BUNDLE = process.env.IOS_BUNDLE_ID || "com.theplatenextdoor.app";
const HOSTS = { production: "https://api.push.apple.com", sandbox: "https://api.sandbox.push.apple.com" } as const;
type Env = keyof typeof HOSTS;

export async function POST(req: Request) {
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const { APNS_KEY, APNS_KEY_ID, APPLE_TEAM_ID, PUSH_WEBHOOK_SECRET } = process.env;
  if (!SUPABASE_URL || !secret || !APNS_KEY || !APNS_KEY_ID || !APPLE_TEAM_ID) return Response.json({ error: "Not configured" }, { status: 501 });
  if (PUSH_WEBHOOK_SECRET && req.headers.get("x-push-secret") !== PUSH_WEBHOOK_SECRET) return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { type?: string; table?: string; record?: { id?: unknown } } | null;
  const id = Number(body?.record?.id);
  if (body?.table !== "notifications" || body.type !== "INSERT" || !Number.isSafeInteger(id)) return Response.json({ ok: true, skipped: "not a new note" });

  const admin = createClient(SUPABASE_URL, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  // claim it: only a note from the last ten minutes that hasn't gone out yet
  const { data: note } = await admin
    .from("notifications")
    .update({ pushed_at: new Date().toISOString() })
    .eq("id", id)
    .is("pushed_at", null)
    .is("read_at", null)
    .gt("created_at", new Date(Date.now() - 10 * 60000).toISOString())
    .select("id, user_id, actor_id, kind, spot_id, detail")
    .maybeSingle<Note>();
  if (!note || !(PUSHED as readonly string[]).includes(note.kind)) return Response.json({ ok: true, skipped: "nothing to send" });

  const { data: phones } = await admin.from("push_tokens").select("token, env").eq("user_id", note.user_id);
  if (!phones?.length) return Response.json({ ok: true, skipped: "no phones" });

  const { data: actor } = note.actor_id
    ? await admin.from("members").select("handle, display_name").eq("id", note.actor_id).maybeSingle<{ handle: string; display_name: string | null }>()
    : { data: null };
  const msg = message(note, actor);
  const jwt = providerToken(APNS_KEY, APNS_KEY_ID, APPLE_TEAM_ID);

  let sent = 0;
  for (const p of phones as { token: string; env: Env }[]) {
    const first = p.env === "sandbox" ? "sandbox" : "production";
    let r = await send(first, p.token, msg, jwt);
    // a build run from Xcode gets a sandbox address; try there once and remember it
    if (r.reason === "BadDeviceToken" && first === "production") {
      r = await send("sandbox", p.token, msg, jwt);
      if (r.status === 200) await admin.from("push_tokens").update({ env: "sandbox" }).eq("token", p.token);
    }
    if (r.status === 200) sent++;
    else if (r.status === 410 || ["BadDeviceToken", "DeviceTokenNotForTopic", "Unregistered"].includes(r.reason ?? "")) await dropPhone(admin, p.token);
  }
  return Response.json({ ok: true, sent });
}

const dropPhone = (admin: SupabaseClient, token: string) => admin.from("push_tokens").delete().eq("token", token).then(() => {});

/** the words on the lock screen, and the page a tap opens */
function message(n: Note, actor: { handle: string; display_name: string | null } | null) {
  const who = actor?.display_name?.trim() || (actor ? `@${actor.handle}` : "Someone");
  const place = n.spot_id ? SPOT_BY_ID[canonicalSpotId(n.spot_id)]?.name : undefined;
  const said = n.detail ? `“${n.detail.length > 140 ? `${n.detail.slice(0, 139)}…` : n.detail}”` : "";
  const quote = said && `: ${said}`;
  const lines: Record<Kind, string> = {
    comment: `commented on your review${place ? ` of ${place}` : ""}${quote}`,
    reply: `replied to your comment${place ? ` on ${place}` : ""}${quote}`,
    mention: `mentioned you${place ? ` on ${place}` : ""}${quote}`,
    request: "asked to follow you",
    accepted: "said yes: you're following them now",
    gift: `sent you a gift card${place ? ` to ${place}` : ""}. Check your email.${said && ` ${said}`}`,
  };
  const kind = n.kind as Kind;
  const path =
    kind === "accepted" && actor ? `/u/${actor.handle}` : (kind === "comment" || kind === "reply" || kind === "mention") && place ? `/spot/${canonicalSpotId(n.spot_id!)}` : "/friends?tab=activity";
  return {
    aps: { alert: { title: who, body: lines[kind] }, sound: "default", "thread-id": kind === "request" || kind === "accepted" ? "people" : (n.spot_id ?? kind) },
    path,
  };
}

/* ------------------------------------------------------------------ Apple */

let cached: { jwt: string; at: number } | null = null;
/** Apple's sign-in for senders: an ES256 token, made at most every 40 minutes (Apple allows one per 20–60) */
function providerToken(pem: string, keyId: string, teamId: string) {
  if (cached && Date.now() - cached.at < 40 * 60000) return cached.jwt;
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const at = Date.now();
  const head = `${b64({ alg: "ES256", kid: keyId })}.${b64({ iss: teamId, iat: Math.floor(at / 1000) })}`;
  const key = createPrivateKey(pem.replace(/\\n/g, "\n"));
  const sig = sign("sha256", Buffer.from(head), { key, dsaEncoding: "ieee-p1363" }).toString("base64url");
  cached = { jwt: `${head}.${sig}`, at };
  return cached.jwt;
}

function send(env: Env, token: string, payload: object, jwt: string): Promise<{ status: number; reason?: string }> {
  return new Promise((resolve) => {
    const client = connect(HOSTS[env]);
    const done = (r: { status: number; reason?: string }) => {
      client.close();
      resolve(r);
    };
    client.on("error", () => done({ status: 0, reason: "connection" }));
    client.setTimeout(8000, () => done({ status: 0, reason: "timeout" }));
    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${token}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": BUNDLE,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    });
    let status = 0;
    let text = "";
    req.on("response", (h) => (status = Number(h[":status"])));
    req.setEncoding("utf8");
    req.on("data", (c: string) => (text += c));
    req.on("end", () => {
      let reason: string | undefined;
      try {
        reason = text ? (JSON.parse(text) as { reason?: string }).reason : undefined;
      } catch {
        /* no body */
      }
      done({ status, reason });
    });
    req.on("error", () => done({ status: 0, reason: "request" }));
    req.end(JSON.stringify(payload));
  });
}
