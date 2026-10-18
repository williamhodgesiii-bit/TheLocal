import type { Spot } from "./data";
import type { Review } from "./backend";

/**
 * Reviews: the rules and the arithmetic, in one place (README → Reviews has the research).
 *
 * - One paragraph, 100 to 600 characters: long enough to say something specific, short enough
 *   to read on a phone. Yelp's useful reviews average about 460 characters; under 100 rarely help.
 * - A 1–5 score where every step has words. Labeled scales keep a 3 meaning "good" instead of
 *   everything piling up at 4.5, so places actually separate.
 * - "Would you go back?" and "What did you get?" are asked every time: the go-back share and the
 *   dishes people name tell a reader more than a decimal.
 * - Small numbers are shown as what they are (each rating) until there are enough to average,
 *   and rankings pull thin records toward the site average so one 5 can't top the list.
 */
export const REVIEW_MIN = 100;
export const REVIEW_MAX = 600;
export const ORDER_MAX = 3;
export const ORDER_LEN = 40;
export const GOOD_FOR_MAX = 3;
/** below this many reviews a place shows each rating instead of an average */
export const AVG_MIN = 3;
/** reviews posted per account per day (the database enforces the same) */
export const DAILY_MAX = 5;

export const RATING_WORDS: Record<number, { short: string; long: string }> = {
  5: { short: "One of the best", long: "One of the best in town. Worth a special trip." },
  4: { short: "Great", long: "Great. I'd send a friend." },
  3: { short: "Good", long: "Good. Worth it if you're nearby." },
  2: { short: "Just okay", long: "Just okay. I wouldn't go out of my way." },
  1: { short: "Skip it", long: "Skip it." },
};
/** the words for an average, matching the number as it's shown (one decimal) */
export function wordFor(raw: number) {
  const avg = Math.round(raw * 10) / 10;
  if (avg >= 4.6) return RATING_WORDS[5].short;
  if (avg >= 3.8) return RATING_WORDS[4].short;
  if (avg >= 2.9) return RATING_WORDS[3].short;
  if (avg >= 2) return RATING_WORDS[2].short;
  return RATING_WORDS[1].short;
}

export const GOOD_FOR: { id: string; label: string }[] = [
  { id: "date", label: "Date night" },
  { id: "groups", label: "Groups" },
  { id: "kids", label: "Kids" },
  { id: "solo", label: "Eating solo" },
  { id: "lunch", label: "Quick lunch" },
  { id: "late", label: "Late night" },
  { id: "outside", label: "Sitting outside" },
  { id: "work", label: "Working" },
];
export const GOOD_FOR_LABEL = Object.fromEntries(GOOD_FOR.map((g) => [g.id, g.label])) as Record<string, string>;

export const REPORT_REASONS: { id: string; label: string }[] = [
  { id: "not-firsthand", label: "They didn't go" },
  { id: "conflict", label: "Owner, staff or a rival wrote it" },
  { id: "abusive", label: "Abusive, hateful or personal" },
  { id: "spam", label: "Spam or an ad" },
  { id: "other", label: "Something else" },
];

export type SubKey = "taste" | "service" | "vibe";
/** the three optional detail scores, worded for the kind of place */
export function subLabels(spot: Pick<Spot, "genres">): Record<SubKey, string> {
  const g = spot.genres;
  const food = g.some((x) => x !== "drinks" && x !== "coffee");
  const taste = g[0] === "coffee" ? (food ? "Coffee & food" : "Coffee") : g.includes("drinks") ? (food ? "Food & drinks" : "Drinks") : g.every((x) => x === "sweets") ? "Treats" : "Food";
  return { taste, service: "Service", vibe: "Vibe" };
}

export type ReviewDraft = {
  rating: number;
  goBack: boolean | null;
  body: string;
  ordered: string[];
  visited: string; // "2026-09"
  goodFor: string[];
  sub: Partial<Record<SubKey, number>>;
  affirmed: boolean;
};

/** one paragraph: line breaks become spaces, runs of spaces become one */
export const oneParagraph = (s: string) => s.replace(/\s*\n+\s*/g, " ").replace(/ {2,}/g, " ");

/** The visit months a review can name: this month back two years. */
export function visitMonths(now = new Date()): { id: string; label: string }[] {
  const out: { id: string; label: string }[] = [];
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const id = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({ id, label: i === 0 ? "This month" : i === 1 ? "Last month" : d.toLocaleDateString("en-US", { month: "long", year: "numeric" }) });
  }
  return out;
}
export const monthLabel = (ym?: string) => {
  if (!ym) return "";
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

/** What's missing, in plain words, or null when it's ready to post. */
export function checkDraft(d: ReviewDraft): string | null {
  if (!d.rating) return "Pick a score.";
  if (d.goBack === null) return "Would you go back? Pick yes or no.";
  if (!d.ordered.length) return "Add what you got (one is fine).";
  const n = d.body.trim().length;
  if (n < REVIEW_MIN) return `A little more, please: ${REVIEW_MIN - n} more characters. What stood out, and one thing to know before going?`;
  if (n > REVIEW_MAX) return `One paragraph: trim ${n - REVIEW_MAX} characters.`;
  if (!d.visited) return "When did you go?";
  if (!d.affirmed) return "Check the box to say you went yourself and have no tie to the place.";
  return null;
}

/** The same dish named two ways ("the burger", "Burger") counts once. */
const dishKey = (s: string) => s.toLowerCase().replace(/^(the|a|an)\s+/, "").replace(/[^a-z0-9]+/g, " ").trim();
export const cleanDish = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, ORDER_LEN);

export type ReviewSummary = {
  count: number;
  avg: number;
  /** index 0 is 5s, index 4 is 1s */
  dist: number[];
  /** share who'd go back, 0–100, once enough people answered */
  goBack: number | null;
  goBackN: number;
  subs: Partial<Record<SubKey, { avg: number; n: number }>>;
  orders: { name: string; n: number }[];
  goodFor: { id: string; label: string; n: number }[];
  /** the last 12 months, when it's enough to say something and differs from all time */
  recent: { avg: number; count: number } | null;
};

export function summarize(list: Review[], now = Date.now()): ReviewSummary {
  const count = list.length;
  const avg = count ? list.reduce((a, r) => a + r.rating, 0) / count : 0;
  const dist = [5, 4, 3, 2, 1].map((n) => list.filter((r) => r.rating === n).length);
  const answered = list.filter((r) => typeof r.goBack === "boolean");
  const goBack = answered.length >= AVG_MIN ? Math.round((100 * answered.filter((r) => r.goBack).length) / answered.length) : null;
  const subs: ReviewSummary["subs"] = {};
  for (const k of ["taste", "service", "vibe"] as SubKey[]) {
    const v = list.map((r) => r.sub?.[k]).filter((x): x is number => !!x);
    if (v.length >= AVG_MIN) subs[k] = { avg: v.reduce((a, b) => a + b, 0) / v.length, n: v.length };
  }
  const dishes = new Map<string, { name: string; n: number }>();
  for (const r of list)
    for (const o of new Set(r.ordered ?? [])) {
      const k = dishKey(o);
      if (!k) continue;
      const cur = dishes.get(k);
      dishes.set(k, { name: cur?.name ?? cleanDish(o), n: (cur?.n ?? 0) + 1 });
    }
  const orders = [...dishes.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)).slice(0, 6);
  const gf = new Map<string, number>();
  for (const r of list) for (const g of new Set(r.goodFor ?? [])) if (GOOD_FOR_LABEL[g]) gf.set(g, (gf.get(g) ?? 0) + 1);
  const goodFor = [...gf.entries()].map(([id, n]) => ({ id, label: GOOD_FOR_LABEL[id], n })).sort((a, b) => b.n - a.n).slice(0, 4);
  const year = list.filter((r) => now - +new Date(r.createdAt) < 365 * 86400e3);
  const yAvg = year.length ? year.reduce((a, r) => a + r.rating, 0) / year.length : 0;
  const recent = year.length >= AVG_MIN && year.length < count && Math.abs(yAvg - avg) >= 0.3 ? { avg: yAvg, count: year.length } : null;
  return { count, avg, dist, goBack, goBackN: answered.length, subs, orders, goodFor, recent };
}

export const critical = (r: Review) => r.rating <= 2 || r.goBack === false;

export type ReviewSort = "helpful" | "newest" | "highest" | "lowest";
export const SORTS: { id: ReviewSort; label: string }[] = [
  { id: "helpful", label: "Most helpful" },
  { id: "newest", label: "Newest" },
  { id: "highest", label: "Highest" },
  { id: "lowest", label: "Lowest" },
];

/** helpful votes, gently discounted with age so a few old favorites don't sit on top forever */
function usefulness(r: Review, now: number) {
  const months = Math.max(0, (now - +new Date(r.createdAt)) / (30 * 86400e3));
  return ((r.helpful ?? 0) + 1) / Math.pow(months + 2, 0.5) + (r.body.length >= 200 ? 0.15 : 0);
}

export function sortReviews(list: Review[], by: ReviewSort, now = Date.now()) {
  const newest = (a: Review, b: Review) => b.createdAt.localeCompare(a.createdAt);
  const out = [...list];
  if (by === "newest") return out.sort(newest);
  if (by === "highest") return out.sort((a, b) => b.rating - a.rating || newest(a, b));
  if (by === "lowest") return out.sort((a, b) => a.rating - b.rating || newest(a, b));
  return out.sort((a, b) => usefulness(b, now) - usefulness(a, now) || newest(a, b));
}

/**
 * The two shown before "See all": the most useful recent ones, and, when at least one in ten
 * reviews is critical, the most useful critical one. An all-praise top looks bought.
 */
export function featured(list: Review[], now = Date.now()): Review[] {
  const ranked = sortReviews(list, "helpful", now);
  const top = ranked.slice(0, 2);
  const crit = ranked.filter(critical);
  if (list.length >= 4 && crit.length / list.length >= 0.1 && !top.some(critical)) top[1] = crit[0];
  return top;
}

/** For ranking places: an average pulled toward the site's when there are only a few reviews. */
export function rankScore(r: { avg: number; count: number } | undefined, siteAvg: number, weight = 5) {
  if (!r?.count) return 0;
  return (weight * siteAvg + r.avg * r.count) / (weight + r.count);
}
export function siteAverage(all: Record<string, { avg: number; count: number }>) {
  let sum = 0;
  let n = 0;
  for (const r of Object.values(all)) {
    sum += r.avg * r.count;
    n += r.count;
  }
  return n ? sum / n : 3.8;
}

/** a review also stamps the passport, with the verdict it implies (never over one already chosen) */
export const verdictFor = (rating: number, goBack: boolean | null) =>
  goBack === false || rating <= 2 ? ("meh" as const) : rating >= 5 ? ("loved" as const) : ("liked" as const);
