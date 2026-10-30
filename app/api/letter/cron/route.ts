import { TEAM, freeze, listSize, loadLetter, missing, render, sendOne, sendToList, serviceDb, SITE } from "@/lib/letter-mail";
import { addWeeks, localClock, thursdayOf, weekLabel } from "@/lib/letter";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * The Thursday Plate's clock. Vercel calls this once a day (vercel.json → crons, about 8 a.m. in
 * Birmingham); it decides what the day calls for:
 * - Tuesday: the team gets a copy of Thursday's letter, with a link to change it or pause the week.
 * - Thursday (7 a.m. on): the letter goes to everyone on the list.
 * - Friday and Saturday: anyone Thursday's send didn't reach (the email service's daily limit) gets it then.
 * Set CRON_SECRET in Vercel and only Vercel can call it; without it, calling it early does nothing.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Not allowed" }, { status: 401 });
  const need = missing();
  const db = serviceDb();
  if (need.length || !db) return Response.json({ skipped: `needs ${need.join(", ")}` });

  const now = new Date();
  const { day, hour } = localClock(now);
  const desk = `${SITE}/admin?tab=letter`;

  if (day === 2) {
    const week = addWeeks(thursdayOf(now), 1);
    const loaded = await loadLetter(db, week);
    if (loaded.letter.paused) return Response.json({ week, skipped: "paused" });
    await freeze(db, loaded.letter);
    // once a week, however often this is called
    const { data: claimed } = await db.from("letters").update({ previewed_at: now.toISOString() }).eq("week", week).is("previewed_at", null).select("week");
    if (!claimed?.length) return Response.json({ week, skipped: "already previewed" });
    const n = await listSize(db);
    const banner = `<b>Team copy.</b> This goes to ${n} ${n === 1 ? "person" : "people"} on ${weekLabel(week, { weekday: "long", month: "long", day: "numeric" })} around 8 a.m. To swap a pick, write a line about one, or skip the week: <a href="${desk}">open the desk</a>.`;
    const m = render(loaded, banner);
    const ok = await sendOne({ ...m, subject: `Preview: ${m.subject}` }, TEAM);
    if (!ok) await db.from("letters").update({ previewed_at: null }).eq("week", week);
    return Response.json({ week, previewed: ok });
  }

  if ((day === 4 && hour >= 7) || day === 5 || day === 6) {
    const week = thursdayOf(now);
    const loaded = await loadLetter(db, week);
    if (loaded.letter.paused) return Response.json({ week, skipped: "paused" });
    // Friday and Saturday only finish a send that started Thursday; they never start one late
    if (day !== 4 && !loaded.row?.sent_at) return Response.json({ week, skipped: "it didn't go out Thursday, so it waits for next week" });
    await freeze(db, loaded.letter);
    const result = await sendToList(db, render(loaded), week);
    return Response.json({ week, ...result });
  }

  return Response.json({ skipped: "nothing to do today" });
}
