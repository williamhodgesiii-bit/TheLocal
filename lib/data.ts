import overrides from "./geo-overrides.json";

export type GenreId =
  | "southern"
  | "bbq"
  | "italian"
  | "seafood"
  | "latin"
  | "asian"
  | "mediterranean"
  | "chefs"
  | "brunch"
  | "coffee"
  | "sweets"
  | "drinks";

export type DrinkKind = "cocktails" | "brewery" | "wine" | "bar";

/** Birmingham's curated neighborhoods; community cities derive theirs from member-added spots. */
export type AreaId = string;

export interface Genre {
  id: GenreId;
  label: string;
  short: string;
  color: string;
  icon: string; // lucide icon name, resolved in components/icons.tsx
  tagline: string;
}

export interface Area {
  id: AreaId;
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
}

export const GENRES: Genre[] = [
  { id: "southern", label: "Southern & Soul", short: "Southern", color: "#C8692F", icon: "drumstick", tagline: "Meat-and-threes, cornbread, and somebody's grandmother's recipe." },
  { id: "bbq", label: "Barbecue", short: "BBQ", color: "#9E3B22", icon: "flame", tagline: "Hickory smoke and white sauce. This is Alabama." },
  { id: "italian", label: "Italian & Pizza", short: "Italian", color: "#B8873A", icon: "pizza", tagline: "Red sauce, wood fire, and long wine lists." },
  { id: "seafood", label: "Seafood & Oysters", short: "Seafood", color: "#4F7A80", icon: "fish", tagline: "Gulf-fresh, four hours from the coast." },
  { id: "latin", label: "Mexican & Latin", short: "Latin", color: "#C2553F", icon: "sun", tagline: "Fresh-pressed tortillas and patio margaritas." },
  { id: "asian", label: "Asian", short: "Asian", color: "#8C5A7A", icon: "soup", tagline: "Sushi counters, curry houses, and noodle bowls." },
  { id: "mediterranean", label: "Greek & Mediterranean", short: "Greek", color: "#5D7A9E", icon: "salad", tagline: "Birmingham's Greek roots run deep." },
  { id: "chefs", label: "Special occasion", short: "Special occasion", color: "#7A6A3A", icon: "chef", tagline: "Award-winning rooms for the big night out." },
  { id: "brunch", label: "Brunch & Bakeries", short: "Brunch", color: "#C99A3F", icon: "croissant", tagline: "Biscuits, pastries, and a mimosa or two." },
  { id: "coffee", label: "Coffee", short: "Coffee", color: "#6E4B34", icon: "coffee", tagline: "Local roasters and slow mornings." },
  { id: "sweets", label: "Sweets & Ice Cream", short: "Sweets", color: "#C76F7E", icon: "icecream", tagline: "Small-batch scoops and soda-fountain classics." },
  { id: "drinks", label: "Drinks", short: "Drinks", color: "#D2A23C", icon: "martini", tagline: "Cocktail dens, taprooms, and wine bars." },
];

export const DRINK_KINDS: { id: DrinkKind; label: string }[] = [
  { id: "cocktails", label: "Cocktails" },
  { id: "brewery", label: "Breweries" },
  { id: "wine", label: "Wine" },
  { id: "bar", label: "Bars & Pubs" },
];

export const AREAS: Area[] = [
  { id: "downtown", label: "Downtown", center: [33.5155, -86.8085], zoom: 15, blurb: "Loft district, Morris Avenue, the old storefronts on Second Avenue North.", labelAt: [33.5212, -86.8165] },
  { id: "southside", label: "Southside & Five Points", center: [33.5008, -86.7935], zoom: 15.25, blurb: "Five Points South, the fountain, and the restaurants along Highland Avenue.", labelAt: [33.4972, -86.8030] },
  { id: "lakeview", label: "Lakeview & Pepper Place", center: [33.5150, -86.7925], zoom: 15.5, blurb: "Old warehouses turned into breweries and restaurants. The farmers market runs Saturdays.", labelAt: [33.5098, -86.7838] },
  { id: "avondale", label: "Avondale", center: [33.5250, -86.7760], zoom: 15.75, blurb: "41st Street South and the park.", labelAt: [33.5292, -86.7738] },
  { id: "homewood", label: "Homewood", center: [33.4705, -86.8060], zoom: 14.75, blurb: "Over the mountain. 18th Street, SoHo Square and Edgewood.", labelAt: [33.4800, -86.8160] },
  { id: "englishvillage", label: "English Village", center: [33.4936, -86.7740], zoom: 17, blurb: "A few blocks of Cahaba Road with a bakery on the corner.", labelAt: [33.4978, -86.7742] },
  { id: "mtnbrook", label: "Mountain Brook Village", center: [33.4846, -86.7534], zoom: 17, blurb: "Cahaba Road shops, a soda fountain, and the pizza place.", labelAt: [33.4803, -86.7534] },
  { id: "crestline", label: "Crestline Village", center: [33.4936, -86.7322], zoom: 17, blurb: "A small village center with a coffee shop and a couple of restaurants.", labelAt: [33.4978, -86.7322] },
  { id: "cahaba", label: "Cahaba Heights", center: [33.4620, -86.7275], zoom: 15.75, blurb: "Barbecue and patios off Cahaba Heights Road.", labelAt: [33.4542, -86.7275] },
];

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
    id: "helen", name: "Helen", genres: ["chefs"], area: "downtown",
    address: "2013 2nd Ave N", coords: onAveN(2013, 2), price: 4,
    knownFor: "Hearth-fired steaks & seafood",
    blurb: "Rob McDaniel's place on Second Avenue. Long, narrow brick room, most everything cooked over the hearth. It's in the Michelin guide, so book ahead.",
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
    id: "the-essential", name: "The Essential", genres: ["brunch", "chefs"], area: "downtown",
    address: "2018 Morris Ave", coords: grid(20.18, -0.4), price: 3,
    knownFor: "Pastry-forward brunch",
    blurb: "Brunch and lunch on Morris Avenue, on the cobblestone stretch. Look at the pastry case before you order.",
    tags: ["brunch", "pastries", "Morris Ave"], pop: 84,
  },
  {
    id: "brick-and-tin", name: "Brick & Tin", genres: ["southern", "brunch"], area: "downtown",
    address: "214 20th St N", coords: onStN(214, 20), price: 2,
    knownFor: "Farm-driven sandwiches & salads",
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
    id: "revelator-downtown", name: "Revelator Coffee", genres: ["coffee"], area: "downtown",
    address: "1826 3rd Ave N", coords: onAveN(1826, 3), price: 1,
    knownFor: "House-roasted pour-overs",
    blurb: "Birmingham roaster with a bright, quiet cafe downtown. Good place to sit with a laptop.",
    tags: ["roaster", "work-friendly"], pop: 66,
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
    knownFor: "Romantic craft cocktails",
    blurb: "Dim, velvet-heavy cocktail bar on First Avenue North. Good for a date. Happy hour is a deal.",
    tags: ["cocktails", "date night", "happy hour"], pop: 72,
  },
  {
    id: "paramount", name: "Paramount", genres: ["drinks"], drinks: ["bar"], area: "downtown",
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
    id: "carrigans", name: "Carrigan's Public House", genres: ["drinks", "southern"], drinks: ["bar"], area: "downtown",
    address: "2430 Morris Ave", coords: grid(24.3, -0.4), price: 2,
    knownFor: "Patio pints & elevated pub fare",
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
    id: "back-forty", name: "Back Forty Beer Co.", genres: ["drinks"], drinks: ["brewery"], area: "downtown",
    address: "3201 1st Ave N", coords: onAveN(3201, 1), price: 2,
    knownFor: "Taproom pizza & Naked Pig ale",
    blurb: "Gadsden brewery with a big taproom near Sloss Furnaces. Pizza from the kitchen.",
    tags: ["brewery", "pizza", "Sloss Quarter"], pop: 64,
  },

  /* ------------------------ SOUTHSIDE & FIVE POINTS ------------------------ */
  {
    id: "bottega", name: "Bottega", genres: ["italian", "chefs"], area: "southside",
    address: "2240 Highland Ave S", coords: [33.5006, -86.7917], price: 4,
    knownFor: "Handmade pasta & Parmesan soufflé",
    blurb: "Frank and Pardis Stitt's Italian restaurant in a big stone building on Highland Avenue. The cafe side is more casual.",
    tags: ["date night", "pasta", "wine"], pop: 93,
  },
  {
    id: "chez-fonfon", name: "Chez Fonfon", genres: ["chefs"], area: "southside",
    address: "2007 11th Ave S", coords: onAveS(2007, 11), price: 3,
    knownFor: "The burger, and the bocce court",
    blurb: "French bistro in Five Points South from the Stitts. Steak frites, a zinc bar, and a bocce court out back.",
    tags: ["bistro", "French", "patio"], pop: 90,
  },
  {
    id: "surin-west", name: "Surin West", genres: ["asian"], area: "southside",
    address: "1918 11th Ave S", coords: onAveS(1918, 11), price: 2,
    knownFor: "Thai curries & sushi",
    blurb: "Thai food and a sushi bar in Five Points. Been around a long time for good reason.",
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
    id: "dreamland-southside", name: "Dreamland Bar-B-Que", genres: ["bbq"], area: "southside",
    address: "1427 14th Ave S", coords: onAveS(1427, 14), price: 2,
    knownFor: "Ribs, sauce, and white bread",
    blurb: "The Birmingham outpost of the Tuscaloosa rib joint. Ribs, sauce, white bread.",
    tags: ["ribs", "Alabama classic"], pop: 82,
  },
  {
    id: "rojo", name: "Rojo", genres: ["latin", "brunch"], area: "southside",
    address: "2921 Highland Ave S", coords: [33.5009, -86.7843], price: 2,
    knownFor: "Patio tacos facing Rhodes Park",
    blurb: "Latin and American food in Highland Park, with a dog-friendly patio across from Rhodes Park.",
    tags: ["patio", "dog-friendly", "brunch"], pop: 77,
  },

  /* ------------------------ LAKEVIEW & PEPPER PLACE ------------------------ */
  {
    id: "automatic-seafood", name: "Automatic Seafood & Oysters", genres: ["seafood", "chefs"], area: "lakeview",
    address: "2824 5th Ave S", coords: onAveS(2824, 5), price: 4,
    knownFor: "Gulf oysters & whole fish",
    blurb: "Adam Evans's seafood place in an old industrial building in Lakeview. He won a James Beard award. Start with oysters.",
    tags: ["oysters", "James Beard", "date night"], pop: 94,
  },
  {
    id: "ovenbird", name: "Ovenbird", genres: ["chefs"], area: "lakeview",
    address: "2805 2nd Ave S", coords: onAveS(2805, 2), price: 3,
    knownFor: "Live-fire small plates",
    blurb: "Chris Hastings's live-fire small plates restaurant at Pepper Place. Order a bunch and share.",
    tags: ["small plates", "live fire", "Pepper Place"], pop: 89,
  },
  {
    id: "hot-and-hot", name: "Hot and Hot Fish Club", genres: ["seafood", "chefs"], area: "lakeview",
    address: "2901 2nd Ave S", coords: onAveS(2901, 2), price: 4,
    knownFor: "The summer tomato salad",
    blurb: "Chris and Idie Hastings have run it since 1995. It's at Pepper Place now. Sit at the counter if you can.",
    tags: ["chef's counter", "Southern", "Pepper Place"], pop: 88,
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
    id: "ghost-train", name: "Ghost Train Brewing", genres: ["drinks"], drinks: ["brewery"], area: "lakeview",
    address: "2616 3rd Ave S", coords: onAveS(2616, 3), price: 1,
    knownFor: "Beers + canned cocktails",
    blurb: "Lakeview taproom. Beer, plus canned cocktails if someone in your group doesn't drink beer.",
    tags: ["brewery", "groups"], pop: 66,
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
    id: "post-office-pies", name: "Post Office Pies", genres: ["italian"], area: "avondale",
    address: "209 41st St S", coords: onStS(209, 41), price: 2,
    knownFor: "Wood-fired pies in the old post office",
    blurb: "Wood-fired pizza in Avondale's old post office. Get the garlic knots.",
    tags: ["pizza", "groups", "kid-friendly"], pop: 85,
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
    blurb: "Small-batch ice cream in the MAKEbhm building. Recently named one of the best ice cream shops in the country.",
    tags: ["ice cream", "family"], pop: 83,
  },
  {
    id: "cahaba-brewing", name: "Cahaba Brewing Co.", genres: ["drinks"], drinks: ["brewery"], area: "avondale",
    address: "4500 5th Ave S", coords: onAveS(4500, 5), price: 1,
    knownFor: "Taproom in the old Continental Gin",
    blurb: "Taproom in the old Continental Gin building at the east end of Avondale. Trivia nights and food trucks.",
    tags: ["brewery", "food trucks"], pop: 63,
  },

  /* ------------------------------- HOMEWOOD ------------------------------- */
  {
    id: "johnnys", name: "Johnny's Restaurant", genres: ["southern", "mediterranean"], area: "homewood",
    address: "2902 18th St S", coords: [33.4752, -86.8003], price: 2,
    knownFor: "Greek-and-three & keftedes",
    blurb: "Timothy Hontzas's meat-and-three, with Greek dishes alongside the Southern ones. He's been up for James Beard awards. Lunch line moves fast.",
    tags: ["meat-and-three", "James Beard", "lunch"], pop: 91,
  },
  {
    id: "little-donkey", name: "Little Donkey", genres: ["latin"], area: "homewood",
    address: "2701 18th St S", coords: [33.4772, -86.7988], price: 2,
    knownFor: "Smoked meats & fresh-pressed tortillas",
    blurb: "Mexican food with some Southern in it. Smoked meats, tortillas made in house, long margarita list.",
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
    id: "saws-bbq", name: "Saw's BBQ", genres: ["bbq"], area: "homewood",
    address: "1008 Oxmoor Rd", coords: [33.4655, -86.8098], price: 1,
    knownFor: "Smoked chicken with white sauce",
    blurb: "The first Saw's, a small room on Oxmoor Road. Smoked chicken with white sauce.",
    tags: ["white sauce", "counter service", "original"], pop: 86,
  },
  {
    id: "gianmarcos", name: "GianMarco's", genres: ["italian", "chefs"], area: "homewood",
    address: "721 Broadway St", coords: [33.4689, -86.8070], price: 3,
    knownFor: "Old-world Italian & a deep wine list",
    blurb: "Family-run Italian with tablecloths, nightly specials and a big wine list.",
    tags: ["date night", "wine", "family-owned"], pop: 82,
  },
  {
    id: "nabeels", name: "Nabeel's Cafe & Market", genres: ["mediterranean"], area: "homewood",
    address: "1706 Oxmoor Rd", coords: [33.4610, -86.8172], price: 2,
    knownFor: "Greek market & cafe since 1972",
    blurb: "Greek and Italian grocery with a small cafe in back, open since 1972. Pick up feta and olives on the way out.",
    tags: ["market", "family-owned", "lunch"], pop: 74,
  },
  {
    id: "seeds-coffee", name: "Seeds Coffee", genres: ["coffee"], area: "homewood",
    address: "174 Oxmoor Rd", coords: [33.4716, -86.8036], price: 1,
    knownFor: "Homewood-roasted espresso",
    blurb: "Roaster in downtown Homewood. Lots of plants, comfortable chairs.",
    tags: ["roaster", "work-friendly"], pop: 64,
  },
  {
    id: "edgewood-creamery", name: "Edgewood Creamery", genres: ["sweets"], area: "homewood",
    address: "910 Oxmoor Rd", coords: [33.4664, -86.8086], price: 1,
    knownFor: "Old-fashioned scoops in Edgewood",
    blurb: "Old-fashioned ice cream shop in Edgewood. Get a cone and walk the neighborhood.",
    tags: ["ice cream", "family"], pop: 66,
  },

  /* ---------------------------- ENGLISH VILLAGE ---------------------------- */
  {
    id: "chez-lulu", name: "Chez Lulu & Continental Bakery", genres: ["brunch", "sweets"], area: "englishvillage",
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

  /* ------------------------- MOUNTAIN BROOK VILLAGE ------------------------- */
  {
    id: "davenports", name: "Davenport's Pizza Palace", genres: ["italian"], area: "mtnbrook",
    address: "2827 Cahaba Rd", coords: [33.4843, -86.7529], price: 1,
    knownFor: "Cracker-thin crust since 1964",
    blurb: "Thin, cracker-crust pizza in a wood-paneled room. Been in Mountain Brook Village since 1964.",
    tags: ["pizza", "classic", "kid-friendly"], pop: 84,
  },
  {
    id: "gilchrist", name: "Gilchrist", genres: ["sweets", "southern"], area: "mtnbrook",
    address: "2805 Cahaba Rd", coords: [33.4848, -86.7538], price: 1,
    knownFor: "Limeades & chicken salad",
    blurb: "Old soda fountain in Mountain Brook Village. Order a limeade and a chicken salad sandwich.",
    tags: ["soda fountain", "classic", "lunch"], pop: 78,
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
    id: "oteys", name: "Otey's", genres: ["drinks"], drinks: ["bar"], area: "crestline",
    address: "224 Country Club Blvd", coords: [33.4929, -86.7330], price: 2,
    knownFor: "Neighborhood tavern & game-day crowd",
    blurb: "Crestline's neighborhood bar. Bar food, cold beer, football on Saturdays.",
    tags: ["tavern", "game day"], pop: 62,
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
];

const ov = overrides as Record<string, [number, number]>;
/** Editorially curated Birmingham launch guide. Community spots come from the backend. */
export const SPOTS: Spot[] = RAW_SPOTS.map((s) => ({ ...s, city: "birmingham-al", coords: ov[s.id] ?? s.coords }));

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
