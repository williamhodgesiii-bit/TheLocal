import type { Metadata } from "next";
import Explorer from "@/components/Explorer";
import JsonLd from "@/components/JsonLd";
import { GENRE_BY_ID, SPOTS, SPOT_BY_ID, areaLabelOf, type Spot } from "@/lib/data";
import { CITY_BY_ID, cityPath } from "@/lib/regions";
import { fetchCommunitySpot } from "@/lib/server-spots";
import { breadcrumbLd, spotImage, spotLd } from "@/lib/seo";

export const dynamicParams = true;
export const revalidate = 3600;

async function resolve(id: string): Promise<Spot | null> {
  return SPOT_BY_ID[id] ?? (await fetchCommunitySpot(id));
}

export function generateStaticParams() {
  return SPOTS.map((s) => ({ id: s.id }));
}

function crumbsFor(s: Spot) {
  const city = CITY_BY_ID[s.city];
  const items = [{ name: "Home", path: "/" }];
  if (city && cityPath(city) !== "/") items.push({ name: city.name, path: cityPath(city) });
  items.push({ name: s.name, path: `/spot/${s.id}` });
  return items;
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const s = await resolve(params.id);
  if (!s) return { title: "Spot", robots: { index: false } };
  const city = CITY_BY_ID[s.city];
  const title = `${s.name}, ${GENRE_BY_ID[s.genres[0]]?.label.toLowerCase() ?? "restaurant"} in ${areaLabelOf(s)}, ${city?.name ?? "Birmingham"}`;
  const img = spotImage(s);
  return {
    title,
    description: `${s.knownFor}. ${s.blurb}`,
    alternates: { canonical: `/spot/${s.id}` },
    openGraph: { title, description: s.blurb, url: `/spot/${s.id}`, type: "article", ...(img ? { images: [img] } : {}) },
  };
}

export default async function SpotPage({ params }: { params: { id: string } }) {
  const s = await resolve(params.id);
  // Unknown here can still be a demo-mode spot stored in the visitor's browser — let the client resolve it.
  if (!s) return <Explorer initialSpot={params.id} />;
  return (
    <>
      <JsonLd data={[spotLd(s), breadcrumbLd(crumbsFor(s))]} />
      <Explorer cityId={s.city} initialSpot={s.id} initialSpotData={SPOT_BY_ID[s.id] ? undefined : s} />
    </>
  );
}
