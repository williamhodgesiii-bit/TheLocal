/**
 * Regions: state → city. Turning on a new state is a data change here.
 *  - "live"     curated launch city with an editorial guide
 *  - "founding" open for members to add spots (each one verified before it shows)
 *  - "later"    planned; hidden until we're ready to expand there
 * States without visible cities collect a waitlist.
 */
export type CityStatus = "live" | "founding" | "later";

export interface City {
  id: string; // `${slug}-${state lowercase}`
  slug: string;
  name: string;
  state: string; // USPS code
  center: [number, number];
  zoom: number;
  status: CityStatus;
  nickname?: string;
}

export const STATES: { code: string; name: string }[] = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"], ["CO", "Colorado"],
  ["CT", "Connecticut"], ["DE", "Delaware"], ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"],
  ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"],
  ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"],
  ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"],
  ["NM", "New Mexico"], ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"],
  ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"], ["SD", "South Dakota"], ["TN", "Tennessee"],
  ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"],
  ["WI", "Wisconsin"], ["WY", "Wyoming"],
].map(([code, name]) => ({ code, name }));

const c = (slug: string, name: string, state: string, center: [number, number], status: CityStatus = "founding", nickname?: string, zoom = 12.5): City => ({
  id: `${slug}-${state.toLowerCase()}`,
  slug,
  name,
  state,
  center,
  zoom,
  status,
  nickname,
});

export const CITIES: City[] = [
  c("birmingham", "Birmingham", "AL", [33.497, -86.782], "live", "The Magic City"),
  c("huntsville", "Huntsville", "AL", [34.7304, -86.5861], "later", "Rocket City"),
  c("montgomery", "Montgomery", "AL", [32.3792, -86.3077], "later", "The Capital City"),
  c("mobile", "Mobile", "AL", [30.6954, -88.0399], "later", "The Port City"),
  c("tuscaloosa", "Tuscaloosa", "AL", [33.2098, -87.5692], "later", "The Druid City"),
  c("auburn", "Auburn & Opelika", "AL", [32.62, -85.45], "later", "The Loveliest Village"),
  c("the-shoals", "Florence & The Shoals", "AL", [34.7998, -87.6773], "later", "The Shoals"),
  c("decatur", "Decatur", "AL", [34.6059, -86.9833], "later", "The River City"),
  c("gadsden", "Gadsden", "AL", [34.0143, -86.0066], "later", "On the Coosa"),
  c("dothan", "Dothan", "AL", [31.2232, -85.3905], "later", "The Peanut Capital"),
  c("eastern-shore", "Fairhope & Eastern Shore", "AL", [30.5227, -87.9033], "later", "The Eastern Shore"),
  c("gulf-coast", "Gulf Shores & Orange Beach", "AL", [30.27, -87.65], "later", "The Alabama Gulf Coast", 12),
  c("atlanta", "Atlanta", "GA", [33.749, -84.388], "later", "The City in a Forest", 12),
];

export const DEFAULT_CITY = "birmingham-al";
/** Cities people can pick today. Flip a city's status off "later" to open it. */
export const OPEN_CITIES = CITIES.filter((x) => x.status !== "later");
export const CITY_BY_ID: Record<string, City> = Object.fromEntries(OPEN_CITIES.map((x) => [x.id, x]));
export const citiesIn = (state: string) => OPEN_CITIES.filter((x) => x.state === state);
export const plannedIn = (state: string) => CITIES.filter((x) => x.state === state && x.status === "later");
export const stateName = (code: string) => STATES.find((s) => s.code === code)?.name ?? code;
export const cityPath = (city: City) => (city.id === DEFAULT_CITY ? "/" : `/${city.state.toLowerCase()}/${city.slug}`);
export const findCity = (state: string, slug: string) => OPEN_CITIES.find((x) => x.state.toLowerCase() === state.toLowerCase() && x.slug === slug);

/** every city we know of, open or not (homes can be anywhere; only open ones have a map) */
export const ANY_CITY: Record<string, City> = Object.fromEntries(CITIES.map((x) => [x.id, x]));
export const isOpenCity = (id: string | null | undefined) => !!id && !!CITY_BY_ID[id];
export const cityLabel = (c: City) => `${c.name}, ${apState(c.state)}`;

/**
 * Home is where the map opens, every visit, on any device you sign in on. It's picked when you
 * join (or on your page) and only changes when you change it. It's a city id, or for a town we
 * don't have yet, "other:Town, ST".
 */
export const HOME_KEY = "tl.home";
/** where you are this visit (a trip, a night out of town). Doesn't touch home; gone when the tab closes */
export const HERE_KEY = "tl.here";
export const otherHome = (town: string, state: string) => `other:${town.trim()}, ${state}`;
export function homeLabel(home: string | null | undefined) {
  if (!home) return "";
  if (home.startsWith("other:")) {
    const { city, state } = homeParts(home);
    return state ? `${city}, ${apState(state)}` : city;
  }
  return ANY_CITY[home] ? cityLabel(ANY_CITY[home]) : "";
}
/** the state and town of a home, for the waitlist */
export function homeParts(home: string): { state: string; city: string } {
  if (home.startsWith("other:")) {
    const m = home.slice(6).match(/^(.*),\s*([A-Z]{2})$/);
    return m ? { city: m[1], state: m[2] } : { city: home.slice(6), state: "" };
  }
  const c = ANY_CITY[home];
  return { city: c?.name ?? "", state: c?.state ?? "" };
}

/** the closest city we know to a point, and how far it is (km) */
export function nearestCity(p: [number, number], list: City[] = CITIES): { city: City; km: number } | null {
  let best: { city: City; km: number } | null = null;
  for (const c of list) {
    const km = haversineKm(p, c.center);
    if (!best || km < best.km) best = { city: c, km };
  }
  return best;
}
function haversineKm(a: [number, number], b: [number, number]) {
  const r = Math.PI / 180;
  const dLat = (b[0] - a[0]) * r;
  const dLng = (b[1] - a[1]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/** the town (Homewood, Mountain Brook…) a member eats in most; preselects the map */
export const HOME_TOWN_KEY = "tl.hometown";

/** AP style state abbreviations, the way a newspaper dateline writes them. */
const AP: Record<string, string> = {
  AL: "Ala.", AZ: "Ariz.", AR: "Ark.", CA: "Calif.", CO: "Colo.", CT: "Conn.", DE: "Del.", FL: "Fla.", GA: "Ga.", IL: "Ill.",
  IN: "Ind.", KS: "Kan.", KY: "Ky.", LA: "La.", MD: "Md.", MA: "Mass.", MI: "Mich.", MN: "Minn.", MS: "Miss.", MO: "Mo.",
  MT: "Mont.", NE: "Neb.", NV: "Nev.", NH: "N.H.", NJ: "N.J.", NM: "N.M.", NY: "N.Y.", NC: "N.C.", ND: "N.D.", OK: "Okla.",
  OR: "Ore.", PA: "Pa.", RI: "R.I.", SC: "S.C.", SD: "S.D.", TN: "Tenn.", VT: "Vt.", VA: "Va.", WA: "Wash.", WV: "W.Va.",
  WI: "Wis.", WY: "Wyo.",
};
export const apState = (code: string) => AP[code] ?? stateName(code);
