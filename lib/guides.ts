/**
 * Guides: programmatic, data-built landing pages that target the way people
 * actually search — "best seafood in Birmingham", "date night restaurants
 * Birmingham", "where to eat in Avondale".
 *
 * The rule that keeps this from being thin spam: every guide is built from the
 * real place list, ranked by how well-loved each spot is, and a guide only
 * publishes when it has at least MIN_GUIDE genuinely qualifying places
 * (see publishable()). A city/cuisine swapped into boilerplate would get the
 * whole site demoted; a real, ranked, hand-checked list earns the opposite.
 */
import { AREAS, AREA_BY_ID, GENRES, SPOTS, TOWNS, TOWN_BY_ID, locationsOf, type GenreId, type Spot } from "./data";
import { COLLECTIONS } from "./collections";
import { honorsOf } from "./honors";

export type GuideKind = "cuisine" | "occasion" | "neighborhood" | "town";

export interface Guide {
  slug: string;
  kind: GuideKind;
  /** short human label, e.g. "Seafood", "Avondale" */
  label: string;
  /** keyword phrase for titles/intros, e.g. "seafood & oysters" */
  kw: string;
  /** the H1 on the page */
  title: string;
  /** the <title> (the brand suffix is added by the layout template) */
  metaTitle: string;
  metaDescription: string;
  /** a sentence of real local context (a neighborhood or cuisine note) */
  context?: string;
  /** the matching places, best-loved first */
  spots: () => Spot[];
}

/** A guide needs at least this many real places before it's worth publishing. */
export const MIN_GUIDE = 4;

const YEAR = new Date().getFullYear();
const rank = (list: Spot[]) => [...list].sort((a, b) => b.pop - a.pop);
const and = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/* ------------------------------------------------------------------ cuisines */

const CUISINE: Record<GenreId, { slug: string; kw: string }> = {
  southern: { slug: "southern-food", kw: "Southern & soul food" },
  bbq: { slug: "barbecue", kw: "barbecue" },
  burgers: { slug: "burgers", kw: "burgers & sandwiches" },
  pizza: { slug: "pizza", kw: "pizza" },
  italian: { slug: "italian", kw: "Italian food" },
  seafood: { slug: "seafood", kw: "seafood & oysters" },
  steaks: { slug: "steakhouses", kw: "steakhouses" },
  latin: { slug: "mexican", kw: "Mexican & Latin food" },
  asian: { slug: "asian", kw: "Asian food" },
  mediterranean: { slug: "mediterranean", kw: "Greek & Mediterranean food" },
  french: { slug: "french", kw: "French food" },
  brunch: { slug: "breakfast-and-brunch", kw: "breakfast & brunch" },
  sweets: { slug: "bakeries", kw: "bakeries & dessert" },
  coffee: { slug: "coffee-shops", kw: "coffee shops" },
  drinks: { slug: "bars", kw: "bars" },
};

const CUISINE_GUIDES: Guide[] = GENRES.map((g): Guide => {
  const m = CUISINE[g.id];
  return {
    slug: m.slug,
    kind: "cuisine",
    label: g.short,
    kw: m.kw,
    title: `The best ${m.kw} in Birmingham`,
    metaTitle: `Best ${m.kw} in Birmingham, AL (${YEAR})`,
    metaDescription: `The best locally owned ${m.kw} in Birmingham, hand-picked and ranked — no chains, nobody pays to rank. ${g.tagline}`,
    context: g.tagline,
    spots: () => rank(SPOTS.filter((s) => s.genres.includes(g.id))),
  };
});

/* ----------------------------------------------------------------- occasions */

const OCCASION: Record<string, { slug: string; title: string; kw: string }> = {
  classics: { slug: "birmingham-classics", title: "Birmingham classics everyone should try", kw: "classic Birmingham restaurants" },
  "date-night": { slug: "date-night", title: "The best date night restaurants in Birmingham", kw: "date night restaurants" },
  special: { slug: "special-occasion", title: "The best special-occasion restaurants in Birmingham", kw: "special-occasion restaurants" },
  cocktails: { slug: "cocktail-bars", title: "The best cocktail bars in Birmingham", kw: "cocktail bars" },
  patio: { slug: "patio-dining", title: "The best patio dining in Birmingham", kw: "patios & outdoor dining" },
  cheap: { slug: "cheap-eats", title: "The best cheap eats in Birmingham", kw: "cheap eats" },
  brunch: { slug: "brunch", title: "The best brunch in Birmingham", kw: "brunch spots" },
  work: { slug: "work-friendly-coffee", title: "The best coffee shops to work from in Birmingham", kw: "coffee shops to work from" },
  kids: { slug: "family-friendly", title: "The best family-friendly restaurants in Birmingham", kw: "family-friendly restaurants" },
  groups: { slug: "big-groups", title: "The best restaurants for big groups in Birmingham", kw: "restaurants for big groups" },
  honors: { slug: "award-winning", title: "Birmingham's Michelin & James Beard restaurants", kw: "award-winning restaurants" },
  pints: { slug: "breweries", title: "The best breweries & taprooms in Birmingham", kw: "breweries & taprooms" },
  wings: { slug: "wings", title: "The best wings & sports bars in Birmingham", kw: "wings & sports bars" },
};

const OCCASION_GUIDES: Guide[] = COLLECTIONS.filter((c) => OCCASION[c.id]).map((c): Guide => {
  const m = OCCASION[c.id];
  return {
    slug: m.slug,
    kind: "occasion",
    label: c.title,
    kw: m.kw,
    title: m.title,
    metaTitle: `${m.title} (${YEAR})`,
    metaDescription: `${c.line} The best locally owned Birmingham spots for ${m.kw}, ranked and checked by hand.`,
    context: c.line,
    spots: () => rank(SPOTS.filter(c.match)),
  };
});

/* -------------------------------------------------------- neighborhoods/towns */

const AREA_SLUG: Record<string, string> = {
  downtown: "downtown",
  southside: "five-points-south",
  lakeview: "lakeview",
  avondale: "avondale",
  homewood: "downtown-homewood",
  edgewood: "edgewood",
  "west-homewood": "west-homewood",
  mtnbrook: "mountain-brook-village",
  englishvillage: "english-village",
  crestline: "crestline",
  cahaba: "cahaba-heights",
  "vestavia-31": "highway-31",
  "rocky-ridge": "rocky-ridge",
  "liberty-park": "liberty-park",
  "patton-chapel": "patton-chapel",
  irondale: "irondale",
};

const NEIGHBORHOOD_GUIDES: Guide[] = AREAS.filter((a) => AREA_SLUG[a.id]).map((a): Guide => {
  const townLabel = a.town ? TOWN_BY_ID[a.town]?.label : "Birmingham";
  return {
    slug: AREA_SLUG[a.id],
    kind: "neighborhood",
    label: a.label,
    kw: `restaurants in ${a.label}`,
    title: `Where to eat in ${a.label}`,
    metaTitle: `Best restaurants in ${a.label}, ${townLabel} (${YEAR})`,
    metaDescription: `Where to eat and drink in ${a.label} (${townLabel}, Alabama). ${a.blurb} Locally owned, hand-picked, no chains.`,
    context: a.blurb,
    spots: () => rank(SPOTS.filter((s) => locationsOf(s).some((l) => l.area === a.id))),
  };
});

// "Worth the drive" is a handful of towns, not one, so it gets no "Where to eat in" page of its own
const TOWN_GUIDES: Guide[] = TOWNS.filter((t) => t.id !== "birmingham" && t.id !== "worth-the-drive").map((t): Guide => ({
  slug: t.id,
  kind: "town",
  label: t.label,
  kw: `restaurants in ${t.label}`,
  title: `Where to eat in ${t.label}`,
  metaTitle: `Best restaurants in ${t.label}, Alabama (${YEAR})`,
  metaDescription: `The best locally owned restaurants, coffee shops and bars in ${t.label}, Alabama. ${t.blurb} Hand-picked, no chains.`,
  context: t.blurb,
  spots: () => rank(SPOTS.filter((s) => locationsOf(s).some((l) => AREA_BY_ID[l.area]?.town === t.id))),
}));

/* -------------------------------------------------------------------- exports */

/** Guides served at /best/[slug] */
export const BEST_GUIDES: Guide[] = [...CUISINE_GUIDES, ...OCCASION_GUIDES];
/** Guides served at /neighborhood/[slug] */
export const PLACE_GUIDES: Guide[] = [...TOWN_GUIDES, ...NEIGHBORHOOD_GUIDES];
export const ALL_GUIDES: Guide[] = [...BEST_GUIDES, ...PLACE_GUIDES];

export const BEST_BY_SLUG: Record<string, Guide> = Object.fromEntries(BEST_GUIDES.map((g) => [g.slug, g]));
export const PLACE_BY_SLUG: Record<string, Guide> = Object.fromEntries(PLACE_GUIDES.map((g) => [g.slug, g]));

/** A guide is worth publishing (and indexing) only once it has real depth. */
export const publishable = (g: Guide) => g.spots().length >= MIN_GUIDE;

export const bestParams = () => BEST_GUIDES.filter(publishable).map((g) => ({ slug: g.slug }));
export const placeParams = () => PLACE_GUIDES.filter(publishable).map((g) => ({ slug: g.slug }));
export const publishableGuides = () => ALL_GUIDES.filter(publishable);

export const hrefOf = (g: Guide) => (g.kind === "cuisine" || g.kind === "occasion" ? `/best/${g.slug}` : `/neighborhood/${g.slug}`);

/** A handful of related, publishable guides to interlink from a guide page. */
export function relatedGuides(g: Guide, n = 8): Guide[] {
  const pub = (list: Guide[]) => list.filter((x) => x.slug !== g.slug && publishable(x));
  const bySize = (list: Guide[]) => [...list].sort((a, b) => b.spots().length - a.spots().length);
  let pool: Guide[];
  if (g.kind === "neighborhood" || g.kind === "town") {
    // nearby places first, then a few cuisines to cross-link
    pool = [...bySize(pub(PLACE_GUIDES)), ...bySize(pub(CUISINE_GUIDES)).slice(0, 4)];
  } else {
    // sibling guides first, then a few neighborhoods
    const siblings = g.kind === "cuisine" ? CUISINE_GUIDES : OCCASION_GUIDES;
    const others = g.kind === "cuisine" ? OCCASION_GUIDES : CUISINE_GUIDES;
    pool = [...bySize(pub(siblings)), ...bySize(pub(others)).slice(0, 4), ...bySize(pub(PLACE_GUIDES)).slice(0, 3)];
  }
  const seen = new Set<string>();
  return pool.filter((x) => (seen.has(x.slug) ? false : (seen.add(x.slug), true))).slice(0, n);
}

/** An answer-first, quotable opening line — the kind AI engines lift verbatim. */
export function guideIntro(g: Guide): string {
  const spots = g.spots();
  const names = spots.slice(0, 3).map((s) => s.name);
  const lead = names.length ? `${and(names)} lead the list` : "";
  if (g.kind === "neighborhood" || g.kind === "town") {
    return `${g.label} has ${spots.length} locally owned places worth a trip, ranked below by how well-loved each one is and checked by hand. ${lead}. No chains, and nobody paid to be here.`;
  }
  return `Birmingham has ${spots.length} standout ${g.kw} worth your time — these are the ones locals actually send people to, ranked by how well-loved each spot is and checked by hand. ${lead}. No chains, nobody pays to rank.`;
}

/** Two or three honest, data-built Q&As — clean, quotable facts for AI answers. */
export function guideFaqs(g: Guide): { q: string; a: string }[] {
  const spots = g.spots();
  if (!spots.length) return [];
  const top = spots[0];
  const next = spots.slice(1, 3).map((s) => s.name);
  const faqs: { q: string; a: string }[] = [];

  if (g.kind === "neighborhood" || g.kind === "town") {
    faqs.push({
      q: `Where should I eat in ${g.label}?`,
      a: `${top.name} is the best-loved spot in ${g.label} — ${top.knownFor.toLowerCase()}.${next.length ? ` ${and(next)} are also worth it.` : ""}`,
    });
  } else {
    faqs.push({
      q: `What is the best ${g.kw} in Birmingham?`,
      a: `${top.name} — ${top.knownFor.toLowerCase()}.${next.length ? ` ${and(next)} round out the top of the list.` : ""} Every place is locally owned and checked by hand.`,
    });
  }

  faqs.push({
    q: `How many ${g.kind === "neighborhood" || g.kind === "town" ? "places" : g.kw} are on this list?`,
    a: `${spots.length}, all locally owned and ranked by how well-loved they are. None of them paid to be included.`,
  });

  const honored = spots.filter((s) => honorsOf(s.id).length);
  if (honored.length) {
    faqs.push({
      q: `Which have a Michelin or James Beard honor?`,
      a: `${and(honored.slice(0, 4).map((s) => s.name))}${honored.length > 4 ? ` and ${honored.length - 4} more` : ""}.`,
    });
  }
  return faqs;
}
