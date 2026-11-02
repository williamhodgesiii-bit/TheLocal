import { SPOTS, distanceKm } from "@/lib/data";
import { readGoogleCache, takeGoogle, writeGoogleCache } from "@/lib/googleBudget";
import type { GoogleBody } from "../route";

/**
 * The weekly Google lookup (vercel.json runs it Monday mornings): each place's exact pin,
 * whether it's closed for good, and its first photo. One Text Search Pro call per place, about
 * 600 a month, each one counted against the monthly cap (lib/googleBudget.ts). Saved in the
 * database for /api/pins to hand out. Calling it again within six days does nothing, so nobody
 * can run it up. Set CRON_SECRET in Vercel and only Vercel can call it at all.
 *
 * A Google match only moves a pin if it lands within 3 km of where we already had it. Only
 * "Permanently closed" takes a place off.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const MAX_MOVE_KM = 3;
const SIX_DAYS = 6 * 86400e3;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Not allowed" }, { status: 401 });
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return Response.json({ skipped: "no GOOGLE_PLACES_API_KEY" });
  const saved = await readGoogleCache<GoogleBody>("pins");
  if (saved && Date.now() - new Date(saved.updatedAt).getTime() < SIX_DAYS) return Response.json({ skipped: "looked up less than six days ago" });

  const body: GoogleBody = { enabled: true, pins: { ...(saved?.body.pins ?? {}) }, closed: [], photos: { ...(saved?.body.photos ?? {}) } };
  const checked = new Set<string>();
  let looked = 0;
  let stop = false;
  const queue = [...SPOTS];
  await Promise.all(
    Array.from({ length: 10 }, async () => {
      for (let s = queue.shift(); s && !stop; s = queue.shift()) {
        if (!(await takeGoogle("search"))) {
          stop = true; // this month's allowance is used up, or the count can't be checked
          return;
        }
        try {
          const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "places.location,places.businessStatus,places.photos" },
            body: JSON.stringify({ textQuery: `${s.name}, ${s.address}, Birmingham area, AL`, maxResultCount: 1 }),
            cache: "no-store",
            signal: AbortSignal.timeout(8000),
          });
          if (!r.ok) {
            if (r.status === 429 || r.status === 403) stop = true; // Google's own daily cap, or the key is off
            continue;
          }
          looked++;
          checked.add(s.id);
          const p = (await r.json()).places?.[0];
          if (!p?.location) continue;
          const at: [number, number] = [+p.location.latitude.toFixed(5), +p.location.longitude.toFixed(5)];
          if (distanceKm(at, s.coords) > MAX_MOVE_KM) continue;
          body.pins[s.id] = at;
          if (p.businessStatus === "CLOSED_PERMANENTLY") body.closed.push(s.id);
          const ph = p.photos?.[0];
          if (ph?.name) body.photos[s.id] = { name: ph.name, author: ph.authorAttributions?.[0]?.displayName || "Google user" };
        } catch {
          /* leave this place as it was */
        }
      }
    })
  );
  // places not reached this time keep last week's answer
  body.closed = [...(saved?.body.closed ?? []).filter((id) => !checked.has(id)), ...body.closed];
  // keep what we found even if the run was cut short; the next week picks up the rest
  const ok = looked > 0 && (await writeGoogleCache("pins", body));
  return Response.json({ looked, saved: ok, stoppedEarly: stop });
}
