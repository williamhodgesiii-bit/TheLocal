import type { Spot } from "./data";
import { HONORS } from "./honors";

/**
 * Collections: ways in for people who know the occasion before the cuisine.
 * Every one is built from the place data (tags, kinds, price), never hand-padded,
 * and only shows when it has enough places to be worth opening.
 */
export interface Collection {
  id: string;
  title: string;
  /** one line under the title: what it is, said like a neighbor would */
  line: string;
  match: (s: Spot) => boolean;
  /** hours of the day it leads the page (local time), plus weekend-only leads */
  leads?: { from: number; to: number; weekend?: boolean }[];
}

const has = (s: Spot, ...tags: string[]) => tags.some((t) => s.tags.includes(t));

export const COLLECTIONS: Collection[] = [
  {
    id: "classics",
    title: "Birmingham classics",
    line: "Where locals take people who are visiting.",
    match: (s) => has(s, "classic", "Alabama classic", "original") || s.pop >= 90,
  },
  {
    id: "date-night",
    title: "Date night",
    line: "Dim rooms, good wine, worth dressing up a little.",
    match: (s) => has(s, "date night"),
    leads: [{ from: 16, to: 23 }],
  },
  {
    id: "special",
    title: "Special occasion",
    line: "Birthdays, anniversaries, the parents in town. Book ahead.",
    match: (s) => s.price === 4 || has(s, "tasting menu", "special occasion"),
    leads: [{ from: 17, to: 21, weekend: true }],
  },
  {
    id: "cocktails",
    title: "Cocktail bars",
    line: "Bartenders who take it seriously, and rooms worth staying in.",
    match: (s) => !!s.drinks?.includes("cocktails"),
    leads: [{ from: 18, to: 24 }],
  },
  {
    id: "patio",
    title: "Patio weather",
    line: "Eat outside while it's nice.",
    match: (s) => has(s, "patio", "dog-friendly"),
    leads: [{ from: 15, to: 21 }],
  },
  {
    id: "cheap",
    title: "Cheap & good",
    line: "A real meal, one $ on the bill.",
    match: (s) => s.price === 1 && !s.genres.every((g) => g === "coffee" || g === "drinks"),
    leads: [{ from: 11, to: 14 }],
  },
  {
    id: "brunch",
    title: "Brunch & biscuits",
    line: "Slow mornings, long tables.",
    match: (s) => s.genres.includes("brunch") || has(s, "brunch", "breakfast"),
    leads: [{ from: 7, to: 12, weekend: true }],
  },
  {
    id: "work",
    title: "Coffee to work from",
    line: "Outlets, wifi and nobody rushing you out.",
    match: (s) => has(s, "work-friendly"),
    leads: [{ from: 6, to: 11 }],
  },
  {
    id: "kids",
    title: "Bring the kids",
    line: "Booths, pizza, ice cream and patience.",
    match: (s) => has(s, "kid-friendly", "family"),
    leads: [{ from: 16, to: 19 }],
  },
  {
    id: "groups",
    title: "Big groups",
    line: "Room for everybody, and drinks while you wait.",
    match: (s) => has(s, "groups", "game day"),
  },
  {
    id: "honors",
    title: "Award winners",
    line: "Michelin, James Beard and best-in-America lists, a short drive away.",
    match: (s) => !!HONORS[s.id]?.length,
  },
  {
    id: "pints",
    title: "Breweries & taprooms",
    line: "Local beer, usually with a food truck out front.",
    match: (s) => !!s.drinks?.includes("brewery"),
    leads: [{ from: 16, to: 22 }],
  },
];

export const COLLECTION_BY_ID = Object.fromEntries(COLLECTIONS.map((c) => [c.id, c])) as Record<string, Collection>;

/** Collections in the order that fits right now: what suits this hour first, then the rest. */
export function collectionsFor(now: Date, pool: Spot[], min = 3, timely = true) {
  const h = now.getHours();
  const weekend = now.getDay() === 0 || now.getDay() === 6;
  // without the visitor's own clock (the prebuilt page), keep the plain order
  const fits = (c: Collection) => timely && (c.leads?.some((l) => h >= l.from && h < l.to && (!l.weekend || weekend)) ?? false);
  return COLLECTIONS.map((c, i) => ({ c, i, spots: pool.filter(c.match), now: fits(c) }))
    .filter((x) => x.spots.length >= min)
    .sort((a, b) => Number(b.now) - Number(a.now) || a.i - b.i)
    .map(({ c, spots, now }) => ({ ...c, spots: [...spots].sort((a, b) => b.pop - a.pop), now }));
}

/** What to say up top, by the clock. */
export function greeting(now: Date) {
  const h = now.getHours();
  if (h < 5) return "Up late?";
  if (h < 11) return "Good morning.";
  if (h < 14) return "Lunch time.";
  if (h < 17) return "Good afternoon.";
  if (h < 22) return "Good evening.";
  return "Up late?";
}

/**
 * This week's plate: one place a week, the same for everyone in town, new every Thursday
 * (the day The Thursday Plate email goes out). Well-loved places come up more often,
 * and none repeats within eight weeks.
 */
export function plateOfTheWeek(day: Date, pool: Spot[]): Spot | null {
  if (!pool.length) return null;
  const list = [...pool].sort((a, b) => a.id.localeCompare(b.id));
  const week = weekKey(day);
  const recent: string[] = [];
  let pick: Spot | null = null;
  for (let w = week - 7; w <= week; w++) {
    const options = list.filter((s) => !recent.includes(s.id));
    const weights = options.map((s) => Math.pow(s.pop / 100, 2));
    let r = mulberry(w) * weights.reduce((a, b) => a + b, 0);
    pick = options[options.length - 1];
    for (let i = 0; i < options.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        pick = options[i];
        break;
      }
    }
    recent.push(pick.id);
  }
  return pick;
}

/** weeks since a Thursday, counted in local time, so the pick turns over Thursday at midnight */
export function weekKey(day: Date) {
  const local = Date.UTC(day.getFullYear(), day.getMonth(), day.getDate());
  return Math.floor(local / 86400000 / 7); // day 0, 1 Jan 1970, was a Thursday
}

/** the Thursday this week's plate went up */
export function weekStart(day: Date) {
  const d = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 3) % 7));
  return d;
}

// a small seeded random number in [0, 1) from the day number
function mulberry(seed: number) {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
