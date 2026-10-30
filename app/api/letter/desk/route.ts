import { TEAM, listSize, loadLetter, missing, render, sendOne, serviceDb, staffEmail } from "@/lib/letter-mail";
import { thursdayOf, weekLabel } from "@/lib/letter";

export const dynamic = "force-dynamic";

/** For the Verification desk (staff only): GET says whether the letter can go out and to how many; POST sends a test copy. */
export async function GET(req: Request) {
  const db = serviceDb();
  if (!db) return Response.json({ ready: false, missing: missing(), people: null });
  if (!(await staffEmail(db, req))) return Response.json({ error: "Staff only" }, { status: 403 });
  const need = missing();
  return Response.json({ ready: need.length === 0, missing: need, people: await listSize(db) });
}

export async function POST(req: Request) {
  const db = serviceDb();
  if (!db) return Response.json({ error: `Needs ${missing().join(", ")}` }, { status: 501 });
  const me = await staffEmail(db, req);
  if (!me) return Response.json({ error: "Staff only" }, { status: 403 });
  if (!process.env.RESEND_API_KEY) return Response.json({ error: "Needs RESEND_API_KEY in Vercel" }, { status: 501 });
  const body = await req.json().catch(() => ({}));
  const week = typeof body.week === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.week) ? body.week : thursdayOf(new Date());
  const m = render(await loadLetter(db, week), `<b>Test copy</b> of ${weekLabel(week, { month: "long", day: "numeric" })}'s letter, sent from the desk.`);
  const ok = await sendOne({ ...m, subject: `Test: ${m.subject}` }, me);
  return ok ? Response.json({ ok: true, to: me }) : Response.json({ error: `The email service didn't take it. Check RESEND_API_KEY (or write to ${TEAM}).` }, { status: 502 });
}
