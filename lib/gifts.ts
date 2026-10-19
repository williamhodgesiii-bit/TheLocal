import type { Spot } from "./data";

/**
 * Gift cards: we only ever send people to the place's own gift card page. The restaurant sells
 * the card and keeps all of the money; we never take payment, hold a balance or see a card.
 * (Selling cards ourselves would make us a money transmitter in Alabama. README → Gift cards.)
 *
 * A place is listed here only when its own website links to the page, or we opened the seller's
 * page and it named the place. Checked October 2026; re-check every few months.
 */
export type GiftVia = "Toast" | "Square" | "Instagift" | "their website";
export type Gift = {
  url: string;
  via: GiftVia;
  /** "egift": sent by email or text; "mailed": a plastic card in the mail */
  kind: "egift" | "mailed" | "either";
  /** which locations it covers, when the place has more than one */
  note?: string;
  checked: string;
};

export const GIFTS: Record<string, Gift> = {
  "big-spoon": { url: "https://squareup.com/gift/0EQD93SYF9VYR/order", via: "Square", kind: "egift", checked: "2026-10" },
  "brick-and-tin": {
    url: "https://www.toasttab.com/b&tdowntown/giftcards",
    via: "Toast",
    kind: "egift",
    note: "This is the downtown card. Each Brick & Tin sells its own.",
    checked: "2026-10",
  },
  "charbar-no-7": { url: "https://charbar7.com/gift-cards", via: "their website", kind: "mailed", note: "Plastic cards by mail, good at any CharBar No. 7.", checked: "2026-10" },
  "current-charcoal": { url: "https://www.toasttab.com/current-charcoal-grill/giftcards", via: "Toast", kind: "egift", checked: "2026-10" },
  "fish-market": { url: "https://thefishmarketdowntown.instagift.com/", via: "Instagift", kind: "egift", checked: "2026-10" },
  ovenbird: { url: "https://www.ovenbirdrestaurant.com/store", via: "their website", kind: "either", checked: "2026-10" },
  paramount: {
    url: "https://www.toasttab.com/paramount-birmingham-200-20th-st-n/giftcards",
    via: "Toast",
    kind: "egift",
    note: "This is the downtown card. Homewood sells its own.",
    checked: "2026-10",
  },
  "red-cat": { url: "https://squareup.com/gift/VAG8Y10T2KX29/order", via: "Square", kind: "egift", checked: "2026-10" },
  rojo: { url: "https://rojo.instagift.com/", via: "Instagift", kind: "egift", checked: "2026-10" },
  "slice-pizza": { url: "https://www.toasttab.com/slicebirmingham-lakeview/giftcards", via: "Toast", kind: "egift", note: "This is the Lakeview card.", checked: "2026-10" },
  "surin-west": { url: "https://surinofthailand.com/gift-cards/", via: "their website", kind: "either", note: "Surin of Thailand's card.", checked: "2026-10" },
  "yo-mamas": { url: "https://squareup.com/gift/0CB4VEJKT2DQR/order", via: "Square", kind: "egift", checked: "2026-10" },
  "back-forty": { url: "https://squareup.com/gift/6C9MA0MG52AJN/order", via: "Square", kind: "egift", checked: "2026-10" },
};

export const giftFor = (spot: Pick<Spot, "id">): Gift | undefined => GIFTS[spot.id];
/** through our own link, so we can count how many gift buyers we send each place */
export const giftHref = (spotId: string, surface: string) => `/go/gift/${encodeURIComponent(spotId)}?from=${encodeURIComponent(surface)}`;
export const soldBy = (spot: Pick<Spot, "name">, g: Gift) =>
  g.via === "their website" ? `Sold by ${spot.name} on their website` : `Sold by ${spot.name} through ${g.via}`;

