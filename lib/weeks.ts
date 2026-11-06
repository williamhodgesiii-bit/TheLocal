import { addWeeks, thursdayOf } from "./letter";

/** the first Thursday Plate */
export const FIRST_LETTER = "2026-10-29";

/** every Thursday Plate so far, newest first */
export function letterWeeks(now = new Date()): string[] {
  const out: string[] = [];
  for (let w = thursdayOf(now); w >= FIRST_LETTER; w = addWeeks(w, -1)) out.push(w);
  return out;
}

/** a real, already-published letter week ("2026-11-05"), not a made-up date */
export function isLetterWeek(week: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) return false;
  return week >= FIRST_LETTER && week <= thursdayOf(now) && thursdayOf(new Date(`${week}T18:00:00Z`)) === week;
}
