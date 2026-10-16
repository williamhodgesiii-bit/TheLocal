/**
 * Awards, with where we read them. Only listed places, only things a reader can check.
 * Update when a new guide comes out (Michelin American South: Oct 21, 2026).
 * Leave a place out when an honor is disputed (e.g. a withdrawn nomination).
 */
export interface Honor {
  /** short, as it goes on the badge */
  label: string;
  year: number;
  /** who for, when it's a person rather than the restaurant */
  who?: string;
  /** press: a national best-of list (Esquire, The New York Times, Garden & Gun, Food Network) */
  kind: "michelin" | "beard" | "press";
  source: string;
}

const MICHELIN_2025 = "https://bhamnow.com/2025/11/04/11-birmingham-restaurants-recognized-by-michelin-guide/";
const BEARD_2026_FINALIST = "https://bhamnow.com/2026/03/31/bottega-named-james-beard-award-finalist-for-outstanding-hospitality/";
const BEARD_2026_SEMI = "https://bhamnow.com/2026/01/21/5-birmingham-chefs-restaurants-make-2026-james-beard-semifinalist-list/";
const STITT = "https://en.wikipedia.org/wiki/Frank_Stitt";
const HASTINGS = "https://www.bhamwiki.com/w/Chris_Hastings";

const michelin = (label: string): Honor => ({ label, year: 2025, kind: "michelin", source: MICHELIN_2025 });

export const HONORS: Record<string, Honor[]> = {
  ovenbird: [michelin("Michelin Bib Gourmand"), { label: "James Beard Best Chef: South", who: "Chris Hastings", year: 2012, kind: "beard", source: HASTINGS }],
  "hot-and-hot": [michelin("Michelin Recommended"), { label: "James Beard Best Chef: South", who: "Chris Hastings", year: 2012, kind: "beard", source: HASTINGS }],
  bottega: [
    michelin("Michelin Recommended"),
    { label: "Michelin Outstanding Service Award", who: "Pardis Stitt", year: 2025, kind: "michelin", source: MICHELIN_2025 },
    { label: "James Beard finalist, Outstanding Hospitality", year: 2026, kind: "beard", source: BEARD_2026_FINALIST },
    { label: "James Beard Best Chef: Southeast", who: "Frank Stitt", year: 2001, kind: "beard", source: STITT },
  ],
  "chez-fonfon": [michelin("Michelin Recommended"), { label: "James Beard Best Chef: Southeast", who: "Frank Stitt", year: 2001, kind: "beard", source: STITT }],
  "automatic-seafood": [michelin("Michelin Recommended")],
  helen: [michelin("Michelin Recommended")],
  bayonet: [
    michelin("Michelin Bib Gourmand"),
    { label: "James Beard semifinalist, Outstanding Chef", who: "Rob McDaniel", year: 2026, kind: "beard", source: BEARD_2026_SEMI },
    { label: "New York Times 50 best restaurants in America", year: 2025, kind: "press", source: "https://bhamnow.com/2025/09/09/local-seafood-restaurant-named-among-50-best-restaurants-in-america-by-new-york-times/" },
  ],
  "la-fete": [michelin("Michelin Bib Gourmand"), { label: "James Beard semifinalist, Best Chef: South", who: "Kristen Hall", year: 2026, kind: "beard", source: BEARD_2026_SEMI }],
  "pizza-grace": [
    michelin("Michelin Bib Gourmand"),
    { label: "James Beard semifinalist, Best Chef: South", who: "Geri-Martha & Ryan O'Hara", year: 2026, kind: "beard", source: BEARD_2026_SEMI },
  ],
  "current-charcoal": [michelin("Michelin Recommended")],
  reve: [michelin("Michelin Recommended")],
  "house-of-found-objects": [{ label: "Esquire Best Bars in America", year: 2026, kind: "press", source: "https://bhamnow.com/2026/06/09/esquire-names-house-of-found-objects-among-14-best-bars-in-america/" }],
  adios: [{ label: "James Beard semifinalist, Outstanding Professional in Beverage Service", year: 2025, kind: "beard", source: "https://bhamnow.com/2025/01/22/birmingham-bar-adios-named-james-beard-foundation-semifinalist/" }],
  "salud-taqueria": [{ label: "Garden & Gun 30 new restaurants to try", year: 2025, kind: "press", source: "https://bhamnow.com/2025/08/01/3-birmingham-establishments-make-garden-guns-30-new-restaurants-to-try-now/" }],
  tortugas: [{ label: "Food Network: Alabama's best pizza slice", year: 2025, kind: "press", source: "https://bhamnow.com/2025/08/19/tortugas-named-best-pizza-in-alabama-by-food-network/" }],
};

export const honorsOf = (id: string) => HONORS[id] ?? [];
