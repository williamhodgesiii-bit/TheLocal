/**
 * What's sold, in one place (README → Monetization, docs/STRATEGY.md). Every paid thing is
 * labeled Sponsored or "Presented by" right next to it, never changes a ranking, a review or
 * Surprise me, and the team turns each one on here.
 */

/** "The Thursday Plate, presented by …": one sponsor a month (a bank, a market, a local brand) */
export type ThursdaySponsor = { name: string; url: string; line?: string; until: string };
export const THURSDAY_SPONSOR = null as ThursdaySponsor | null;

/**
 * Featured posts: one restaurant's own post in the For you feed, labeled Sponsored, at most one
 * in every feed and never in Friends. Write the copy with them; a real photo is required.
 */
export type FeaturedPost = {
  spotId: string;
  /** a line in the restaurant's own voice ("Oyster happy hour is back, Tue–Thu 4 to 6") */
  headline: string;
  body?: string;
  /** a photo the restaurant supplied (public/photos/…) */
  photo: string;
  /** "Book a table", "See the menu"… */
  cta?: { label: string; url: string };
  from: string;
  until: string;
};
export const FEATURED = [] as FeaturedPost[];

const live = (from: string | undefined, until: string, now: Date) => (!from || new Date(from) <= now) && now <= new Date(`${until}T23:59:59`);
export function thursdaySponsor(now = new Date()): ThursdaySponsor | null {
  const s = THURSDAY_SPONSOR;
  return s && live(undefined, s.until, now) ? s : null;
}
/** this week's featured post, if one is running (they rotate by day when there are several) */
export function featuredPost(now = new Date()) {
  const on = FEATURED.filter((f) => live(f.from, f.until, now));
  return on.length ? on[now.getDate() % on.length] : null;
}
