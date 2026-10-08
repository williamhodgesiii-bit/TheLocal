/**
 * Regions: state → city. Turning on a new state is a data change here.
 *  - "live"     curated launch city with an editorial guide
 *  - "founding" open for members to add spots (each one verified before it shows)
 * States without cities collect a waitlist.
 */
export type CityStatus = "live" | "founding";

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
  c("huntsville", "Huntsville", "AL", [34.7304, -86.5861], "founding", "Rocket City"),
  c("montgomery", "Montgomery", "AL", [32.3792, -86.3077], "founding", "The Capital City"),
  c("mobile", "Mobile", "AL", [30.6954, -88.0399], "founding", "The Port City"),
  c("tuscaloosa", "Tuscaloosa", "AL", [33.2098, -87.5692], "founding", "The Druid City"),
  c("auburn", "Auburn & Opelika", "AL", [32.62, -85.45], "founding", "The Loveliest Village"),
  c("the-shoals", "Florence & The Shoals", "AL", [34.7998, -87.6773], "founding", "The Shoals"),
  c("decatur", "Decatur", "AL", [34.6059, -86.9833], "founding", "The River City"),
  c("gadsden", "Gadsden", "AL", [34.0143, -86.0066], "founding", "On the Coosa"),
  c("dothan", "Dothan", "AL", [31.2232, -85.3905], "founding", "The Peanut Capital"),
  c("eastern-shore", "Fairhope & Eastern Shore", "AL", [30.5227, -87.9033], "founding", "The Eastern Shore"),
  c("gulf-coast", "Gulf Shores & Orange Beach", "AL", [30.27, -87.65], "founding", "The Alabama Gulf Coast", 12),
];

export const DEFAULT_CITY = "birmingham-al";
export const CITY_BY_ID: Record<string, City> = Object.fromEntries(CITIES.map((x) => [x.id, x]));
export const citiesIn = (state: string) => CITIES.filter((x) => x.state === state);
export const stateName = (code: string) => STATES.find((s) => s.code === code)?.name ?? code;
export const cityPath = (city: City) => (city.id === DEFAULT_CITY ? "/" : `/${city.state.toLowerCase()}/${city.slug}`);
export const findCity = (state: string, slug: string) => CITIES.find((x) => x.state.toLowerCase() === state.toLowerCase() && x.slug === slug);

export const HOME_KEY = "tl.home";

/** AP style state abbreviations, the way a newspaper dateline writes them. */
const AP: Record<string, string> = {
  AL: "Ala.", AZ: "Ariz.", AR: "Ark.", CA: "Calif.", CO: "Colo.", CT: "Conn.", DE: "Del.", FL: "Fla.", GA: "Ga.", IL: "Ill.",
  IN: "Ind.", KS: "Kan.", KY: "Ky.", LA: "La.", MD: "Md.", MA: "Mass.", MI: "Mich.", MN: "Minn.", MS: "Miss.", MO: "Mo.",
  MT: "Mont.", NE: "Neb.", NV: "Nev.", NH: "N.H.", NJ: "N.J.", NM: "N.M.", NY: "N.Y.", NC: "N.C.", ND: "N.D.", OK: "Okla.",
  OR: "Ore.", PA: "Pa.", RI: "R.I.", SC: "S.C.", SD: "S.D.", TN: "Tenn.", VT: "Vt.", VA: "Va.", WA: "Wash.", WV: "W.Va.",
  WI: "Wis.", WY: "Wyo.",
};
export const apState = (code: string) => AP[code] ?? stateName(code);
