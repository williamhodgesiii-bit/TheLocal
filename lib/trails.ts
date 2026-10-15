import { TOWN_BY_ID, type Area, type Spot, type TownId } from "./data";

/**
 * Trails: a handful of places with a theme, small enough to finish.
 * Some run for a season (a reason to go this month); some are always open.
 */
export interface Trail {
  id: string;
  title: string;
  line: string;
  /** last day, local date (YYYY-MM-DD); open-ended when missing */
  ends?: string;
  /** the places on it, from the current list */
  pick: (spots: Spot[], areas: Area[]) => Spot[];
  /** finished when every place is stamped, unless this says otherwise */
  done?: (stamped: Spot[], areas: Area[]) => boolean;
}

const top = (list: Spot[], n: number) => [...list].sort((a, b) => b.pop - a.pop).slice(0, n);
const townOf = (s: Spot, areas: Area[]) => areas.find((a) => a.id === s.area)?.town;
const OVER: TownId[] = ["homewood", "mountain-brook", "vestavia-hills"];

export const TRAILS: Trail[] = [
  {
    id: "fall-coffee-2026",
    title: "Fall coffee trail",
    line: "Six local roasters and cafés. Finish by November 30.",
    ends: "2026-11-30",
    pick: (spots) => top(spots.filter((s) => s.genres.includes("coffee")), 6),
  },
  {
    id: "over-the-mountain",
    title: "Over the mountain",
    line: `One plate each in ${OVER.map((t) => TOWN_BY_ID[t].label).join(", ").replace(/, ([^,]*)$/, " and $1")}.`,
    pick: (spots, areas) => spots.filter((s) => OVER.includes(townOf(s, areas) as TownId)),
    done: (stamped, areas) => OVER.every((t) => stamped.some((s) => townOf(s, areas) === t)),
  },
  {
    id: "meat-and-three",
    title: "Meat-and-threes & soul",
    line: "Birmingham's lunch tradition, one plate lunch at a time.",
    pick: (spots) => top(spots.filter((s) => s.genres.includes("southern")), 6),
  },
];

export function trailProgress(t: Trail, spots: Spot[], areas: Area[], stamped: (id: string) => boolean, today = new Date()) {
  const list = t.pick(spots, areas);
  const got = list.filter((s) => stamped(s.id));
  const goal = t.id === "over-the-mountain" ? OVER.length : list.length;
  const have = t.id === "over-the-mountain" ? OVER.filter((tw) => got.some((s) => townOf(s, areas) === tw)).length : got.length;
  const finished = t.done ? t.done(got, areas) : list.length > 0 && got.length === list.length;
  const daysLeft = t.ends ? Math.ceil((new Date(`${t.ends}T23:59:59`).getTime() - today.getTime()) / 86400000) : null;
  return { list, have, goal, finished, daysLeft, open: daysLeft === null || daysLeft >= 0 };
}
