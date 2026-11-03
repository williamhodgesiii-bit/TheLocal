import type { BadgeFacts } from "./social";

/**
 * The marks next to a name, from most to least telling. Credibility is earned (reviews, photos,
 * Helpful votes from other people) and can never be bought; Verified means staff confirmed who
 * someone is; Patron means they support the site. None of them changes how a review counts.
 */
export type BadgeId = "verified" | "editor" | "owner" | "top" | "trusted" | "regular" | "patron" | "founding";
export type Badge = { id: BadgeId; label: string; title: string };

/** joined before this: a Founding member, for good */
export const FOUNDING_UNTIL = "2027-03-01";
export const TRUSTED = { reviews: 15, helpful: 20 };
export const REGULAR = { reviews: 5 };

export function badgesFor(f: Partial<BadgeFacts> & { role?: "member" | "editor"; owner?: boolean; topRank?: number }): Badge[] {
  const out: Badge[] = [];
  if (f.verified) out.push({ id: "verified", label: "Verified", title: "We confirmed who this is" });
  if (f.role === "editor") out.push({ id: "editor", label: "Local editor", title: "Writes for The Plate Next Door" });
  if (f.owner) out.push({ id: "owner", label: "Owner", title: "Runs a place on the list" });
  if (f.topRank && f.topRank <= 10) out.push({ id: "top", label: `Top reviewer`, title: `#${f.topRank} for useful reviews this month` });
  const reviews = f.reviews ?? 0;
  const helpful = f.helpful ?? 0;
  if (reviews >= TRUSTED.reviews && helpful >= TRUSTED.helpful) out.push({ id: "trusted", label: "Trusted reviewer", title: `${reviews} reviews, ${helpful} found helpful` });
  else if (reviews >= REGULAR.reviews) out.push({ id: "regular", label: "Regular", title: `${reviews} reviews` });
  if (f.patron) out.push({ id: "patron", label: "Patron", title: "Supports The Plate Next Door" });
  if (f.since && f.since < FOUNDING_UNTIL) out.push({ id: "founding", label: "Founding member", title: "Here from the start" });
  return out;
}

/** how close someone is to the next earned mark, for their own page */
export function nextBadge(f: { reviews: number; helpful: number }): string | null {
  if (f.reviews < REGULAR.reviews) return `${REGULAR.reviews - f.reviews} more ${REGULAR.reviews - f.reviews === 1 ? "review" : "reviews"} to Regular`;
  if (f.reviews < TRUSTED.reviews || f.helpful < TRUSTED.helpful) {
    const r = Math.max(0, TRUSTED.reviews - f.reviews);
    const h = Math.max(0, TRUSTED.helpful - f.helpful);
    return `Trusted reviewer at ${TRUSTED.reviews} reviews and ${TRUSTED.helpful} Helpful votes${r || h ? ` (${[r && `${r} more reviews`, h && `${h} more Helpful`].filter(Boolean).join(", ")})` : ""}`;
  }
  return null;
}
