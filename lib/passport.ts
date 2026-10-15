import type { Area, Spot } from "./data";

/**
 * The Plate Passport: a stamp for every local place you've eaten at.
 * Built on what the research says brings people back to something they do weekly, not daily:
 * visible progress that's finishable (12 of 78), milestones, a forgiving weekly streak,
 * and short themed trails. No leaderboards, no daily pressure.
 */
export type Stamps = Record<string, { at: string; verdict?: "loved" | "liked" | "meh" }>;

export const MILESTONES = [1, 5, 10, 25, 50] as const;

export function milestoneName(n: number, total: number) {
  if (n >= total) return "Every plate in town";
  return { 1: "First stamp", 5: "Regular", 10: "Local", 25: "Neighborhood legend", 50: "Plate collector" }[n] ?? `${n} plates`;
}

/** progress toward the next milestone (or the whole town) */
export function nextMilestone(count: number, total: number) {
  const next = [...MILESTONES, total].find((m) => m > count) ?? total;
  const prev = [0, ...MILESTONES].filter((m) => m <= count).pop() ?? 0;
  return { next, prev, left: Math.max(0, next - count) };
}

/** stamps per neighborhood, for the stamp grid */
export function byNeighborhood(spots: Spot[], areas: Area[], stamps: Stamps) {
  return areas
    .map((a) => {
      const here = spots.filter((s) => s.area === a.id);
      return { area: a, total: here.length, got: here.filter((s) => stamps[s.id]).length };
    })
    .filter((x) => x.total > 0);
}

const WEEK = 7 * 86400000;
// weeks start Monday, local time
const weekNo = (d: Date) => {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
  return Math.floor((m.getTime() - new Date(2020, 0, 6).getTime()) / WEEK + 0.5);
};

/**
 * Weeks in a row with at least one stamp. Forgiving on purpose: this week doesn't count
 * against you until it's over, and one quiet week in a run doesn't break it.
 */
export function weeklyStreak(stamps: Stamps, now = new Date()) {
  const weeks = new Set(Object.values(stamps).map((s) => weekNo(new Date(s.at))));
  if (!weeks.size) return { weeks: 0, thisWeek: false };
  const cur = weekNo(now);
  const thisWeek = weeks.has(cur);
  let w = thisWeek ? cur : cur - 1;
  let run = 0;
  let skipped = false;
  while (w >= 0) {
    if (weeks.has(w)) run++;
    else if (!skipped && run > 0 && weeks.has(w - 1)) skipped = true;
    else break;
    w--;
  }
  return { weeks: run, thisWeek };
}

/** places to stamp next: well-loved, close to ones you liked, not yet visited */
export function suggestions(spots: Spot[], stamps: Stamps, saved: string[], n = 3) {
  const liked = spots.filter((s) => stamps[s.id]?.verdict === "loved" || stamps[s.id]?.verdict === "liked");
  const genres = new Set(liked.flatMap((s) => s.genres));
  return spots
    .filter((s) => !stamps[s.id])
    .map((s) => ({ s, score: s.pop + (saved.includes(s.id) ? 40 : 0) + (s.genres.some((g) => genres.has(g)) ? 15 : 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.s);
}
