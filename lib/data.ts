import overrides from "./geo-overrides.json";

/** What's on the plate. Occasions (date night, a splurge, cheap eats) are collections, not kinds of food. */
export type GenreId =
  | "southern"
  | "bbq"
  | "burgers"
  | "pizza"
  | "italian"
  | "seafood"
  | "steaks"
  | "latin"
  | "asian"
  | "mediterranean"
  | "french"
  | "brunch"
  | "sweets"
  | "coffee"
  | "drinks";

export type DrinkKind = "cocktails" | "brewery" | "wine" | "bar";

/** Birmingham's curated neighborhoods; community cities derive theirs from member-added spots. */
export type AreaId = string;

export interface Genre {
  id: GenreId;
  label: string;
  short: string;
  color: string;
  icon: string; // which drawing in components/PlateIcons.tsx
  tagline: string;
}

export type TownId = "birmingham" | "homewood" | "mountain-brook" | "vestavia-hills" | "hoover";

export interface Town {
  id: TownId;
  label: string;
  center: [number, number];
  zoom: number;
  blurb: string;
}

export interface Area {
  id: AreaId;
  /** municipality the neighborhood belongs to */
  town?: TownId;
  label: string;
  center: [number, number];
  zoom: number;
  blurb: string;
  /** where the neighborhood name is printed on the map (kept clear of pins) */
  labelAt: [number, number];
}

export interface Spot {
  id: string;
  /** region id, e.g. "birmingham-al" (see lib/regions.ts) */
  city: string;
  name: string;
  genres: GenreId[];
  drinks?: DrinkKind[];
  area: AreaId;
  address: string;
  coords: [number, number];
  price: 1 | 2 | 3 | 4;
  knownFor: string;
  blurb: string;
  tags: string[];
  /** 0–100, editorial popularity — drives sort + Surprise Me weighting */
  pop: number;
  /** Paid placement (Partner program). Always labeled in the UI. */
  sponsored?: boolean;
  /** neighborhood display name when `area` isn't a curated area */
  areaLabel?: string;
  website?: string;
  phone?: string;
  /** member who added it (community spots) */
  addedBy?: string;
  /** when our team verified it exists */
  verifiedAt?: string;
  /** openly licensed photos of this exact place (shown before stock imagery) */
  /** shorter text for the sign on the drawn storefront, when the full name is too long */
  sign?: string;
  photos?: { url: string; kind: "building" | "food"; credit: string; link: string }[];
}

/**
 * The kinds of food, in the order the plates show. A place gets the one or two it's best at,
 * not every one it serves: a bar known for its burger is Bars + Burgers, a bistro with a
 * famous burger is French + Burgers. "Special occasion" and "Date night" are collections.
 */
export const GENRES: Genre[] = [
  { id: "southern", label: "Southern & Soul", short: "Southern", color: "#C8692F", icon: "drumstick", tagline: "Meat-and-threes, soul food, fried chicken and the new Southern kitchens." },
  { id: "bbq", label: "Barbecue", short: "BBQ", color: "#9E3B22", icon: "flame", tagline: "Hickory smoke and white sauce. This is Alabama." },
  { id: "burgers", label: "Burgers & Sandwiches", short: "Burgers", color: "#A0612F", icon: "burger", tagline: "Smash burgers, hot dogs, Reubens and the Cuban." },
  { id: "pizza", label: "Pizza", short: "Pizza", color: "#B8873A", icon: "pizza", tagline: "Cracker-thin, Neapolitan and sourdough." },
  { id: "italian", label: "Italian", short: "Italian", color: "#7D7A33", icon: "pasta", tagline: "Handmade pasta, red sauce and long wine lists." },
  { id: "seafood", label: "Seafood & Oysters", short: "Seafood", color: "#4F7A80", icon: "fish", tagline: "Gulf-fresh, four hours from the coast." },
  { id: "steaks", label: "Steaks & Live Fire", short: "Steaks", color: "#7A3B2E", icon: "steak", tagline: "Steaks, the hearth and the charcoal grill." },
  { id: "latin", label: "Mexican & Latin", short: "Latin", color: "#C2553F", icon: "pepper", tagline: "Taquerias, fresh-pressed tortillas and patio margaritas." },
  { id: "asian", label: "Asian", short: "Asian", color: "#8C5A7A", icon: "bowl", tagline: "Sushi counters, Thai curries, pho and Indian kitchens." },
  { id: "mediterranean", label: "Greek & Mediterranean", short: "Greek", color: "#5D7A9E", icon: "olive", tagline: "Birmingham's Greek roots run deep." },
  { id: "french", label: "French", short: "French", color: "#4F5D8C", icon: "croissant", tagline: "Bistros, a brasserie and a tasting menu or two." },
  { id: "brunch", label: "Breakfast & Brunch", short: "Brunch", color: "#C99A3F", icon: "egg", tagline: "Biscuits, bagels, eggs and a mimosa or two." },
  { id: "sweets", label: "Bakeries & Sweets", short: "Sweets", color: "#C76F7E", icon: "icecream", tagline: "Bread, pastries, small-batch scoops and soda-fountain classics." },
  { id: "coffee", label: "Coffee", short: "Coffee", color: "#6E4B34", icon: "coffee", tagline: "Local roasters and slow mornings." },
  { id: "drinks", label: "Bars & Drinks", short: "Bars", color: "#D2A23C", icon: "martini", tagline: "Cocktail dens, dive bars, wine bars and taprooms." },
];

export const DRINK_KINDS: { id: DrinkKind; label: string }[] = [
  { id: "cocktails", label: "Cocktails" },
  { id: "bar", label: "Pubs & dives" },
  { id: "wine", label: "Wine bars" },
  { id: "brewery", label: "Breweries" },
];

const KNOWN_GENRES = new Set<string>(["southern", "bbq", "burgers", "pizza", "italian", "seafood", "steaks", "latin", "asian", "mediterranean", "french", "brunch", "sweets", "coffee", "drinks"]);
/**
 * Kinds of food from stored data (member-added places, old links). Drops ones we no longer
 * use (the old "chefs", Special occasion, is a collection now) so nothing looks up a kind
 * that isn't there; a place left with none counts as Southern until someone sorts it.
 */
export function cleanGenres(g: readonly string[] | null | undefined): GenreId[] {
  const out = (g ?? []).filter((x): x is GenreId => KNOWN_GENRES.has(x));
  return out.length ? out : ["southern"];
}

/** The towns we cover today. Expansion: add towns here, or whole cities in lib/regions.ts. */
export const TOWNS: Town[] = [
  { id: "birmingham", label: "Birmingham", center: [33.512, -86.795], zoom: 13.6, blurb: "Downtown, Southside, Lakeview and Avondale." },
  { id: "homewood", label: "Homewood", center: [33.4715, -86.806], zoom: 14.6, blurb: "Over the mountain. 18th Street, SoHo, Edgewood and West Homewood." },
  { id: "mountain-brook", label: "Mountain Brook", center: [33.4885, -86.7535], zoom: 14.4, blurb: "Three villages: Mountain Brook Village, English Village and Crestline." },
  { id: "vestavia-hills", label: "Vestavia Hills", center: [33.452, -86.765], zoom: 13.6, blurb: "Cahaba Heights, Highway 31 and Rocky Ridge." },
  { id: "hoover", label: "Hoover", center: [33.4034, -86.806], zoom: 14.6, blurb: "Down Highway 31 past the Vestavia line, starting at Patton Chapel Road." },
];

export const AREAS: Area[] = [
  { id: "downtown", town: "birmingham", label: "Downtown", center: [33.5155, -86.8085], zoom: 15, blurb: "Loft district, Morris Avenue, the old storefronts on Second Avenue North.", labelAt: [33.5212, -86.8165] },
  { id: "southside", town: "birmingham", label: "Southside & Five Points", center: [33.5008, -86.7935], zoom: 15.25, blurb: "Five Points South, the fountain, and the restaurants along Highland Avenue.", labelAt: [33.4972, -86.8030] },
  { id: "lakeview", town: "birmingham", label: "Lakeview & Pepper Place", center: [33.515, -86.7925], zoom: 15.5, blurb: "Old warehouses turned into breweries and restaurants. The farmers market runs Saturdays.", labelAt: [33.5098, -86.7838] },
  { id: "avondale", town: "birmingham", label: "Avondale & Forest Park", center: [33.522, -86.774], zoom: 15.5, blurb: "41st Street South and the park, and Clairmont Avenue in Forest Park.", labelAt: [33.5292, -86.7738] },
  { id: "northside", town: "birmingham", label: "Northside", center: [33.536, -86.832], zoom: 15.25, blurb: "North of downtown, where Eagle's has served soul food since 1951.", labelAt: [33.5405, -86.8320] },
  { id: "homewood", town: "homewood", label: "Downtown Homewood", center: [33.4755, -86.8008], zoom: 16, blurb: "18th Street and SoHo Square.", labelAt: [33.4795, -86.8045] },
  { id: "edgewood", town: "homewood", label: "Edgewood", center: [33.4665, -86.8085], zoom: 16.4, blurb: "A few blocks of Oxmoor Road with two ice cream shops on the same corner.", labelAt: [33.4635, -86.8085] },
  { id: "west-homewood", town: "homewood", label: "West Homewood", center: [33.466, -86.818], zoom: 14.8, blurb: "Oxmoor Road west of downtown, out toward Patriot Park.", labelAt: [33.4595, -86.8205] },
  { id: "mtnbrook", town: "mountain-brook", label: "Mountain Brook Village", center: [33.4842, -86.7532], zoom: 16.6, blurb: "Cahaba Road, Culver Road and Lane Parke.", labelAt: [33.4800, -86.7534] },
  { id: "englishvillage", town: "mountain-brook", label: "English Village", center: [33.4936, -86.774], zoom: 17, blurb: "A few blocks of Cahaba Road with a bakery on the corner.", labelAt: [33.4978, -86.7742] },
  { id: "crestline", town: "mountain-brook", label: "Crestline Village", center: [33.4936, -86.7322], zoom: 17, blurb: "Church Street: a coffee shop and bookstore, bagels, pizza and a Tex-Mex patio.", labelAt: [33.4978, -86.7322] },
  { id: "cahaba", town: "vestavia-hills", label: "Cahaba Heights", center: [33.462, -86.7275], zoom: 15.75, blurb: "Barbecue, patios and the Heights Village shops.", labelAt: [33.4542, -86.7275] },
  { id: "vestavia-31", town: "vestavia-hills", label: "Highway 31", center: [33.448, -86.79], zoom: 14.8, blurb: "Montgomery Highway, from the City Center down past the library.", labelAt: [33.4525, -86.7985] },
  { id: "rocky-ridge", town: "vestavia-hills", label: "Rocky Ridge", center: [33.4225, -86.7975], zoom: 16, blurb: "A small strip of local spots on Rocky Ridge Road.", labelAt: [33.4192, -86.7975] },
  { id: "patton-chapel", town: "hoover", label: "Patton Chapel", center: [33.4034, -86.806], zoom: 16, blurb: "Highway 31 at Patton Chapel Road, where the same family has run a barbecue pit since 1976.", labelAt: [33.4002, -86.806] },
];
export const TOWN_BY_ID = Object.fromEntries(TOWNS.map((t) => [t.id, t])) as Record<TownId, Town>;

/* ------------------------------------------------------------------ */
/* Birmingham's downtown grid is rotated ~35°. Avenues run SW→NE,       */
/* streets run NW→SE, and house numbers encode the cross street/avenue. */
/* This lets us place grid addresses without a geocoder. Run            */
/* `npm run geocode` with a Google key to write exact overrides.        */
/* ------------------------------------------------------------------ */
const BASE: [number, number] = [33.5125, -86.8062]; // 20th St & 1st Ave N
const STREET: [number, number] = [0.00077, 0.00128]; // +1 numbered street
const AVENUE: [number, number] = [0.0011, -0.0009]; // +1 avenue to the north

function grid(street: number, aveIdx: number): [number, number] {
  const ds = street - 20;
  return [
    +(BASE[0] + ds * STREET[0] + aveIdx * AVENUE[0]).toFixed(5),
    +(BASE[1] + ds * STREET[1] + aveIdx * AVENUE[1]).toFixed(5),
  ];
}
/** "1821 2nd Ave N" → onAveN(1821, 2) */
const onAveN = (house: number, ave: number) => grid(house / 100, ave - 1);
const onAveS = (house: number, ave: number) => grid(house / 100, -ave - 0.5);
/** "200 20th St N" → onStN(200, 20) */
const onStN = (house: number, st: number) => grid(st, house / 100 - 1);
const onStS = (house: number, st: number) => grid(st, -(house / 100) - 0.5);

const RAW_SPOTS: Omit<Spot, "city">[] = [
  /* ----------------------------- DOWNTOWN ----------------------------- */
  {
    id: "helen", name: "Helen", genres: ["steaks", "seafood"], area: "downtown",
    address: "2013 2nd Ave N", coords: onAveN(2013, 2), price: 4,
    knownFor: "Hearth-fired steaks & seafood",
    blurb: "Rob McDaniel's place on Second Avenue. Long, narrow brick room, most everything cooked over the hearth. It's on the Michelin list, so book ahead.",
    tags: ["date night", "live fire", "Michelin"], pop: 92,
  },
  {
    id: "yo-mamas", name: "Yo' Mama's", genres: ["southern", "brunch"], area: "downtown",
    address: "2328 2nd Ave N", coords: onAveN(2328, 2), price: 2,
    knownFor: "Chicken & waffles",
    blurb: "Family-run soul food downtown. Chicken and waffles is the order. Lines at lunch on weekdays.",
    tags: ["family-owned", "brunch", "lunch"], pop: 86,
  },
  {
    id: "bamboo-on-2nd", name: "Bamboo on 2nd", genres: ["asian", "drinks"], drinks: ["cocktails"], area: "downtown",
    address: "2212 2nd Ave N", coords: onAveN(2212, 2), price: 3,
    knownFor: "Sushi & late-night cocktails",
    blurb: "Pan-Asian plates, sushi and a strong cocktail list in a dark downtown room. Open late.",
    tags: ["sushi", "cocktails", "late night"], pop: 74,
  },
  {
    id: "the-essential", name: "The Essential", genres: ["brunch", "sweets"], area: "downtown",
    address: "2018 Morris Ave", coords: grid(20.18, -0.4), price: 3,
    knownFor: "Brunch, and the pastry case",
    blurb: "Brunch and lunch on Morris Avenue, on the cobblestone stretch. Look at the pastry case before you order.",
    tags: ["brunch", "pastries", "Morris Ave"], pop: 84,
  },
  {
    id: "brick-and-tin", name: "Brick & Tin", genres: ["burgers", "brunch"], area: "downtown",
    address: "214 20th St N", coords: onStN(214, 20), price: 2,
    knownFor: "Seasonal sandwiches & salads",
    blurb: "Lunch counter with a menu that changes with the season. Sandwiches, salads, and baked goods by the register.",
    tags: ["lunch", "seasonal", "counter service"], pop: 70,
  },
  {
    id: "nikis-west", name: "Niki's West", genres: ["southern"], area: "downtown",
    address: "233 Finley Ave W", coords: [33.5383, -86.8207], price: 1,
    knownFor: "Cafeteria-line meat-and-three",
    blurb: "Cafeteria line by the Farmers Market. Pick your meat, pick your sides, find a seat. People have been eating here for decades.",
    tags: ["meat-and-three", "classic", "lunch"], pop: 88,
  },
  {
    id: "collins-bar", name: "The Collins Bar", genres: ["drinks"], drinks: ["cocktails"], area: "downtown",
    address: "2125 2nd Ave N", coords: onAveN(2125, 2), price: 2,
    knownFor: "Bartender's-choice cocktails",
    blurb: "Cocktail bar downtown with a big back bar. Tell them what you like and they'll make you something.",
    tags: ["cocktails", "late night"], pop: 78,
  },
  {
    id: "paper-doll", name: "Paper Doll", genres: ["drinks"], drinks: ["cocktails"], area: "downtown",
    address: "2320 1st Ave N", coords: onAveN(2320, 1), price: 3,
    knownFor: "Cocktails in a dim, velvet room",
    blurb: "Dim, velvet-heavy cocktail bar on First Avenue North. Good for a date. Happy hour is a deal.",
    tags: ["cocktails", "date night", "happy hour"], pop: 72,
  },
  {
    id: "paramount", name: "Paramount", genres: ["drinks", "burgers"], drinks: ["bar"], area: "downtown",
    address: "200 20th St N", coords: onStN(200, 20), price: 2,
    knownFor: "Burgers & vintage arcade",
    blurb: "Old arcade cabinets, a good burger, and a crowd that ends up on the sidewalk on 20th Street.",
    tags: ["arcade", "burgers", "groups"], pop: 76,
  },
  {
    id: "pale-eddies", name: "Pale Eddie's Pour House", genres: ["drinks"], drinks: ["bar"], area: "downtown",
    address: "2308 2nd Ave N", coords: onAveN(2308, 2), price: 1,
    knownFor: "Live music & cold beer",
    blurb: "Brick-walled bar with live music in the back room. Cheap beer, no fuss.",
    tags: ["live music", "dive-ish"], pop: 62,
  },
  {
    id: "carrigans", name: "Carrigan's Public House", genres: ["drinks", "burgers"], drinks: ["bar", "cocktails"], area: "downtown",
    address: "2430 Morris Ave", coords: grid(24.3, -0.4), price: 2,
    knownFor: "Patio pints & pub food",
    blurb: "Pub food and a long bar on Morris Avenue. The patio fills up when it's nice out.",
    tags: ["patio", "groups", "pub"], pop: 70,
  },
  {
    id: "good-people", name: "Good People Brewing", genres: ["drinks"], drinks: ["brewery"], area: "downtown",
    address: "114 14th St S", coords: onStS(114, 14), price: 1,
    knownFor: "Alabama's oldest brewery",
    blurb: "Alabama's oldest brewery, across the street from Regions Field. Get a beer before a Barons game.",
    tags: ["brewery", "patio", "game day"], pop: 80,
  },
  {
    id: "back-forty", name: "Back Forty Beer Co.", genres: ["drinks", "pizza"], drinks: ["brewery"], area: "downtown",
    address: "3201 1st Ave N", coords: onAveN(3201, 1), price: 2,
    knownFor: "Taproom pizza & Naked Pig ale",
    blurb: "Gadsden brewery with a big taproom near Sloss Furnaces. Pizza from the kitchen.",
    tags: ["brewery", "pizza", "Sloss Quarter"], pop: 64,
  },
  {
    id: "bayonet", name: "Bayonet", genres: ["seafood"], area: "downtown",
    address: "2015 2nd Ave N", coords: onAveN(2015, 2), price: 3,
    knownFor: "Raw-bar oysters & the tuna burger",
    blurb: "Rob and Emily McDaniel's seafood place, next door to Helen. About 20 kinds of oysters at the raw bar. The New York Times named it one of America's 50 best restaurants in 2025, so book ahead or try the bar early in the week.",
    tags: ["oysters", "raw bar", "date night"], pop: 91,
  },
  {
    id: "la-fete", name: "La Fête", genres: ["french"], area: "downtown",
    address: "2018 Morris Ave", coords: grid(20.2, -0.42), price: 3,
    knownFor: "Roast chicken & potato gratin",
    blurb: "Kristen Hall's French bistro on Morris Avenue. Marble bar, tiled floors and a patio, with bread and pastry from its sister bakery, Bandit. Michelin gave it a Bib Gourmand in 2025.",
    tags: ["French", "bistro", "patio", "date night", "Morris Ave"], pop: 88,
  },
  {
    id: "pizza-grace", name: "Pizza Grace", genres: ["pizza"], area: "downtown",
    address: "2212 Morris Ave", coords: grid(22.12, -0.4), price: 2,
    knownFor: "Sourdough pies & the meatballs",
    blurb: "Sourdough pizza with a lot going on (pesto, mortadella and pistachio, say) in the Mercantile on Morris building. Get the meatballs for the table. The Big Spoon Creamery owners bought it in 2025.",
    tags: ["pizza", "natural wine", "Morris Ave"], pop: 86,
  },
  {
    id: "current-charcoal", name: "Current Charcoal Grill", genres: ["asian", "seafood", "steaks"], area: "downtown",
    address: "1625 2nd Ave S", coords: onAveS(1625, 2), price: 3,
    knownFor: "Crab fried rice & fish off the charcoal",
    blurb: "Adam Evans (of Automatic Seafood) and Luke Joseph cook Gulf seafood with Asian flavors over Japanese binchotan charcoal, next to Railroad Park. The Peking duck has to be ordered two weeks ahead.",
    tags: ["Gulf seafood", "charcoal grill", "date night"], pop: 84,
  },
  {
    id: "reve", name: "Rêve", genres: ["french"], area: "downtown",
    address: "1821 2nd Ave N", coords: onAveN(1821, 2), price: 4,
    knownFor: "The French tasting menu",
    blurb: "Jacob Stull's French tasting-menu restaurant inside the Pizitz, across from McWane Science Center. Dinner only, a few nights a week. Book on Resy.",
    tags: ["tasting menu", "French", "date night"], pop: 80,
  },

  {
    id: "house-of-found-objects", name: "The House of Found Objects", genres: ["drinks"], drinks: ["cocktails"], area: "downtown",
    address: "2205 2nd Ave N", coords: onAveN(2205, 2), price: 3,
    knownFor: "Cocktails among the found objects",
    blurb: "Feizal Valli's cocktail bar next door to El Barrio, built out of repurposed finds, with costumes and a bubble machine. Esquire put it on its 2026 list of the best bars in America.",
    tags: ["late night", "date night", "cocktails"], pop: 88,
  },
  {
    id: "adios", name: "Adiós", genres: ["drinks"], drinks: ["cocktails"], area: "downtown",
    address: "2218 1st Ave N", coords: onAveN(2218, 1), price: 3,
    knownFor: "Agave cocktails & margaritas",
    blurb: "Tequila and mezcal bar in The Dagny building on First Avenue North. A James Beard semifinalist for beverage service in 2025, and a margarita worth the trip.",
    tags: ["late night", "date night", "agave"], pop: 87,
  },
  {
    id: "pilcrow", name: "Pilcrow Cocktail Cellar", genres: ["drinks"], drinks: ["cocktails"], area: "downtown",
    address: "2015 1st Ave N", coords: onAveN(2015, 1), price: 3,
    knownFor: "Mezcal and tequila cocktails",
    blurb: "Joe and Meg Phelps's basement bar under the old Caldwell Printing Works. Find the alley between Founders Station and The Essential and look for the neon sign.",
    tags: ["date night", "late night", "agave"], pop: 79,
  },
  {
    id: "moon-shine", name: "Moon Shine", genres: ["drinks"], drinks: ["cocktails"], area: "downtown",
    address: "1928 1st Ave N", coords: [33.5146, -86.806], price: 3,
    knownFor: "Rooftop cocktails over downtown",
    blurb: "The rooftop bar on top of the Elyton Hotel, 16 floors up in the old Empire Building. Cocktails, small plates and wood-fired pizza, and some of the best views of downtown and Railroad Park. Go at sunset.",
    tags: ["rooftop", "date night", "views"], pop: 76,
  },
  {
    id: "tucana-tiki", name: "Tucana Tiki Bar", genres: ["drinks"], drinks: ["cocktails"], area: "downtown",
    address: "1143 1st Ave S, Suite 101", coords: onAveS(1143, 1), price: 3,
    knownFor: "Rum cocktails, tiki style",
    blurb: "Nicky Vann Tisdale's tiki bar in the Denham Building near Railroad Park, open since 2023. Every December the holiday drinks go tropical.",
    tags: ["date night", "cocktails"], pop: 80,
  },
  {
    id: "the-fennec", name: "The Fennec", genres: ["drinks"], drinks: ["cocktails"], area: "downtown",
    address: "1630 2nd Ave S", coords: onAveS(1630, 2), price: 2,
    knownFor: "Cocktails, bites and live music",
    blurb: "Bar and music room in Parkside, a block from Railroad Park, with cocktails and small bites.",
    tags: ["live music", "cocktails"], pop: 72,
  },
  {
    id: "gus-hot-dogs", name: "Gus's Hot Dogs", genres: ["burgers"], area: "downtown",
    address: "1915 4th Ave N", coords: onAveN(1915, 4), price: 1,
    knownFor: "Chargrilled dog with onion sauce",
    blurb: "Greek-owned hot dog stand open since 1947, the longest-running one in town. A few counter seats; most people take it to go.",
    tags: ["classic", "lunch", "takeout"], pop: 85,
  },
  {
    id: "green-acres", name: "Green Acres Cafe", genres: ["southern"], area: "downtown",
    address: "1705 4th Ave N", coords: onAveN(1705, 4), price: 1,
    knownFor: "Whole fried chicken wings",
    blurb: "The Gratton family's fried chicken counter, on Fourth Avenue North since 1990 and in Birmingham since 1950. Order the wings.",
    tags: ["classic", "takeout", "late night"], pop: 84,
  },
  {
    id: "fifes", name: "Fife's Restaurant", genres: ["southern", "brunch"], area: "downtown",
    address: "2321 4th Ave N", coords: onAveN(2321, 4), price: 1,
    knownFor: "Southern breakfast & meat-and-three",
    blurb: "Breakfast and meat-and-three in the Fourth Avenue district since 1956.",
    tags: ["classic", "breakfast", "lunch"], pop: 78,
  },
  {
    id: "trattoria-zaza", name: "Trattoria ZaZa", genres: ["italian", "brunch"], area: "downtown",
    address: "207 20th St N", coords: onStN(207, 20), price: 2,
    knownFor: "Casual Italian & Sunday brunch",
    blurb: "Casual Italian in the Frank Nelson Building, owned since 2015 by two longtime employees. Breakfast on weekdays, brunch on Sundays.",
    tags: ["lunch", "brunch", "date night"], pop: 80,
  },
  {
    id: "salud-taqueria", name: "Salud Taqueria", genres: ["latin"], area: "downtown",
    address: "1931 2nd Ave N, Suite 101", coords: onAveN(1931, 2), price: 2,
    knownFor: "Tacos, late on weekends",
    blurb: "Taqueria in the old Webb Building on Second Avenue North, open since 2024. Garden & Gun put it on its 2025 list of new restaurants to try. Open until midnight Friday and Saturday.",
    tags: ["late night", "lunch"], pop: 81,
  },
  {
    id: "el-barrio", name: "El Barrio", genres: ["latin", "drinks", "brunch"], drinks: ["cocktails"], area: "downtown",
    address: "2211 2nd Ave N", coords: onAveN(2211, 2), price: 2,
    knownFor: "Modern Mexican & weekend brunch",
    blurb: "The downtown original on Second Avenue North; the second one is in West Homewood. Weekend brunch is the big draw.",
    tags: ["brunch", "date night", "margaritas", "groups"], pop: 84,
  },
  {
    id: "bandit-patisserie", name: "Bandit Pâtisserie", genres: ["sweets"], area: "downtown",
    address: "2323 1st Ave N", coords: onAveN(2323, 1), price: 2,
    knownFor: "Almond croissant",
    blurb: "The bakery behind La Fête's bread and pastry, on First Avenue North. Pies, tarts and quiche to order around the holidays.",
    tags: ["breakfast", "pastries", "takeout"], pop: 82,
  },
  {
    id: "eugenes-hot-chicken", name: "Eugene's Hot Chicken", genres: ["southern"], area: "downtown",
    address: "2268 9th Ave N", coords: onAveN(2268, 9), price: 1,
    knownFor: "Hot chicken, pick your heat",
    blurb: "Hot chicken north of the city center: pick the style and how hot, then the sides. Bham Now put it on its 25 best restaurants in Birmingham in 2026.",
    tags: ["lunch", "takeout"], pop: 80,
  },
  {
    id: "johinna", name: "Johin'na", genres: ["asian", "southern"], area: "downtown",
    address: "2002 2nd Ave N", coords: onAveN(2002, 2), price: 3,
    knownFor: "Collard green gyoza",
    blurb: "Japanese-Southern restaurant and lounge on Second Avenue North, open since August 2025: collard green gyoza, sweet-tea soy. Brunch on Sundays.",
    tags: ["date night", "brunch"], pop: 76,
  },
  {
    id: "tortugas", name: "Tortugas Homestyle Pizza", genres: ["pizza"], area: "downtown",
    address: "1304 2nd Ave S", coords: onAveS(1304, 2), price: 1,
    knownFor: "Pizza by the slice",
    blurb: "Slice shop near Regions Field. Food Network picked it for Alabama in its 50 states of pizza slices.",
    tags: ["lunch", "cheap eats", "game day"], pop: 76,
  },
  {
    id: "cala-coffee-downtown", name: "Cala Coffee (downtown)", genres: ["coffee"], area: "downtown",
    address: "1826 3rd Ave N, Suite 101", coords: onAveN(1826, 3), price: 1,
    knownFor: "Seasonal drinks",
    blurb: "Downtown shop of the local roaster, with a menu that changes with the season. There's another in Mountain Brook Village.",
    tags: ["work-friendly", "breakfast"], pop: 74,
  },
  /* ------------------------ SOUTHSIDE & FIVE POINTS ------------------------ */
  {
    id: "galley-and-garden", name: "Galley & Garden", genres: ["southern"], area: "southside",
    address: "2220 Highland Ave S", coords: [33.5011, -86.7907], price: 4,
    knownFor: "Shrimp and grits & the wine list",
    blurb: "White-tablecloth dinner in an 1898 house on Highland Avenue, one of the few original Highland homes still standing. Chef Jessica Lindeen cooks seasonal, Southern plates like braised pork belly and shrimp and grits, and the wine list has won Wine Spectator's Award of Excellence every year since 2016. There's a patio with a fireplace for cool nights.",
    tags: ["date night", "special occasion", "patio", "wine"], pop: 80,
  },
  {
    id: "bottega", name: "Bottega", genres: ["italian"], area: "southside",
    address: "2240 Highland Ave S", coords: [33.5006, -86.7917], price: 4,
    knownFor: "Handmade pasta & Parmesan soufflé",
    blurb: "Frank and Pardis Stitt's Italian restaurant in a big stone building on Highland Avenue. The cafe side is more casual.",
    tags: ["date night", "pasta", "wine"], pop: 93,
  },
  {
    id: "chez-fonfon", name: "Chez Fonfon", genres: ["french", "burgers"], area: "southside",
    address: "2007 11th Ave S", coords: onAveS(2007, 11), price: 3,
    knownFor: "The burger, and the bocce court",
    blurb: "French bistro in Five Points South from the Stitts. Steak frites, a zinc bar, and a bocce court out back.",
    tags: ["date night", "bistro", "French", "patio"], pop: 90,
  },
  {
    id: "surin-west", name: "Surin West", genres: ["asian"], area: "southside",
    address: "1918 11th Ave S", coords: onAveS(1918, 11), price: 2,
    knownFor: "Thai curries & sushi",
    blurb: "Thai food and a sushi bar in Five Points, with tables out on the patio.",
    tags: ["Thai", "sushi", "patio"], pop: 73,
  },
  {
    id: "taj-india", name: "Taj India", genres: ["asian"], area: "southside",
    address: "2226 Highland Ave S", coords: [33.5003, -86.7922], price: 2,
    knownFor: "Lunch buffet & tikka masala",
    blurb: "Northern Indian on Highland Avenue. The lunch buffet is the move on a weekday.",
    tags: ["Indian", "lunch buffet", "vegetarian-friendly"], pop: 71,
  },
  {
    id: "fish-market", name: "The Fish Market", genres: ["seafood", "mediterranean"], area: "southside",
    address: "612 22nd St S", coords: onStS(612, 22), price: 2,
    knownFor: "Greek-style grilled fish",
    blurb: "Seafood counter and restaurant run by a Greek family. Pick what looks good on ice and they'll grill it.",
    tags: ["Greek", "market", "family-owned"], pop: 75,
  },
  {
    id: "rojo", name: "Rojo", genres: ["latin", "brunch"], area: "southside",
    address: "2921 Highland Ave S", coords: [33.5009, -86.7843], price: 2,
    knownFor: "Patio tacos facing Rhodes Park",
    blurb: "Latin and American food in Highland Park, with a dog-friendly patio across from Rhodes Park.",
    tags: ["patio", "dog-friendly", "brunch"], pop: 77,
  },

  {
    id: "daves-pub", name: "Dave's Pub", genres: ["drinks"], drinks: ["bar"], area: "southside",
    address: "1128 20th St S", coords: onStS(1128, 20), price: 1,
    knownFor: "Five Points neighborhood bar",
    blurb: "Five Points bar on the ground floor of the Terrace Court apartments since 1995. New local owners fixed it up in 2024 and started serving food.",
    tags: ["late night", "dive"], pop: 78,
  },
  {
    id: "the-nick", name: "The Nick", genres: ["drinks"], drinks: ["bar"], area: "southside",
    address: "2514 10th Ave S", coords: onAveS(2514, 10), price: 1,
    knownFor: "Live music, very late",
    blurb: "Southside's dive bar and live music room, open late. Every Birmingham dive-bar list has it.",
    tags: ["live music", "late night", "dive"], pop: 80,
  },
  {
    id: "the-garage", name: "The Garage", genres: ["drinks", "burgers"], drinks: ["bar"], area: "southside",
    address: "2304 10th Terrace S", coords: onAveS(2304, 10.5), price: 1,
    knownFor: "Courtyard beer garden",
    blurb: "Beer garden off Highland Avenue in a row of 1930s garages, with a courtyard full of antiques and statues. Sandwiches, cold beer, cash only.",
    tags: ["patio", "classic", "cash only"], pop: 82,
  },
  {
    id: "freddys-wine-bar", name: "Freddy's Wine Bar", genres: ["drinks"], drinks: ["wine"], area: "southside",
    address: "2251 Highland Ave S", coords: [33.5002, -86.7912], price: 3,
    knownFor: "Tuesday bottle specials",
    blurb: "Wine bar on the ground floor of the Highland Towers, with a patio for sunsets. Bottles are $20, $30 or $40 on Tuesdays.",
    tags: ["patio", "date night", "wine"], pop: 76,
  },
  {
    id: "teds", name: "Ted's Restaurant", genres: ["southern", "mediterranean"], area: "southside",
    address: "328 12th St S", coords: onStS(328, 12), price: 1,
    knownFor: "Greek-Southern meat-and-three",
    blurb: "Meat-and-three near UAB since 1973, run by Tasos and Beba Touloupis since 2000. Meatloaf and greens next to souvlakia. Weekday lunch, Saturday breakfast.",
    tags: ["classic", "lunch", "meat-and-three"], pop: 78,
  },
  {
    id: "otsuka-ramen", name: "Otsuka Ramen", genres: ["asian"], area: "southside",
    address: "707 Richard Arrington Jr Blvd S, Suite 101", coords: onStS(707, 21), price: 2,
    knownFor: "Ramen",
    blurb: "Ramen near UAB, open since 2025, with a sushi bar and booths. Yakisoba and poke too.",
    tags: ["lunch"], pop: 72,
  },
  {
    id: "university-tacos", name: "University Tacos", genres: ["latin"], area: "southside",
    address: "2009 University Blvd", coords: onAveS(2009, 8), price: 1,
    knownFor: "Quick tacos by UAB",
    blurb: "Taco counter on University Boulevard, a block from UAB.",
    tags: ["cheap eats", "lunch"], pop: 70,
  },
  /* ------------------------ LAKEVIEW & PEPPER PLACE ------------------------ */
  {
    id: "automatic-seafood", name: "Automatic Seafood & Oysters", genres: ["seafood"], area: "lakeview",
    address: "2824 5th Ave S", coords: onAveS(2824, 5), price: 4,
    knownFor: "Gulf oysters & whole fish",
    blurb: "Adam Evans's seafood place in an old industrial building in Lakeview. He won a James Beard award. Start with oysters.",
    tags: ["oysters", "James Beard", "date night"], pop: 94,
  },
  {
    id: "ovenbird", name: "Ovenbird", genres: ["steaks"], area: "lakeview",
    address: "2805 2nd Ave S", coords: onAveS(2805, 2), price: 3,
    knownFor: "Live-fire small plates",
    blurb: "Chris Hastings's live-fire small plates at Pepper Place. Michelin gave it a Bib Gourmand in 2025. Order a bunch and share.",
    tags: ["date night", "small plates", "live fire", "Pepper Place"], pop: 89,
  },
  {
    id: "hot-and-hot", name: "Hot and Hot Fish Club", genres: ["seafood", "southern"], area: "lakeview",
    address: "2901 2nd Ave S", coords: onAveS(2901, 2), price: 4,
    knownFor: "The summer tomato salad",
    blurb: "Chris and Idie Hastings have run it since 1995. It's at Pepper Place now. Sit at the counter if you can.",
    tags: ["date night", "chef's counter", "Southern", "Pepper Place"], pop: 88,
  },
  {
    id: "red-cat", name: "Red Cat Coffee House", genres: ["coffee"], area: "lakeview",
    address: "2901 2nd Ave S", coords: grid(29.05, -2.75), price: 1,
    knownFor: "Saturday-market lattes",
    blurb: "Coffee shop at Pepper Place with brick walls and big windows. Busy on market Saturdays.",
    tags: ["Pepper Place", "work-friendly"], pop: 65,
  },
  {
    id: "trimtab", name: "TrimTab Brewing", genres: ["drinks"], drinks: ["brewery"], area: "lakeview",
    address: "2721 5th Ave S", coords: onAveS(2721, 5), price: 1,
    knownFor: "Fruited sours & hazy IPAs",
    blurb: "Lakeview brewery known for sours and IPAs. Big patio, dogs welcome.",
    tags: ["brewery", "patio", "dog-friendly"], pop: 79,
  },

  {
    id: "mayawell", name: "Mayawell", genres: ["drinks", "latin"], drinks: ["cocktails"], area: "lakeview",
    address: "2900 4th Ave S", coords: onAveS(2900, 4), price: 2,
    knownFor: "Tequila, mezcal & a rooftop",
    blurb: "Neill Crook's agave bar in Lakeview, with Mexican-inspired food and a rooftop that looks back at the skyline. Order downstairs and carry it up.",
    tags: ["rooftop", "patio", "agave"], pop: 82,
  },
  {
    id: "lous-pub", name: "Lou's Pub & Package Store", genres: ["drinks"], drinks: ["bar"], area: "lakeview",
    address: "726 29th St S", coords: onStS(726, 29), price: 1,
    knownFor: "A bar and a liquor store in one",
    blurb: "Lakeview neighborhood bar since 1987 that's also a package store, which is rare in Alabama. Small room, regulars, cold beer.",
    tags: ["classic", "dive"], pop: 76,
  },
  {
    id: "bettola", name: "Bettola", genres: ["italian"], area: "lakeview",
    address: "2930 3rd Ave S", coords: onAveS(2930, 3), price: 2,
    knownFor: "Scratch-made pasta",
    blurb: "Italian at Pepper Place, with pasta made from scratch. Bham Now put it on its 25 best restaurants in Birmingham in 2026.",
    tags: ["date night", "pasta"], pop: 84,
  },
  {
    id: "slice-pizza", name: "Slice Pizza & Brew", genres: ["pizza"], area: "lakeview",
    address: "725 29th St S", coords: onStS(725, 29), price: 2,
    knownFor: "Specialty pies & craft beer",
    blurb: "Lakeview pizza and beer, the original of a small local group with spots in Vestavia Hills, Crestline and Homewood.",
    tags: ["patio", "family", "late night"], pop: 79,
  },
  {
    id: "burning-tree", name: "Burning Tree Smokehouse", genres: ["bbq"], area: "lakeview",
    address: "3090 3rd Ave S", coords: onAveS(3090, 3), price: 2,
    knownFor: "Brisket tacos",
    blurb: "Barbecue at Pepper Place, opened in 2025 by a local pitmaster with decades of smoking behind him. The burger's good too.",
    tags: ["lunch"], pop: 76,
  },
  /* ------------------------------- AVONDALE ------------------------------- */
  {
    id: "saws-soul-kitchen", name: "Saw's Soul Kitchen", genres: ["bbq", "southern"], area: "avondale",
    address: "215 41st St S", coords: onStS(215, 41), price: 1,
    knownFor: "Pork & greens over cheese grits",
    blurb: "Small, always-busy Avondale spot. White sauce barbecue with soul food sides.",
    tags: ["white sauce", "counter service"], pop: 87,
  },
  {
    id: "avondale-brewing", name: "Avondale Brewing Co.", genres: ["drinks"], drinks: ["brewery"], area: "avondale",
    address: "201 41st St S", coords: onStS(201, 41), price: 1,
    knownFor: "Backyard stage & Miss Fancy's Tripel",
    blurb: "Brewery in an old brick building with a huge backyard where they hold concerts.",
    tags: ["brewery", "live music", "dog-friendly"], pop: 81,
  },
  {
    id: "big-spoon", name: "Big Spoon Creamery", genres: ["sweets"], area: "avondale",
    address: "4000 3rd Ave S", coords: onAveS(4000, 3), price: 1,
    knownFor: "Small-batch ice cream sandwiches",
    blurb: "Small-batch ice cream in the MAKEbhm building. The sandwiches are the thing to get.",
    tags: ["ice cream", "family"], pop: 83,
  },
  {
    id: "cahaba-brewing", name: "Cahaba Brewing Co.", genres: ["drinks"], drinks: ["brewery"], area: "avondale",
    address: "4500 5th Ave S", coords: onAveS(4500, 5), price: 1,
    knownFor: "Taproom in the old Continental Gin",
    blurb: "Taproom in the old Continental Gin building at the east end of Avondale. Trivia nights and food trucks.",
    tags: ["brewery", "food trucks"], pop: 63,
  },

  {
    id: "saturn", name: "Saturn", genres: ["drinks"], drinks: ["bar"], area: "avondale",
    address: "200 41st St S", coords: onStS(200, 41), price: 2,
    knownFor: "Concerts in a 500-person room",
    blurb: "Music venue and bar in the old Cory & Faulkner Hardware building, across from Avondale Brewing. Ten years old in 2025.",
    tags: ["live music", "late night"], pop: 82,
  },
  {
    id: "black-market", name: "Black Market Bar & Grill", genres: ["drinks", "burgers"], drinks: ["bar"], area: "avondale",
    address: "4100 3rd Ave S", coords: onAveS(4100, 3), price: 2,
    knownFor: "Bar food till 2 a.m.",
    blurb: "Moved from Five Points to the corner of Third Avenue and 41st Street in 2024, in the old Common House space. Open late most nights.",
    tags: ["late night", "game day"], pop: 74,
  },
  {
    id: "taco-morro-loco", name: "Taco Morro Loco", genres: ["latin", "seafood"], area: "avondale",
    address: "417 41st St S", coords: onStS(417, 41), price: 1,
    knownFor: "Fish tacos & fresh salsa",
    blurb: "Hispanic-owned taqueria on 41st Street in Avondale. Get the fish tacos.",
    tags: ["cheap eats", "lunch"], pop: 76,
  },
  {
    id: "juniper", name: "Juniper", genres: ["drinks", "brunch"], drinks: ["cocktails"], area: "avondale",
    address: "3811 Clairmont Ave S", coords: [33.5134, -86.7718], price: 3,
    knownFor: "Gin cocktails",
    blurb: "Restaurant and cocktail bar in Forest Park inspired by Victorian gin palaces, so gin runs the menu. Weekend brunch, and one of the best patios in town.",
    tags: ["patio", "brunch", "date night", "cocktails"], pop: 84,
  },
  {
    id: "eagles", name: "Eagle's Restaurant", genres: ["southern"], area: "northside",
    address: "2610 16th St N", coords: onStN(2610, 16), price: 1,
    knownFor: "Friday catfish & meat-and-three",
    blurb: "Black-owned soul food kitchen open since 1951. Eater sent visitors here in 2026, and Sunday lines go out the door.",
    tags: ["classic", "lunch", "meat-and-three", "family"], pop: 86,
  },
  /* ------------------------------- HOMEWOOD ------------------------------- */
  {
    id: "johnnys", name: "Johnny's Restaurant", genres: ["southern", "mediterranean"], area: "homewood",
    address: "2902 18th St S", coords: [33.4752, -86.8003], price: 2,
    knownFor: "Greek-and-three & keftedes",
    blurb: "Timothy Hontzas's meat-and-three, with Greek dishes alongside the Southern ones. Lunch line moves fast.",
    tags: ["meat-and-three", "lunch"], pop: 91,
    photos: [
      {
        url: "https://commons.wikimedia.org/wiki/Special:FilePath/Johnny%27s_Greek_And_Three%2C_Homewood%2C_AL.jpg?width=1200",
        kind: "building",
        credit: "Paul Lowry, CC BY 2.0",
        link: "https://commons.wikimedia.org/wiki/File:Johnny%27s_Greek_And_Three,_Homewood,_AL.jpg",
      },
    ],
  },
  {
    id: "little-donkey", name: "Little Donkey", genres: ["latin"], area: "homewood",
    address: "2701 18th St S", coords: [33.4772, -86.7988], price: 2,
    knownFor: "Smoked meats & fresh-pressed tortillas",
    blurb: "Mexican food with some Southern in it. Smoked meats, tortillas made in house, long margarita list. A local group took it over in May 2026.",
    tags: ["tacos", "margaritas", "patio"], pop: 80,
  },
  {
    id: "jinsei", name: "Jinsei Sushi", genres: ["asian"], area: "homewood",
    address: "1830 29th Ave S", coords: [33.4740, -86.8019], price: 3,
    knownFor: "Creative rolls & nigiri",
    blurb: "Sushi bar on SoHo Square with a lot of specialty rolls and a decent sake list.",
    tags: ["sushi", "date night"], pop: 72,
  },
  {
    id: "soho-social", name: "SoHo Social", genres: ["drinks"], drinks: ["bar", "cocktails"], area: "homewood",
    address: "1830 29th Ave S", coords: [33.4745, -86.8012], price: 2,
    knownFor: "Patio drinks on SoHo Square",
    blurb: "Where Homewood goes after work. Busy patio, plates to share.",
    tags: ["patio", "groups", "happy hour"], pop: 68,
  },
  {
    id: "saws-bbq", name: "Saw's BBQ", genres: ["bbq"], area: "edgewood",
    address: "1008 Oxmoor Rd", coords: [33.4655, -86.8098], price: 1,
    knownFor: "Smoked chicken with white sauce",
    blurb: "The first Saw's, a small room on Oxmoor Road. Smoked chicken with white sauce.",
    tags: ["white sauce", "counter service", "original"], pop: 86,
  },
  {
    id: "gianmarcos", name: "GianMarco's", genres: ["italian"], area: "edgewood",
    address: "721 Broadway St", coords: [33.4689, -86.8070], price: 3,
    knownFor: "Old-world Italian & a deep wine list",
    blurb: "Family-run Italian with tablecloths, nightly specials and a big wine list.",
    tags: ["date night", "wine", "family-owned"], pop: 82,
  },
  {
    id: "seeds-coffee", name: "Seeds Coffee", genres: ["coffee"], area: "west-homewood",
    address: "174 Oxmoor Rd", coords: [33.4716, -86.8036], price: 1,
    knownFor: "Homewood-roasted espresso",
    blurb: "Roaster in downtown Homewood. Lots of plants, comfortable chairs.",
    tags: ["roaster", "work-friendly"], pop: 64,
  },
  {
    id: "edgewood-creamery", name: "Edgewood Creamery", sign: "Wood Creamery", genres: ["sweets"], area: "edgewood",
    address: "936 Oxmoor Rd", coords: [33.4661, -86.8091], price: 1,
    knownFor: "Old-fashioned scoops in Edgewood",
    blurb: "Old-fashioned ice cream shop in Edgewood. Get a cone and walk the neighborhood.",
    tags: ["ice cream", "family"], pop: 66,
  },

  {
    id: "savages-bakery", name: "Savage's Bakery", genres: ["sweets"], area: "homewood",
    address: "2916 18th St S", coords: [33.4749, -86.8006], price: 1,
    knownFor: "Smiley-face cookies & meltaways",
    blurb: "Homewood's bakery since 1939. It closed in February 2026 when the owner retired, and the owner of O'Carr's across the street reopened it a month later.",
    tags: ["classic", "kid-friendly", "family"], pop: 84,
  },
  {
    id: "ocarrs", name: "O'Carr's Delicatessen", genres: ["burgers", "sweets"], area: "homewood",
    address: "2909 18th St S", coords: [33.4751, -86.8000], price: 1,
    knownFor: "Deli lunch & Memory Lane ice cream",
    blurb: "Deli lunches on 18th Street since 1975, with a retro ice cream parlor next door.",
    tags: ["lunch", "kid-friendly", "classic"], pop: 78,
  },
  {
    id: "demetris", name: "Demetri's BBQ", genres: ["bbq"], area: "homewood",
    address: "1901 28th Ave S", coords: [33.4765, -86.7965], price: 1,
    knownFor: "Pork plate & Greek-dressed slaw",
    blurb: "Barbecue opened by Demetri Nakos in 1961, on 28th Avenue since 1973 and run now by his son, Sam. It's in the Alabama Barbecue Hall of Fame. Opens early for breakfast.",
    tags: ["classic", "breakfast", "lunch"], pop: 82,
  },
  {
    id: "daves-pizza", name: "Dave's Pizza", genres: ["pizza"], area: "homewood",
    address: "1819 29th Ave S", coords: [33.4746, -86.7983], price: 2,
    knownFor: "Jumbo pies & lunch slices",
    blurb: "Family pizzeria in SoHo since 1990, near Samford.",
    tags: ["family", "kid-friendly", "lunch"], pop: 70,
  },
  /* ---------------------------- ENGLISH VILLAGE ---------------------------- */
  {
    id: "chez-lulu", name: "Chez Lulu & Continental Bakery", genres: ["sweets", "french"], area: "englishvillage",
    address: "1909 Cahaba Rd", coords: [33.4939, -86.7742], price: 2,
    knownFor: "European breads & bistro lunch",
    blurb: "Bakery up front, bistro in back, on Cahaba Road in English Village.",
    tags: ["bakery", "bistro", "brunch"], pop: 79,
  },
  {
    id: "vino", name: "Vino", genres: ["drinks", "italian", "mediterranean"], drinks: ["wine"], area: "englishvillage",
    address: "1930 Cahaba Rd", coords: [33.4933, -86.7735], price: 3,
    knownFor: "Wine-list dinners on the patio",
    blurb: "Mediterranean plates built around the wine list. The patio has string lights.",
    tags: ["wine bar", "patio", "date night"], pop: 73,
  },

  {
    id: "key-circle-commons", name: "Key Circle Commons", genres: ["drinks"], drinks: ["cocktails"], area: "englishvillage",
    address: "2010 Cahaba Rd", coords: [33.4940, -86.7745], price: 3,
    knownFor: "Cocktails & small plates",
    blurb: "English Village cocktail bar with small plates, four years in as of 2026.",
    tags: ["date night", "happy hour", "cocktails"], pop: 72,
  },
  {
    id: "fridas", name: "Frida's Cocina & Cantina", genres: ["latin"], area: "englishvillage",
    address: "2031 Cahaba Rd", coords: [33.4932, -86.7738], price: 3,
    knownFor: "Upscale Mexican & margaritas",
    blurb: "Upscale Mexican and Tex-Mex at the English Village end of Cahaba Road, in the old Civitas space since 2024.",
    tags: ["date night", "happy hour"], pop: 72,
  },
  /* ------------------------- MOUNTAIN BROOK VILLAGE ------------------------- */
  {
    id: "davenports", name: "Davenport's Pizza Palace", genres: ["pizza"], area: "mtnbrook",
    address: "2827 Cahaba Rd", coords: [33.4843, -86.7529], price: 1,
    knownFor: "Cracker-thin crust since 1964",
    blurb: "Thin, cracker-crust pizza in a wood-paneled room. Been in Mountain Brook Village since 1964.",
    tags: ["pizza", "classic", "kid-friendly"], pop: 84,
  },
  {
    id: "gilchrist", name: "Gilchrist", genres: ["sweets", "burgers"], area: "mtnbrook",
    address: "2805 Cahaba Rd", coords: [33.4848, -86.7538], price: 1,
    knownFor: "Limeades & chicken salad",
    blurb: "Old soda fountain in Mountain Brook Village. Order a limeade and a chicken salad sandwich.",
    tags: ["soda fountain", "classic", "lunch"], pop: 78,
  },

  {
    id: "dg", name: "DG", genres: ["southern"], area: "mtnbrook",
    address: "2837 Culver Rd", coords: [33.4835, -86.7540], price: 4,
    knownFor: "A menu that changes daily",
    blurb: "Daniel Briggs's restaurant in Mountain Brook Village, open since 2000 as Daniel George and renamed DG for its 25th year. Lunch on weekdays, dinner Monday through Saturday.",
    tags: ["date night", "special occasion", "lunch"], pop: 84,
  },
  /* --------------------------- CRESTLINE VILLAGE --------------------------- */
  {
    id: "church-street-coffee", name: "Church Street Coffee & Books", genres: ["coffee"], area: "crestline",
    address: "81 Church St", coords: [33.4941, -86.7316], price: 1,
    knownFor: "Lattes between the bookshelves",
    blurb: "Coffee shop and bookstore in one, in the middle of Crestline Village.",
    tags: ["bookstore", "work-friendly"], pop: 70,
  },
  {
    id: "dyrons", name: "Dyron's Lowcountry", genres: ["seafood", "southern"], area: "crestline",
    address: "121 Oak St", coords: [33.4933, -86.7323], price: 3,
    knownFor: "Shrimp & grits",
    blurb: "Lowcountry food in Crestline. She-crab soup, shrimp and grits, and a small bar upstairs.",
    tags: ["Lowcountry", "date night"], pop: 76,
  },
  {
    id: "oteys", name: "Otey's", genres: ["drinks", "burgers"], drinks: ["bar"], area: "crestline",
    address: "224 Country Club Blvd", coords: [33.4929, -86.7330], price: 2,
    knownFor: "Neighborhood tavern & game-day crowd",
    blurb: "Crestline's neighborhood bar. Bar food, cold beer, football on Saturdays.",
    tags: ["tavern", "game day"], pop: 62,
  },

  {
    id: "la-paz", name: "La Paz", genres: ["latin"], area: "crestline",
    address: "99 Euclid Ave", coords: [33.4938, -86.7330], price: 2,
    knownFor: "Tacos & margaritas",
    blurb: "Crestline Village's Tex-Mex and margarita spot.",
    tags: ["lunch", "family", "happy hour"], pop: 74,
  },
  {
    id: "slims-pizzeria", name: "Slim's Pizzeria", genres: ["pizza"], area: "crestline",
    address: "65 Church St", coords: [33.4941, -86.7316], price: 2,
    knownFor: "Hot honey pizza",
    blurb: "Pizza, salads and ice cream on Church Street in Crestline Village since 2022.",
    tags: ["kid-friendly", "family", "lunch"], pop: 74,
  },
  /* ---------------------------- CAHABA HEIGHTS ---------------------------- */
  {
    id: "miss-myras", name: "Miss Myra's Pit Bar-B-Q", genres: ["bbq"], area: "cahaba",
    address: "3278 Cahaba Heights Rd", coords: [33.4648, -86.7292], price: 1,
    knownFor: "Hickory-smoked chicken & white sauce",
    blurb: "Hickory-smoked chicken with white sauce, and pig figurines on every surface. Cahaba Heights has been going here for years.",
    tags: ["white sauce", "classic", "counter service"], pop: 83,
  },
  {
    id: "el-zunzun", name: "El Zunzún", genres: ["latin", "drinks"], drinks: ["cocktails"], area: "cahaba",
    address: "4105 Crosshaven Dr", coords: [33.4588, -86.7250], price: 2,
    knownFor: "Latin plates & a heated patio",
    blurb: "Latin American food, a busy bar, and a patio they heat in the winter.",
    tags: ["patio", "cocktails"], pop: 69,
  },
  {
    id: "miss-astrids", name: "Miss Astrid's Tavern", genres: ["southern", "brunch"], area: "cahaba",
    address: "3160 Pipeline Rd", coords: [33.4626, -86.7262], price: 3,
    knownFor: "Southern plates & weekend brunch",
    blurb: "Cahaba Heights tavern, open since December 2024 in the old Fig Tree Cafe space and named for a co-owner's late mother. It won best food at Viva Vestavia in 2025.",
    tags: ["date night", "brunch", "lunch"], pop: 78,
  },
  /* ------------------------- HOMEWOOD (added) ------------------------- */
  {
    id: "salice", name: "Salice", genres: ["italian"], area: "homewood",
    address: "1722 28th Ave S", coords: [33.4772, -86.8033], price: 3,
    knownFor: "Handmade pasta",
    blurb: "Italian bistro in downtown Homewood, run by chef Rita Bernhardt. It used to be Luca Lagotto; same kitchen, new name and owners.",
    tags: ["pasta", "date night"], pop: 74,
  },
  {
    id: "zozos-kitchen", name: "ZOZO's Kitchen", genres: ["mediterranean"], area: "homewood",
    address: "1830 29th Ave S, Suite 115", coords: [33.4742, -86.8016], price: 2,
    knownFor: "Greek salads and chicken kabobs",
    blurb: "The Cassimus family started the original Zoe's Kitchen in Homewood. This is them again, independent and family owned, in the same SoHo space.",
    tags: ["family-owned", "lunch"], pop: 70,
  },
  {
    id: "caveat-coffee", name: "Caveat Coffee", genres: ["coffee"], area: "homewood",
    address: "2832 Linden Ave", coords: [33.4757, -86.8027], price: 1,
    knownFor: "Pour-overs off the main drag",
    blurb: "Small coffee shop a block off 18th Street, with a drive-through window if you're in a hurry.",
    tags: ["drive-through", "quiet"], pop: 58,
  },
  {
    id: "big-spoon-edgewood", name: "Big Spoon Creamery (Edgewood)", genres: ["sweets"], area: "edgewood",
    address: "927 Oxmoor Rd", coords: [33.4663, -86.8087], price: 1,
    knownFor: "Ice cream sandwiches",
    blurb: "The Edgewood shop from the Big Spoon folks, right across the street from Edgewood Creamery. Try both and pick a side.",
    tags: ["ice cream", "family"], pop: 76,
  },
  {
    id: "el-barrio-homewood", name: "El Barrio (West Homewood)", genres: ["latin", "drinks"], drinks: ["cocktails"], area: "west-homewood",
    address: "195 Oxmoor Rd", coords: [33.4708, -86.8048], price: 2,
    knownFor: "Mexican-Southern plates and margaritas",
    blurb: "The downtown Birmingham favorite, now in Homewood's West Row development. Mexican and Southern cooking mixed together.",
    tags: ["margaritas", "groups"], pop: 75,
  },
  {
    id: "daily-edition", name: "The Daily Edition", genres: ["coffee", "brunch"], area: "west-homewood",
    address: "186 Oxmoor Rd, Suite 116", coords: [33.4712, -86.8042], price: 1,
    knownFor: "Coffee and a breakfast sandwich",
    blurb: "Neighborhood coffee shop in West Homewood. Good for an early meeting.",
    tags: ["breakfast", "work-friendly"], pop: 60,
  },
  {
    id: "pizzeria-gm", name: "Pizzeria GM", genres: ["pizza", "italian"], area: "west-homewood",
    address: "600 Oak Grove Rd", coords: [33.4571, -86.8268], price: 2,
    knownFor: "Neapolitan-style pies",
    blurb: "Italian bistro next to Patriot Park from the GianMarco's family. More on the menu than pizza.",
    tags: ["pizza", "kid-friendly"], pop: 72,
  },

  {
    id: "paramount-west-homewood", name: "Paramount (West Homewood)", genres: ["drinks", "burgers"], drinks: ["bar"], area: "west-homewood",
    address: "195 Oxmoor Rd", coords: [33.4709, -86.8046], price: 2,
    knownFor: "Burgers, wings & Skee-Ball",
    blurb: "The second Paramount, at West Row, with Skee-Ball, claw machines and a long draft list. A hallway connects it to El Barrio.",
    tags: ["game day", "groups", "late night"], pop: 76,
  },
  /* ---------------------- MOUNTAIN BROOK (added) ---------------------- */
  {
    id: "little-betty", name: "Little Betty Steak Bar", genres: ["steaks"], area: "mtnbrook",
    address: "321 Rele St, Suite E8", coords: [33.4833, -86.7527], price: 4,
    knownFor: "Steaks with Italian and Japanese touches",
    blurb: "Steakhouse and bar in Lane Parke. Dressed up but not stiff.",
    tags: ["steak", "date night", "Lane Parke"], pop: 84,
  },
  {
    id: "seabar", name: "SeaBar", genres: ["seafood", "drinks"], drinks: ["cocktails"], area: "mtnbrook",
    address: "1011 Jemison Ln", coords: [33.4831, -86.7522], price: 3,
    knownFor: "Raw bar and crudo",
    blurb: "Seafood bar next door to Little Betty, from the same group. Sit at the bar and order oysters.",
    tags: ["oysters", "Lane Parke"], pop: 72,
  },
  {
    id: "charbar-no-7", name: "CharBar No. 7", genres: ["steaks", "burgers"], area: "mtnbrook",
    address: "900 Jemison Ln", coords: [33.4826, -86.7518], price: 3,
    knownFor: "Burgers and steaks",
    blurb: "Lane Parke grill that can go either way: a burger at the bar or a steak dinner.",
    tags: ["burgers", "patio", "Lane Parke"], pop: 74,
  },
  {
    id: "locanda-brasato", name: "Locanda Brasato", genres: ["italian"], area: "mtnbrook",
    address: "270 Rele St", coords: [33.4838, -86.7533], price: 3,
    knownFor: "Slow-braised Italian",
    blurb: "Opened in 2026 in the old Post Office Pies space in Lane Parke, from the owners of Lé Fresca downtown. Braises and long-cooked sauces.",
    tags: ["date night", "new", "pasta", "Lane Parke"], pop: 76,
  },
  {
    id: "rougaroux", name: "The Rougaroux", genres: ["seafood", "southern"], area: "mtnbrook",
    address: "2716 Culver Rd", coords: [33.4844, -86.7516], price: 2,
    knownFor: "Gumbo and po'boys",
    blurb: "Cajun and Creole food in Mountain Brook Village, in the old Sneaky Pete's building. The original is in Forest Park.",
    tags: ["New Orleans", "lunch"], pop: 74,
  },
  {
    id: "woodys", name: "Woody's Food + Bar", genres: ["drinks", "burgers"], drinks: ["bar"], area: "mtnbrook",
    address: "2721 Cahaba Rd, Suite A", coords: [33.4850, -86.7547], price: 2,
    knownFor: "Burgers and trivia night",
    blurb: "New in 2026 in the space that used to be Carrigan's Mountain Brook. Comfort food and a neighborhood bar.",
    tags: ["new", "trivia", "bar food"], pop: 62,
  },
  {
    id: "abhi", name: "Abhi Eatery & Bar", genres: ["asian"], area: "mtnbrook",
    address: "2721 Cahaba Rd (upstairs)", coords: [33.4851, -86.7549], price: 3,
    knownFor: "Pan-Asian small plates",
    blurb: "Upstairs on Cahaba Road in Mountain Brook Village. Curries, dumplings and a good cocktail list.",
    tags: ["date night", "cocktails"], pop: 70,
  },
  {
    id: "cala-coffee-mb", name: "Cala Coffee", genres: ["coffee"], area: "mtnbrook",
    address: "2409 Montevallo Rd", coords: [33.4869, -86.7571], price: 1,
    knownFor: "House-roasted lattes",
    blurb: "A Birmingham roaster that started with a cart. This is their newest cafe, in Mountain Brook Village.",
    tags: ["roaster", "new"], pop: 64,
  },
  {
    id: "golden-age-wine", name: "Golden Age Wine", genres: ["drinks"], drinks: ["wine"], area: "mtnbrook",
    address: "2828 Culver Rd", coords: [33.4846, -86.7509], price: 2,
    knownFor: "A bottle shop you can drink in",
    blurb: "Wine shop with a bar. Pick something off the shelf and have a glass.",
    tags: ["wine shop", "after work"], pop: 62,
  },
  {
    id: "olexas", name: "Olexa's", genres: ["sweets", "brunch"], area: "mtnbrook",
    address: "2838 Culver Rd", coords: [33.4828, -86.7719], price: 2,
    knownFor: "Crepes, quiche and a slice of cake",
    blurb: "Diane Olexa's cafe, bakery and caterer on Culver Road. It grew out of the wedding cakes she made with her mother. Crepes and quiche at lunch, then cake. Mostly a daytime place, so check hours.",
    tags: ["lunch", "cakes", "family-owned"], pop: 72,
  },
  {
    id: "bongiorno", name: "Bongiorno", genres: ["italian"], area: "crestline",
    address: "68A Church St", coords: [33.4943, -86.7319], price: 2,
    knownFor: "Red-sauce Italian since 1988",
    blurb: "Family-owned Italian in the middle of Crestline Village. Same family, same kind of menu, for more than thirty years.",
    tags: ["family-owned", "classic"], pop: 70,
  },
  {
    id: "crestline-bagel", name: "Crestline Bagel Co.", genres: ["brunch"], area: "crestline",
    address: "66-B Church St", coords: [33.4942, -86.7318], price: 1,
    knownFor: "Bagels and a coffee across the street",
    blurb: "Bagel shop on Church Street. Get one to go and walk over to the bookstore.",
    tags: ["breakfast", "to go"], pop: 70,
  },

  /* ---------------------- VESTAVIA HILLS (added) ---------------------- */
  {
    id: "foodbar", name: "FoodBar", genres: ["southern"], area: "cahaba",
    address: "3156 Heights Village", coords: [33.4627, -86.7301], price: 3,
    knownFor: "Southern plates off Alabama farms",
    blurb: "Chef George McMillian's place in The Heights Village. The menu leans on Alabama farms.",
    tags: ["date night", "seasonal"], pop: 78,
  },
  {
    id: "brick-and-tin-cahaba", name: "Brick & Tin (Cahaba Heights)", genres: ["burgers", "brunch"], area: "cahaba",
    address: "3151 Green Valley Rd", coords: [33.4612, -86.7268], price: 2,
    knownFor: "The brisket panini",
    blurb: "Opened March 2026 in Market Square. Bar, patio and a bakery case, same seasonal menu as downtown.",
    tags: ["new", "patio", "bakery"], pop: 72,
  },
  {
    id: "mudtown", name: "Mudtown Eat & Drink", genres: ["drinks", "burgers"], drinks: ["bar"], area: "cahaba",
    address: "3144 Green Valley Rd", coords: [33.4609, -86.7273], price: 2,
    knownFor: "A beer and a burger after the game",
    blurb: "Cahaba Heights bar and grill where the neighborhood shows up on a Friday.",
    tags: ["sports", "groups"], pop: 68,
  },
  {
    id: "bistro-v", name: "Bistro V", genres: ["french", "drinks"], drinks: ["wine"], area: "vestavia-31",
    address: "521 Montgomery Hwy, Suite 113", coords: [33.4562, -86.7861], price: 3,
    knownFor: "French-Southern dinner and a wine list",
    blurb: "Vestavia Hills' dinner spot for a birthday or an anniversary, in the City Center. Open more than sixteen years.",
    tags: ["date night", "wine"], pop: 76,
  },
  {
    id: "diplomat-deli", name: "Diplomat Deli", genres: ["burgers"], area: "vestavia-31",
    address: "1425 Montgomery Hwy, Suite 101", coords: [33.4392, -86.7943], price: 1,
    knownFor: "The Reuben",
    blurb: "Old-school deli in Park South Plaza. Its Reuben made the state's 100 Dishes to Eat in Alabama list.",
    tags: ["sandwiches", "lunch", "classic"], pop: 74,
  },
  {
    id: "kool-korner", name: "Kool Korner Sandwiches", genres: ["burgers", "latin"], area: "vestavia-31",
    address: "1360 Montgomery Hwy, Suite 106", coords: [33.4406, -86.7935], price: 1,
    knownFor: "Cuban sandwiches",
    blurb: "Pressed Cubans and Caribbean plates on Highway 31. Mostly a lunch place, so check hours.",
    tags: ["sandwiches", "lunch"], pop: 70,
  },
  {
    id: "the-well-co", name: "The Well & Co.", genres: ["coffee"], area: "vestavia-31",
    address: "1425 Montgomery Hwy", coords: [33.4394, -86.7941], price: 1,
    knownFor: "Coffee bar inside a home shop",
    blurb: "Coffee and home goods, started by three friends who met at church. Opened summer 2026.",
    tags: ["new", "shop"], pop: 56,
  },
  {
    id: "iz-cafe", name: "Iz Cafe", genres: ["burgers", "sweets"], area: "rocky-ridge",
    address: "2514 Rocky Ridge Rd", coords: [33.4226, -86.7978], price: 1,
    knownFor: "Soup, sandwich and dessert",
    blurb: "Longtime lunch spot on Rocky Ridge. Save room for the cake case.",
    tags: ["lunch", "desserts"], pop: 64,
  },
  {
    id: "napoli", name: "Napoli Italian Restaurant & Pizza", genres: ["pizza", "italian"], area: "rocky-ridge",
    address: "2516 Rocky Ridge Rd", coords: [33.4224, -86.7975], price: 2,
    knownFor: "Pizza and baked pastas",
    blurb: "Neighborhood Italian next door to Iz Cafe. Good for takeout on a weeknight.",
    tags: ["pizza", "family"], pop: 60,
  },
  {
    id: "the-ridge", name: "The Ridge Eat & Drink", genres: ["burgers", "drinks"], drinks: ["bar"], area: "rocky-ridge",
    address: "3325 Rocky Ridge Plaza", coords: [33.4220, -86.7985], price: 2,
    knownFor: "Burgers & bomb tots",
    blurb: "Mudtown's sister restaurant on Rocky Ridge, open since 2011. Hot dogs and burgers to pasta, and a bar.",
    tags: ["family", "game day", "lunch"], pop: 74,
  },
  {
    id: "the-local-bourbon", name: "The Local Bourbon House & Eatery", sign: "The Local", genres: ["drinks", "burgers"], drinks: ["cocktails"], area: "vestavia-31",
    address: "633 Montgomery Hwy", coords: [33.4495, -86.7884], price: 2,
    knownFor: "Bourbon list & Wagyu smash burgers",
    blurb: "Bourbon bar on Highway 31 in the old Hillside Music & Que space, under new owner Kiran Sunkavalli. Smash burgers, tacos and Southern comfort food.",
    tags: ["patio", "game day"], pop: 72,
  },

  /* -------------------------------- HOOVER -------------------------------- */
  {
    id: "archies-bbq", name: "Archie's Bar-B-Q & Burgers", sign: "Archie's", genres: ["bbq", "burgers"], area: "patton-chapel",
    address: "1571 Montgomery Hwy", coords: [33.4034, -86.806], price: 1,
    knownFor: "Pit barbecue & burgers",
    blurb: "Nick Manakides bought this Highway 31 barbecue joint in 1976, when it was the first Golden Rule franchise. He went independent in 2020 and named it for his father, Archie. The menu and most of the staff stayed, and his son Michael runs it now.",
    tags: ["family-owned", "classic", "lunch"], pop: 74,
  },
];

// JSON types its pairs as number[]; every entry the pin scripts write is [lat, lng]
const ov = overrides as unknown as Record<string, [number, number]>;
/** Editorially curated Birmingham launch guide. Community spots come from the backend. */
export const SPOTS: Spot[] = RAW_SPOTS.map((s) => ({ ...s, city: "birmingham-al", coords: ov[s.id] ?? s.coords }));

/** true once most pins come from a lookup (OpenStreetMap or Google) instead of our estimates */
export const PINS_EXACT = Object.keys(ov).length > SPOTS.length / 2;

export const SPOT_BY_ID: Record<string, Spot> = Object.fromEntries(SPOTS.map((s) => [s.id, s]));
export const GENRE_BY_ID = Object.fromEntries(GENRES.map((g) => [g.id, g])) as Record<GenreId, Genre>;
export const AREA_BY_ID: Record<string, Area> = Object.fromEntries(AREAS.map((a) => [a.id, a]));

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

export function areaLabelOf(s: Spot) {
  return AREA_BY_ID[s.area]?.label ?? s.areaLabel ?? s.area.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

/** Curated areas (Birmingham) plus any neighborhoods members have added. */
export function deriveAreas(cityId: string, spots: Spot[]): Area[] {
  const curated = cityId === "birmingham-al" ? AREAS : [];
  const known = new Set(curated.map((a) => a.id));
  const groups = new Map<string, Spot[]>();
  for (const s of spots) {
    if (known.has(s.area)) continue;
    groups.set(s.area, [...(groups.get(s.area) ?? []), s]);
  }
  const derived: Area[] = [...groups.entries()].map(([id, list]) => {
    const lat = list.reduce((a, s) => a + s.coords[0], 0) / list.length;
    const lng = list.reduce((a, s) => a + s.coords[1], 0) / list.length;
    return { id, label: areaLabelOf(list[0]), center: [lat, lng], zoom: 15.5, blurb: "", labelAt: [lat - 0.0035, lng] };
  });
  return [...curated, ...derived.sort((a, b) => a.label.localeCompare(b.label))];
}

/** Decorative landmarks drawn on the map. */
export const LANDMARKS = [
  { id: "vulcan", label: "Vulcan", coords: [33.4917, -86.7961] as [number, number], icon: "vulcan" },
  { id: "sloss", label: "Sloss Furnaces", coords: [33.5208, -86.7911] as [number, number], icon: "furnace" },
  { id: "railroad-park", label: "Railroad Park", coords: [33.5081, -86.8111] as [number, number], icon: "tree" },
];

/** Rough line of the Red Mountain ridge — the city's great divide. */
export const RED_MOUNTAIN: [number, number][] = [
  [33.4560, -86.8650],
  [33.4700, -86.8380],
  [33.4820, -86.8160],
  [33.4917, -86.7961],
  [33.4990, -86.7740],
  [33.5060, -86.7520],
  [33.5140, -86.7300],
];

export function priceLabel(p: number) {
  return "$".repeat(p);
}

export function distanceKm(a: [number, number], b: [number, number]) {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const la = (a[0] * Math.PI) / 180;
  const lb = (b[0] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la) * Math.cos(lb) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function mapsUrl(s: Spot) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.name} ${s.address} Birmingham AL`)}`;
}
