import type { Spot } from "./data";

/** Server-side read of a verified community spot (for SEO pages). Needs Supabase configured. */
export async function fetchCommunitySpot(id: string): Promise<Spot | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !/^[a-z0-9-]{3,64}$/.test(id)) return null;
  try {
    const r = await fetch(`${url}/rest/v1/spots?id=eq.${id}&status=eq.live&select=*`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 3600 },
    });
    const [row] = (await r.json()) as any[];
    if (!row) return null;
    return {
      id: row.id, city: row.city_id, name: row.name, genres: row.genres, drinks: row.drinks?.length ? row.drinks : undefined, area: row.area,
      areaLabel: row.area_label ?? undefined, address: row.address, coords: [row.lat, row.lng], price: row.price, knownFor: row.known_for,
      blurb: row.blurb, tags: row.tags ?? [], pop: row.pop ?? 60, sponsored: row.sponsored, website: row.website ?? undefined,
      phone: row.phone ?? undefined, addedBy: row.added_by ?? undefined, verifiedAt: row.verified_at ?? undefined,
    };
  } catch {
    return null;
  }
}

export async function fetchCommunitySpotIds(): Promise<string[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  try {
    const r = await fetch(`${url}/rest/v1/spots?status=eq.live&select=id`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, next: { revalidate: 3600 } });
    return ((await r.json()) as { id: string }[]).map((x) => x.id);
  } catch {
    return [];
  }
}
