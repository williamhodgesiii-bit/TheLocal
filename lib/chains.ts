/** National chains & fast food. The Local only lists independent spots. Submissions matching these are blocked. */
const CHAINS = [
  "mcdonald's", "burger king", "wendy's", "chick-fil-a", "chick fil a", "taco bell", "kfc", "popeyes", "sonic drive-in", "arby's",
  "subway", "jimmy john's", "jersey mike's", "firehouse subs", "zaxby's", "raising cane's", "whataburger", "hardee's", "krystal",
  "checkers", "rally's", "jack in the box", "five guys", "shake shack", "domino's", "papa john's", "pizza hut", "little caesars",
  "marco's pizza", "starbucks", "dunkin", "dunkin donuts", "tim hortons", "panera", "panera bread", "chipotle", "qdoba", "moe's southwest grill",
  "wingstop", "buffalo wild wings", "hooters", "applebee's", "chili's", "olive garden", "red lobster", "outback steakhouse", "texas roadhouse",
  "longhorn steakhouse", "cracker barrel", "ihop", "denny's", "waffle house", "golden corral", "cheesecake factory",
  "p.f. chang's", "pf chang's", "red robin", "ruby tuesday", "tgi fridays", "logan's roadhouse", "o'charley's", "bojangles",
  "church's chicken", "dairy queen", "culver's", "steak 'n shake", "steak n shake", "panda express", "jason's deli",
  "mcalister's", "newk's", "zoe's kitchen", "cava", "sweetgreen", "smoothie king", "tropical smoothie", "dutch bros",
  "krispy kreme", "cinnabon", "baskin robbins", "cold stone", "carrabba's", "bonefish grill", "ruth's chris",
  "fleming's", "kona grill", "twin peaks", "chuy's", "on the border", "el chico", "taco cabana", "del taco", "captain d's",
];

const flat = (s: string) => ` ${s.toLowerCase().replace(/[’'`.]/g, "").replace(/[^a-z0-9]+/g, " ").trim()} `;
const FLAT = CHAINS.map((c) => [c, flat(c)] as const);

/** Whole-word match so e.g. "Cavalier's" doesn't trip "cava". */
export function looksLikeChain(name: string) {
  const n = flat(name);
  return FLAT.find(([, f]) => n.includes(f))?.[0] ?? null;
}

export function normalizeName(name: string) {
  return name
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/&/g, " and ")
    .replace(/\b(the|restaurant|cafe|café|bar|grill|co|company|kitchen)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
