import type { GenreId, Spot } from "./data";

/**
 * Curated, openly licensed photography (Wikimedia Commons).
 *
 * Every entry was checked for: the right dish (from the file's own description),
 * a usable size, no fast-food/chain branding in the subject, and a license that
 * allows commercial use with credit (CC0 / public domain / CC BY / CC BY-SA).
 * Credits render under each photo and on /credits.
 *
 * Images load through Special:FilePath?width=…, which serves a resized JPEG
 * from Wikimedia's CDN (or the original if it's smaller), so the browser gets
 * a proper srcset and phones never download a desktop-sized file.
 */
export type StockPhoto = {
  file: string; // exact Commons file name
  dish: string; // what's in the picture, in plain words
  author: string;
  license: "CC0" | "Public domain" | "CC BY 2.0" | "CC BY 3.0" | "CC BY-SA 2.0" | "CC BY-SA 3.0" | "CC BY-SA 4.0";
};

const P = (file: string, dish: string, author: string, license: StockPhoto["license"]): StockPhoto => ({ file, dish, author, license });

export const LIBRARY = {
  // Southern & soul
  "soul-plate": P("Soul_Food_Dinner.jpg", "a soul food plate (fried chicken, collards, mac and cheese)", "Clancy Ratliff", "CC BY-SA 2.0"),
  "chicken-waffles": P("Chicken_and_waffles_with_peaches_and_cream.jpg", "chicken and waffles", "Arnold Inuyaki", "CC BY 2.0"),
  biscuits: P("Fresh_Baked_Biscuits_(2675532274).jpg", "fresh-baked biscuits", "Pen Waggener", "CC BY 2.0"),
  "biscuits-gravy": P("Biscuits_and_gravy.jpg", "biscuits and gravy", "Dan4th Nicholas", "CC BY 2.0"),
  cornbread: P("Yellow_cornbread.jpg", "skillet cornbread", "Calstanhope", "CC BY-SA 4.0"),
  "mac-cheese": P("Edna_Lewis's_Macaroni_&_Cheese.jpg", "baked macaroni and cheese", "Valereee", "CC BY-SA 4.0"),
  "banana-pudding": P("Classic_Banana_Pudding_-_50595000172.jpg", "banana pudding", "Alabama Extension (Janet Guynn)", "CC0"),
  "shrimp-grits": P("Commander's_Palace_shrimp_&_grits.jpg", "shrimp and grits", "Krista", "CC BY 2.0"),
  "lane-cake": P("Slice_of_lane_cake.jpg", "a slice of Lane cake, Alabama's state dessert", "Eunice", "CC BY-SA 2.0"),
  // Barbecue
  ribs: P("Baby_back_ribs_-_hickory_smoked.jpg", "hickory-smoked ribs", "Foodista", "CC BY 2.0"),
  brisket: P("Brisket_and_Beef_Ribs_(16916390640).jpg", "brisket and beef ribs", "Arnold Gatilao", "CC BY 2.0"),
  "white-sauce": P("Smoked_Chicken_Sandwich.jpg", "white sauce chicken (smoked, with Alabama white sauce)", "Sirsendu.mohanta", "CC BY-SA 4.0"),
  // Italian & pizza
  "pizza-napoletana": P("Pizza-napoletana.jpg", "a Neapolitan pizza", "Fabryx98", "CC BY-SA 4.0"),
  "pizza-margherita": P("Eq_it-na_pizza-margherita_sep2005_sml.jpg", "a pizza Margherita", "Valerio Capello", "CC BY-SA 3.0"),
  "pasta-ragu": P("Tagliatelle_al_ragu_Bolognese.jpg", "tagliatelle al ragù", "Petar Milošević", "CC BY-SA 4.0"),
  "pasta-fresh": P("Tallarines_boloñesa_pastafresca_tagliatelle_bolognese.jpg", "fresh tagliatelle", "Tirithel", "CC BY-SA 4.0"),
  // Seafood
  oysters: P('"Fine_de_Claire"_raw_oysters.jpg', "raw oysters on the half shell", "Aitor22", "CC BY-SA 4.0"),
  gumbo: P("Cajun_seafood_gumbo.jpg", "seafood gumbo", "NancyCLee", "Public domain"),
  "poboy-gumbo": P("Liuzza's_by_the_track_shrimp_po'_boy_&_gumbo_New_Orleans.jpg", "a shrimp po'boy and a cup of gumbo", "Krista", "CC BY 2.0"),
  poboy: P("Po'_boy_(New_Orleans,_Louisiana).jpg", "po'boys", "Shubert Ciencia", "CC BY 2.0"),
  "grilled-fish": P("Plated_grilled_fish.jpg", "whole grilled fish", "pompi", "CC0"),
  // Mexican & Latin
  tacos: P("(El_Flaco)_Tacos_Al_Pastor.jpg", "tacos al pastor", "City Foodsters", "CC BY 2.0"),
  "tacos-2": P("Tacos_al_Pastor_2.jpg", "street tacos", "Ari Helminen", "CC BY 2.0"),
  margarita: P("Margarita.jpg", "a margarita with a salt rim", "Jon Sullivan", "Public domain"),
  cubano: P("Cubano_sandwich.jpg", "a pressed Cuban sandwich", "jeffreyw", "CC BY 2.0"),
  // Asian
  nigiri: P("Nigirizushi_at_Itsudemo_Tapiola.jpg", "a plate of nigiri", "JIP", "CC BY-SA 4.0"),
  "sushi-platter": P("Sushi_platter.jpg", "a sushi platter", "Ishikawa Ken", "CC BY-SA 2.0"),
  "green-curry": P("Thai_green_curry_with_chicken_at_restaurant_Thai_Street_Food_in_Porvoo.jpg", "Thai green curry", "JIP", "CC BY-SA 4.0"),
  tikka: P("Chicken_tikka_masala.jpg", "chicken tikka masala and naan", "Michael Hays", "CC BY 2.0"),
  dumplings: P("Three_dim_sum_in_steamer_basket.jpg", "dumplings in a steamer basket", "Mshuang2", "CC0"),
  // Greek & Mediterranean
  "greek-salad": P("Greece_Food_Horiatiki.JPG", "a Greek village salad", "Jpatokal", "CC BY-SA 3.0"),
  gyro: P("Gyros_pita.jpg", "a gyro in pita", "Christo", "CC BY-SA 4.0"),
  // Special occasion
  steak: P("Ribeyes.jpeg", "grilled ribeyes", "Jon Sullivan", "Public domain"),
  "steak-frites": P("Steak-frites_as_served_at_Le_Relais_de_Venise_-_L'Entrecote.jpg", "steak frites", "Dcollard", "Public domain"),
  burger: P("Gourmet_Burger_Kitchen_hamburger.jpg", "a burger with all the fixings", "Khedara Ariyaratne", "CC BY 2.0"),
  // Brunch, bakery, deli
  croissant: P("Morning-breakfast-croissant_(24244330501).jpg", "croissants and coffee", "Pixel.la", "CC0"),
  bagels: P("Bagels,_everything_-_San_Francisco.jpg", "everything bagels", "Daderot", "CC0"),
  "eggs-benedict": P("Eggs_Benedict-01.jpg", "eggs Benedict", "Jon Mountjoy", "CC BY 2.0"),
  reuben: P("Reuben_sandwich_at_Third_Wave_Cafe_in_Prahran.jpg", "a Reuben sandwich", "Katherine Lim", "CC BY 2.0"),
  // Coffee
  latte: P("Cappuccino_at_Sightglass_Coffee.jpg", "a latte", "Jonathan McIntosh", "CC BY-SA 4.0"),
  cappuccino: P("Cappuccino_with_latte_art_on_Coffee_Right_in_Brno,_Brno-City_District.jpg", "a cappuccino with latte art", "Frettie", "CC BY 3.0"),
  pourover: P("Manual_Brew_V60.jpg", "a pour-over", "Robijuniarta", "CC BY-SA 4.0"),
  // Sweets
  cone: P("Ice_cream_cone.jpg", "an ice cream cone", "D. Sharon Pruitt", "CC BY 2.0"),
  "ice-cream-sandwich": P("Ice_cream_sandwich_(1).jpg", "an ice cream sandwich", "Renee Comet, National Cancer Institute", "Public domain"),
  limeade: P("Lemon_lime_soda.jpg", "a cold lime soda", "Corn cheese", "CC BY-SA 4.0"),
  // Drinks
  "old-fashioned": P("Old_Fashioned_Glass.jpg", "an old fashioned", "Andreas Argirakis", "CC BY-SA 3.0"),
  "cocktail-bar": P("Ascensor_Cocktail_Bar_(53367059652).jpg", "a cocktail bar at night", "Jorge Franganillo", "CC BY 2.0"),
  "beer-flight": P("Big_Timber_Brewing_flight_of_beer.jpg", "a flight of craft beer", "Aparkswv", "CC BY-SA 4.0"),
  "beer-sampler": P("Tuatara_Brewery_Sampler_(15372558112).jpg", "a beer sampler", "cogdogblog", "CC BY 2.0"),
  wine: P("Dining_table_for_two.jpg", "a table set for two with wine", "Jeremy van Bedijk", "CC BY 2.0"),
} satisfies Record<string, StockPhoto>;

export type DishKey = keyof typeof LIBRARY;

/** Real photos of the place itself (openly licensed). Shown before anything else. */
export const PLACE_PHOTOS: Record<string, { file: string; kind: "building" | "inside"; caption: string; author: string; license: StockPhoto["license"] }[]> = {
  johnnys: [{ file: "Johnny's_Greek_And_Three,_Homewood,_AL.jpg", kind: "building", caption: "Out front on 18th Street", author: "Paul Lowry", license: "CC BY 2.0" }],
  "good-people": [{ file: "Good_People_Brewing_Company_(Interior).jpg", kind: "inside", caption: "The bar inside", author: "GreaterPonce665", license: "CC BY-SA 4.0" }],
};

/** Each place's signature dishes, most telling first. */
const SPOT_DISHES: Record<string, DishKey[]> = {
  helen: ["steak", "grilled-fish", "old-fashioned"],
  "yo-mamas": ["chicken-waffles", "soul-plate", "biscuits"],
  "bamboo-on-2nd": ["sushi-platter", "dumplings", "cocktail-bar"],
  "the-essential": ["croissant", "eggs-benedict", "latte"],
  "brick-and-tin": ["reuben", "biscuits", "latte"],
  "nikis-west": ["soul-plate", "mac-cheese", "cornbread"],
  "revelator-downtown": ["pourover", "latte", "croissant"],
  "collins-bar": ["old-fashioned", "cocktail-bar"],
  "paper-doll": ["cocktail-bar", "old-fashioned", "wine"],
  paramount: ["burger", "beer-sampler"],
  "pale-eddies": ["beer-sampler", "beer-flight"],
  carrigans: ["burger", "beer-flight", "old-fashioned"],
  "good-people": ["beer-flight", "beer-sampler"],
  "back-forty": ["pizza-napoletana", "beer-flight"],
  bottega: ["pasta-fresh", "pasta-ragu", "wine"],
  "chez-fonfon": ["burger", "steak-frites", "wine"],
  "surin-west": ["green-curry", "nigiri", "dumplings"],
  "taj-india": ["tikka", "green-curry"],
  "fish-market": ["grilled-fish", "greek-salad", "oysters"],
  "dreamland-southside": ["ribs", "brisket"],
  rojo: ["tacos", "margarita", "eggs-benedict"],
  "automatic-seafood": ["oysters", "grilled-fish", "old-fashioned"],
  ovenbird: ["steak", "grilled-fish", "wine"],
  "hot-and-hot": ["grilled-fish", "shrimp-grits", "wine"],
  "red-cat": ["cappuccino", "croissant"],
  trimtab: ["beer-flight", "beer-sampler"],
  "ghost-train": ["beer-sampler", "beer-flight"],
  "saws-soul-kitchen": ["white-sauce", "soul-plate", "mac-cheese"],
  "post-office-pies": ["pizza-napoletana", "pizza-margherita"],
  "avondale-brewing": ["beer-flight", "beer-sampler"],
  "big-spoon": ["ice-cream-sandwich", "cone"],
  "cahaba-brewing": ["beer-sampler", "beer-flight"],
  johnnys: ["soul-plate", "greek-salad", "cornbread"],
  "little-donkey": ["tacos", "margarita", "tacos-2"],
  jinsei: ["nigiri", "sushi-platter"],
  "soho-social": ["old-fashioned", "burger", "wine"],
  "saws-bbq": ["white-sauce", "ribs", "mac-cheese"],
  gianmarcos: ["pasta-ragu", "wine", "steak"],
  nabeels: ["gyro", "greek-salad"],
  "seeds-coffee": ["latte", "pourover", "croissant"],
  "edgewood-creamery": ["cone", "ice-cream-sandwich"],
  "chez-lulu": ["croissant", "eggs-benedict", "wine"],
  vino: ["wine", "pasta-fresh", "greek-salad"],
  davenports: ["pizza-margherita", "pizza-napoletana"],
  gilchrist: ["limeade", "cone"],
  "church-street-coffee": ["cappuccino", "croissant", "latte"],
  dyrons: ["shrimp-grits", "oysters", "gumbo"],
  oteys: ["burger", "beer-sampler"],
  "miss-myras": ["white-sauce", "banana-pudding", "ribs"],
  "el-zunzun": ["tacos-2", "margarita", "cubano"],
  salice: ["pasta-fresh", "pasta-ragu", "wine"],
  "zozos-kitchen": ["greek-salad", "gyro"],
  "red-mountain-espresso": ["cappuccino", "latte"],
  "caveat-coffee": ["pourover", "cappuccino"],
  "big-spoon-edgewood": ["ice-cream-sandwich", "cone"],
  "el-barrio-homewood": ["tacos", "margarita"],
  "daily-edition": ["latte", "biscuits", "bagels"],
  "pizzeria-gm": ["pizza-napoletana", "pizza-margherita", "pasta-ragu"],
  "little-betty": ["steak", "old-fashioned", "wine"],
  seabar: ["oysters", "grilled-fish", "old-fashioned"],
  "charbar-no-7": ["burger", "steak"],
  "locanda-brasato": ["pasta-ragu", "pasta-fresh", "wine"],
  rougaroux: ["poboy-gumbo", "gumbo", "poboy"],
  woodys: ["burger", "beer-sampler"],
  abhi: ["dumplings", "green-curry", "cocktail-bar"],
  "cala-coffee-mb": ["latte", "pourover"],
  "golden-age-wine": ["wine"],
  bongiorno: ["pasta-ragu", "pizza-margherita", "wine"],
  "crestline-bagel": ["bagels", "latte"],
  "taco-mama-crestline": ["tacos-2", "tacos"],
  foodbar: ["shrimp-grits", "steak", "cornbread"],
  "brick-and-tin-cahaba": ["brisket", "biscuits", "reuben"],
  mudtown: ["burger", "beer-flight"],
  "bistro-v": ["steak-frites", "wine", "grilled-fish"],
  "diplomat-deli": ["reuben", "gumbo"],
  "kool-korner": ["cubano"],
  "the-well-co": ["latte", "cappuccino"],
  "iz-cafe": ["lane-cake", "reuben"],
  napoli: ["pizza-margherita", "pasta-ragu"],
};

/** Fallback for member-added places, by kind of food. */
const GENRE_DISHES: Record<GenreId, DishKey[]> = {
  southern: ["soul-plate", "biscuits", "cornbread"],
  bbq: ["ribs", "white-sauce", "brisket"],
  italian: ["pasta-ragu", "pizza-napoletana"],
  seafood: ["oysters", "shrimp-grits", "grilled-fish"],
  latin: ["tacos", "margarita"],
  asian: ["nigiri", "dumplings", "green-curry"],
  mediterranean: ["greek-salad", "gyro"],
  chefs: ["steak", "wine"],
  brunch: ["eggs-benedict", "croissant", "biscuits"],
  coffee: ["latte", "pourover"],
  sweets: ["cone", "banana-pudding"],
  drinks: ["old-fashioned", "beer-flight", "wine"],
};

/** "a soul food plate (fried chicken…)" → "Soul food plate" */
export const shortDish = (d: StockPhoto) => {
  const t = d.dish.split(/ \(|, /)[0].replace(/^(a|an) /, "");
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export function dishesFor(spot: Spot): StockPhoto[] {
  const keys = SPOT_DISHES[spot.id] ?? spot.genres.flatMap((g) => GENRE_DISHES[g] ?? []);
  return [...new Set(keys)].map((k) => LIBRARY[k]);
}

export const commonsSrc = (file: string, width: number) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width}`;
// Wikimedia pre-renders these widths; asking for others is slower and may be throttled.
export const commonsSrcSet = (file: string, widths = [330, 500, 960, 1280]) => widths.map((w) => `${commonsSrc(file, w)} ${w}w`).join(", ");
export const commonsPage = (file: string) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}`;

const LICENSE_URL: Record<StockPhoto["license"], string> = {
  CC0: "https://creativecommons.org/publicdomain/zero/1.0/",
  "Public domain": "https://commons.wikimedia.org/wiki/Commons:Public_domain",
  "CC BY 2.0": "https://creativecommons.org/licenses/by/2.0/",
  "CC BY 3.0": "https://creativecommons.org/licenses/by/3.0/",
  "CC BY-SA 2.0": "https://creativecommons.org/licenses/by-sa/2.0/",
  "CC BY-SA 3.0": "https://creativecommons.org/licenses/by-sa/3.0/",
  "CC BY-SA 4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
};
export const licenseUrl = (l: StockPhoto["license"]) => LICENSE_URL[l];

/** The single best picture to represent a place in lists and cards. */
export function coverFor(spot: Spot): { file: string; alt: string; real: boolean } {
  const real = PLACE_PHOTOS[spot.id]?.[0];
  if (real) return { file: real.file, alt: `${spot.name}: ${real.caption.toLowerCase()}`, real: true };
  const d = dishesFor(spot)[0];
  return { file: d.file, alt: `Stock photo of ${d.dish}`, real: false };
}
