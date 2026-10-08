import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Explorer from "@/components/Explorer";
import { AREA_BY_ID, GENRE_BY_ID, SPOTS, SPOT_BY_ID } from "@/lib/data";
import { siteUrl } from "@/lib/site";

export function generateStaticParams() {
  return SPOTS.map((s) => ({ id: s.id }));
}

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const s = SPOT_BY_ID[params.id];
  if (!s) return {};
  const title = `${s.name} — ${GENRE_BY_ID[s.genres[0]].label} in ${AREA_BY_ID[s.area].label}`;
  return {
    title,
    description: `${s.knownFor}. ${s.blurb}`,
    alternates: { canonical: `/spot/${s.id}` },
    openGraph: { title, description: s.blurb, url: `/spot/${s.id}` },
  };
}

export default function SpotPage({ params }: { params: { id: string } }) {
  const s = SPOT_BY_ID[params.id];
  if (!s) notFound();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": s.genres.includes("drinks") && s.genres.length === 1 ? "BarOrPub" : s.genres.includes("coffee") ? "CafeOrCoffeeShop" : "Restaurant",
    name: s.name,
    url: `${siteUrl()}/spot/${s.id}`,
    description: s.blurb,
    priceRange: "$".repeat(s.price),
    servesCuisine: s.genres.map((g) => GENRE_BY_ID[g].label),
    address: { "@type": "PostalAddress", streetAddress: s.address, addressLocality: AREA_BY_ID[s.area].label.includes("Homewood") ? "Homewood" : "Birmingham", addressRegion: "AL", addressCountry: "US" },
    geo: { "@type": "GeoCoordinates", latitude: s.coords[0], longitude: s.coords[1] },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Explorer initialSpot={s.id} />
    </>
  );
}
