import type { Spot } from "./data";
import type { LetterWeek } from "./backend";

/**
 * The Thursday Plate: three places a week, the same on the front page and in the email.
 * One fine dining, one casual, one wildcard. Each week has its picks ready on its own (seeded by
 * the week, so everyone in town sees the same three and nothing repeats within eight weeks); the
 * team can swap any of them in the Verification desk (the `letters` table), and those win.
 * Weeks run Thursday to Wednesday on Birmingham's clock, whoever's looking.
 */

export type Slot = "fine" | "casual" | "wild";
export const SLOTS: { id: Slot; label: string; line: string }[] = [
  { id: "fine", label: "Fine dining", line: "Worth dressing up for" },
  { id: "casual", label: "Casual", line: "Any night of the week" },
  { id: "wild", label: "Wildcard", line: "Something different" },
];

const NOT_A_MEAL = new Set(["coffee", "sweets", "drinks"]);
/** somewhere you'd go for dinner (or lunch), not only a coffee, a scoop or a drink */
const isMeal = (s: Spot) => s.genres.some((g) => !NOT_A_MEAL.has(g));

/** which places can fill each slot */
export const fitsSlot: Record<Slot, (s: Spot) => boolean> = {
  fine: (s) => isMeal(s) && s.price >= 3,
  casual: (s) => isMeal(s) && s.price <= 2,
  wild: () => true,
};

/**
 * How likely a place comes up: well-loved places more often for fine dining and casual. The
 * wildcard leans the other way, toward the ones fewer people know, the bars, coffee and sweets,
 * and the ones worth the drive.
 */
const WEIGHT: Record<Slot, (s: Spot) => number> = {
  fine: (s) => Math.pow(s.pop / 100, 2),
  casual: (s) => Math.pow(s.pop / 100, 2),
  wild: (s) => Math.max(0.05, 1.15 - s.pop / 100) * (isMeal(s) ? 1 : 2.2) * (s.tags.some((t) => t === "worth-the-drive" || t === "new") ? 1.6 : 1),
};

export const TZ = "America/Chicago";
const DAY = 864e5;
/** "2026-10-29" → days since 1 Jan 1970 (a Thursday) */
const dayNo = (date: string) => Math.round(Date.parse(`${date}T00:00:00Z`) / DAY);
const dateOf = (n: number) => new Date(n * DAY).toISOString().slice(0, 10);

/** today's date in Birmingham, "2026-10-30" */
export function localDate(now: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
/** the Thursday this week's letter went out (or goes out today), "2026-10-29" */
export function thursdayOf(now: Date) {
  const n = dayNo(localDate(now));
  return dateOf(n - (((n % 7) + 7) % 7));
}
export const addWeeks = (week: string, k: number) => dateOf(dayNo(week) + 7 * k);
/** the weekday in Birmingham, 0 Sunday … 6 Saturday, and the hour */
export function localClock(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short", hour: "numeric", hourCycle: "h23" }).formatToParts(now);
  const wd = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  return { day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd), hour: Number(parts.find((p) => p.type === "hour")?.value ?? 0) };
}
export const weekLabel = (week: string, o: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }) =>
  new Date(`${week}T12:00:00Z`).toLocaleDateString("en-US", { ...o, timeZone: "UTC" });

// a small seeded random number in [0, 1)
function mulberry(seed: number) {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function weighted(options: Spot[], weight: (s: Spot) => number, r: number) {
  if (!options.length) return null;
  const w = options.map(weight);
  let left = r * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < options.length; i++) {
    left -= w[i];
    if (left <= 0) return options[i];
  }
  return options[options.length - 1];
}

export type Picks = Record<Slot, Spot | null>;
/** the week the three-pick letter started */
const FIRST = dayNo("2026-10-29") / 7;

/**
 * The week's three on their own, from the places we picked and checked (community places come
 * in when the team picks one). `taken` keeps out places the team already put in another slot.
 */
export function autoPicks(week: string, pool: Spot[], taken: string[] = []): Picks {
  const list = pool.filter((s) => !s.addedBy).sort((a, b) => a.id.localeCompare(b.id));
  const w0 = dayNo(week) / 7;
  // every week is played out from the first letter, so each one knows what the last eight really were
  let recent: string[][] = [];
  let out: Picks = { fine: null, casual: null, wild: null };
  for (let w = Math.min(FIRST, w0) - 8; w <= w0; w++) {
    out = { fine: null, casual: null, wild: null };
    const last8 = recent.flat();
    for (const [i, { id }] of SLOTS.entries()) {
      const used = [...last8, ...Object.values(out).map((p) => p?.id), ...(w === w0 ? taken : [])];
      out[id] = weighted(list.filter((s) => fitsSlot[id](s) && !used.includes(s.id)), WEIGHT[id], mulberry(w * 3 + i));
    }
    recent = [...recent, Object.values(out).flatMap((p) => (p ? [p.id] : []))].slice(-7);
  }
  return out;
}

export type Letter = { week: string; picks: Picks; notes: Partial<Record<Slot, string>>; intro?: string; paused: boolean; chosen: Partial<Record<Slot, boolean>> };

/** the week's letter: what the team chose, and the automatic picks for the rest */
export function letterFor(week: string, pool: Spot[], row?: LetterWeek | null): Letter {
  const byId = new Map(pool.map((s) => [s.id, s]));
  const chosen: Partial<Record<Slot, Spot>> = {};
  for (const { id } of SLOTS) {
    const s = row?.[id] ? byId.get(row[id]!) : undefined;
    if (s) chosen[id] = s;
  }
  const auto = autoPicks(week, pool, Object.values(chosen).map((s) => s!.id));
  const picks = Object.fromEntries(SLOTS.map(({ id }) => [id, chosen[id] ?? auto[id]])) as Picks;
  return {
    week,
    picks,
    notes: row?.notes ?? {},
    intro: row?.intro,
    paused: !!row?.paused,
    chosen: Object.fromEntries(SLOTS.map(({ id }) => [id, !!chosen[id]])),
  };
}

/** a `letters` row as the app uses it */
export const mapLetter = (r: Record<string, any>): LetterWeek => ({
  week: String(r.week).slice(0, 10), fine: r.fine ?? undefined, casual: r.casual ?? undefined, wild: r.wild ?? undefined,
  notes: { fine: r.fine_note ?? undefined, casual: r.casual_note ?? undefined, wild: r.wild_note ?? undefined }, intro: r.intro ?? undefined,
  paused: !!r.paused, sentAt: r.sent_at ?? undefined, sentCount: r.sent_count ?? undefined,
});
