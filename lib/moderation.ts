/**
 * Words that never post: slurs and threats, matched as whole words (and through the usual
 * letter swaps like 4 for a). The database checks the same list (supabase/schema.sql,
 * banned_terms), so keep the two in step. Everything else, including the occasional "damn
 * good", is fine: this is a floor, and reports plus a person reading them do the rest.
 */
const TERMS = [
  "nigger", "niggers", "nigga", "niggas", "faggot", "faggots", "fag", "fags", "dyke", "dykes", "tranny", "trannies", "retard", "retards", "retarded",
  "chink", "chinks", "spic", "spics", "kike", "kikes", "wetback", "wetbacks", "gook", "gooks", "coon", "coons", "beaner", "beaners", "raghead",
  "ragheads", "towelhead", "towelheads", "cunt", "cunts", "kys", "kill yourself", "kill urself",
];

const unswap = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[0@4]/g, (c) => (c === "0" ? "o" : "a"))
    .replace(/[1!]/g, "i")
    .replace(/3/g, "e")
    .replace(/\$/g, "s")
    .replace(/[^a-z\s]/g, "");

const RE = new RegExp(`\\b(${TERMS.map((t) => t.replace(/\s+/g, "\\s+")).join("|")})\\b`);

/** true when the text has a word we never allow */
export const hasBannedWord = (text: string) => RE.test(unswap(text));
export const BANNED_MESSAGE = "That has a word we don't allow here. Talk about the food, not the person.";
