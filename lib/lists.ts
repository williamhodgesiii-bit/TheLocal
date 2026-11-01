import { AREA_BY_ID, GENRE_BY_ID, TOWN_BY_ID, locationsOf, type GenreId, type Spot, type TownId } from "./data";
import { COLLECTION_BY_ID, COLLECTIONS } from "./collections";
import { fitsSlot } from "./letter";
import type { BeenMap } from "./backend";

/**
 * Lists: a member's own shelves of places, Letterboxd-style, that Surprise me can spin from.
 * A list is a name plus either rules ("$–$$ in Vestavia I haven't been to"), places picked by
 * hand, or both. Rules keep a list fresh as places are added; picks are always in.
 */
export type ListRules = {
  /** any of these kinds of food */
  genres?: GenreId[];
  /** any of these towns ("t:homewood") or neighborhoods */
  where?: string[];
  prices?: (1 | 2 | 3 | 4)[];
  /** any of these occasions (collection ids, plus "fine" and "casual") */
  vibes?: string[];
  /** leave out places already stamped */
  notBeen?: boolean;
  /** only places on the want-to-try list */
  wantOnly?: boolean;
};

export type SpinList = {
  id: string;
  title: string;
  rules: ListRules;
  /** places added by hand (always in the list) */
  spotIds: string[];
  /** shown on the member's page */
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
};

export const LIST_TITLE_MAX = 40;
export const LISTS_MAX = 30;
export const LIST_PICKS_MAX = 100;

/** occasions a list can ask for: the two Thursday Plate slots, then the front-page collections */
export const VIBES: { id: string; label: string; match: (s: Spot) => boolean }[] = [
  { id: "fine", label: "Fine dining", match: fitsSlot.fine },
  { id: "casual", label: "Casual", match: fitsSlot.casual },
  ...COLLECTIONS.map((c) => ({ id: c.id, label: c.title, match: c.match })),
];
const VIBE_BY_ID = Object.fromEntries(VIBES.map((v) => [v.id, v]));

export const hasRules = (r: ListRules) =>
  !!(r.genres?.length || r.where?.length || r.prices?.length || r.vibes?.length || r.notBeen || r.wantOnly);

const townOf = (area: string): TownId | undefined => AREA_BY_ID[area]?.town;
function inWhere(s: Spot, where: string[]) {
  return locationsOf(s).some((l) => where.some((w) => (w.startsWith("t:") ? townOf(l.area) === w.slice(2) : l.area === w)));
}

/** does a place fit a list's rules (picks aside) */
export function fitsRules(s: Spot, r: ListRules, ctx: { been: BeenMap; saved: string[] }) {
  if (!hasRules(r)) return false;
  if (r.genres?.length && !s.genres.some((g) => r.genres!.includes(g))) return false;
  if (r.prices?.length && !r.prices.includes(s.price)) return false;
  if (r.where?.length && !inWhere(s, r.where)) return false;
  if (r.vibes?.length && !r.vibes.some((v) => VIBE_BY_ID[v]?.match(s))) return false;
  if (r.notBeen && ctx.been[s.id]) return false;
  if (r.wantOnly && !ctx.saved.includes(s.id)) return false;
  return true;
}

/** the places in a list, best-loved first; hand picks are always in */
export function placesIn(list: Pick<SpinList, "rules" | "spotIds">, pool: Spot[], ctx: { been: BeenMap; saved: string[] }) {
  const picked = new Set(list.spotIds);
  return pool.filter((s) => picked.has(s.id) || fitsRules(s, list.rules, ctx)).sort((a, b) => b.pop - a.pop);
}

/** "$–$$ · Vestavia Hills · not been yet": a list's rules in a few words */
export function rulesLine(r: ListRules, extra = 0): string {
  const bits: string[] = [];
  if (r.vibes?.length) bits.push(r.vibes.map((v) => VIBE_BY_ID[v]?.label ?? v).join(" or "));
  if (r.genres?.length) bits.push(r.genres.map((g) => GENRE_BY_ID[g]?.short ?? g).join(", "));
  if (r.prices?.length) {
    const p = [...r.prices].sort();
    bits.push(p.length > 1 && p[p.length - 1] - p[0] === p.length - 1 ? `${"$".repeat(p[0])}–${"$".repeat(p[p.length - 1])}` : p.map((x) => "$".repeat(x)).join(", "));
  }
  if (r.where?.length) bits.push(r.where.map(whereLabel).join(", "));
  if (r.wantOnly) bits.push("want to try");
  if (r.notBeen) bits.push("not been yet");
  if (extra) bits.push(`+${extra} picked`);
  return bits.join(" · ");
}

export function whereLabel(w: string) {
  if (w.startsWith("t:")) return TOWN_BY_ID[w.slice(2) as TownId]?.label ?? w.slice(2);
  return AREA_BY_ID[w]?.label ?? w;
}

/** one-tap starting points on the new-list screen */
export const PRESETS: { title: string; rules: ListRules }[] = [
  { title: "Casual", rules: { vibes: ["casual"] } },
  { title: "Fine dining", rules: { vibes: ["fine"] } },
  { title: "Vestavia", rules: { where: ["t:vestavia-hills"] } },
  { title: "Date night", rules: { vibes: ["date-night"] } },
  { title: "Patio", rules: { vibes: ["patio"] } },
  { title: "Cheap eats", rules: { prices: [1] } },
  { title: "Never been", rules: { notBeen: true } },
  { title: "Coffee", rules: { genres: ["coffee"] } },
];

export const newListId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `l-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`);

/** keeps stored lists sane (they come from storage and the database) */
export function cleanList(x: Partial<SpinList> & { id: string }): SpinList {
  const r = (x.rules ?? {}) as ListRules;
  const arr = <T,>(v: unknown, ok: (t: T) => boolean): T[] | undefined => (Array.isArray(v) ? (v as T[]).filter(ok).slice(0, 40) : undefined);
  const rules: ListRules = {
    genres: arr<GenreId>(r.genres, (g) => !!GENRE_BY_ID[g]),
    where: arr<string>(r.where, (w) => typeof w === "string" && w.length < 60),
    prices: arr<1 | 2 | 3 | 4>(r.prices, (p) => [1, 2, 3, 4].includes(p)),
    vibes: arr<string>(r.vibes, (v) => !!VIBE_BY_ID[v] || !!COLLECTION_BY_ID[v]),
    notBeen: !!r.notBeen || undefined,
    wantOnly: !!r.wantOnly || undefined,
  };
  for (const k of Object.keys(rules) as (keyof ListRules)[]) if (rules[k] === undefined || (Array.isArray(rules[k]) && !(rules[k] as unknown[]).length)) delete rules[k];
  const now = new Date().toISOString();
  return {
    id: x.id,
    title: String(x.title ?? "").slice(0, LIST_TITLE_MAX),
    rules,
    spotIds: Array.isArray(x.spotIds) ? Array.from(new Set(x.spotIds.filter((s) => typeof s === "string"))).slice(0, LIST_PICKS_MAX) : [],
    isPublic: x.isPublic ?? true,
    createdAt: x.createdAt ?? now,
    updatedAt: x.updatedAt ?? now,
  };
}
