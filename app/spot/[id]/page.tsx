import type { Metadata } from "next";
import Explorer from "@/components/Explorer";
import { GENRE_BY_ID, SPOTS, SPOT_BY_ID, areaLabelOf, type Spot } from "@/lib/data";
import { CITY_BY_ID } from "@/lib/regions";
import { siteUrl } from "@/lib/site";
import { fetchCommunitySpot } from "@/lib/server-spots";

export const dynamicParams = true;
export const revalidate = 3600;

async function resolve(id: string): Promise<Spot | null> {
  return SPOT_BY_ID[id] ?? (await fetchCommunitySpot(id));
}

export function generateStaticParams() {
  return SPOTS.map((s) => ({ id: s.id }));
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const s = await resolve(params.id);
  if (!s) return { title: "Spot", robots: { index: false } };
  const city = CITY_BY_ID[s.city];
  const title = `${s.name} — ${GENRE_BY_ID[s.genres[0]].label} in ${areaLabelOf(s)}, ${city?.name ?? ""}`;
  return {
    title,
    description: `${s.knownFor}. ${s.blurb}`,
    alternates: { canonical: `/spot/${s.id}` },
    openGraph: { title, description: s.blurb, url: `/spot/${s.id}` },
  };
}

export default async function SpotPage({ params }: { params: { id: string } }) {
  const s = await resolve(params.id);
  // Unknown here can still be a demo-mode spot stored in the visitor's browser — let the client resolve it.
  if (!s) return <Explorer initialSpot={params.id} />;
  const city = CITY_BY_ID[s.city];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": s.genres.includes("drinks") && s.genres.length === 1 ? "BarOrPub" : s.genres.includes("coffee") ? "CafeOrCoffeeShop" : "Restaurant",
    name: s.name,
    url: `${siteUrl()}/spot/${s.id}`,
    description: s.blurb,
    priceRange: "$".repeat(s.price),
    servesCuisine: s.genres.map((g) => GENRE_BY_ID[g].label),
    address: { "@type": "PostalAddress", streetAddress: s.address, addressLocality: areaLabelOf(s).includes("Homewood") ? "Homewood" : city?.name ?? "", addressRegion: city?.state ?? "AL", addressCountry: "US" },
    geo: { "@type": "GeoCoordinates", latitude: s.coords[0], longitude: s.coords[1] },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Explorer cityId={s.city} initialSpot={s.id} initialSpotData={SPOT_BY_ID[s.id] ? undefined : s} />
    </>
  );
}
