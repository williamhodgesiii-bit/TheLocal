import { UNSUB, loadLetter, publicDb, render, SITE } from "@/lib/letter-mail";
import { thursdayOf } from "@/lib/letter";

export const dynamic = "force-dynamic";

/** The Thursday Plate in a browser ("View in a browser" in the email): ?week=2026-10-29, or this week's. */
export async function GET(req: Request) {
  const asked = new URL(req.url).searchParams.get("week") ?? "";
  const week = /^\d{4}-\d{2}-\d{2}$/.test(asked) && new Date(`${asked}T00:00:00Z`).getUTCDay() === 4 ? asked : thursdayOf(new Date());
  const { html } = render(await loadLetter(publicDb(), week));
  return new Response(html.split(UNSUB).join(`${SITE}/#letter-signup`), {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, s-maxage=300, stale-while-revalidate=3600" },
  });
}
