import type { GenreId, Spot } from "./data";

/**
 * Representative (not venue-specific) photography by genre, served from Unsplash's CDN.
 * Real storefront & dish photos come from the community (uploads) and, when a
 * GOOGLE_PLACES_API_KEY is configured, from Google Places.
 */
const U = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1100&q=70`;

const BY_GENRE: Record<GenreId, string[]> = {
  southern: ["1504674900247-0877df9cc836", "1467003909585-2f8a72700288", "1546069901-ba9599a7e63c"],
  bbq: ["1544025162-d76694265947", "1555939594-58d7cb561ad1", "1529193591184-b1d58069ecdd"],
  italian: ["1565299624946-b28f40a0ae38", "1513104890138-7c749659a591", "1551183053-bf91a1d81141"],
  seafood: ["1519708227418-c8fd9a32b7a2", "1467003909585-2f8a72700288", "1414235077428-338989a2e8c0"],
  latin: ["1551504734-5ee1c4a1479b", "1565299585323-38d6b0865b47", "1504674900247-0877df9cc836"],
  asian: ["1579584425555-c3ce17fd4351", "1553621042-f6e147245754", "1565557623262-b51c2513a641"],
  mediterranean: ["1540189549336-e6e99c3679fe", "1546069901-ba9599a7e63c", "1504674900247-0877df9cc836"],
  chefs: ["1414235077428-338989a2e8c0", "1600891964092-4316c288032e", "1517248135467-4c7edcad34c4"],
  brunch: ["1533089860892-a7c6f0a88666", "1484723091739-30a097e8f929", "1555507036-ab1f4038808a"],
  coffee: ["1495474472287-4d71bcdd2085", "1509042239860-f550ce710b93", "1501339847302-ac426a4a7cbb"],
  sweets: ["1563805042-7684c019e1cb", "1497034825429-c343d7c6a68f", "1509440159596-0249088772ff"],
  drinks: ["1470337458703-46ad1756a187", "1514362545857-3bc16c4c7d1b", "1514933651103-005eec06c04b"],
};

export function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function representativePhotos(spot: Spot, n = 2): string[] {
  const g = spot.genres[0];
  const pool = BY_GENRE[g];
  const start = hash(spot.id) % pool.length;
  return Array.from({ length: Math.min(n, pool.length) }, (_, i) => U(pool[(start + i) % pool.length]));
}
