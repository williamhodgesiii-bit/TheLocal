import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Explorer from "@/components/Explorer";
import JsonLd from "@/components/JsonLd";
import { OPEN_CITIES, cityPath, findCity, stateName, type City } from "@/lib/regions";
import { SPOTS } from "@/lib/data";
import { BRAND, MANTRA } from "@/lib/brand";
import { breadcrumbLd, collectionPageLd, itemListLd, spotImage } from "@/lib/seo";

export function generateStaticParams() {
  return OPEN_CITIES.map((c) => ({ state: c.state.toLowerCase(), city: c.slug }));
}

const spotsIn = (c: City) => SPOTS.filter((s) => s.city === c.id).sort((a, b) => b.pop - a.pop);

export function generateMetadata({ params }: { params: { state: string; city: string } }): Metadata {
  const c = findCity(params.state, params.city);
  if (!c) return {};
  const canonical = cityPath(c);
  const title = `${c.name}, ${stateName(c.state)} restaurants, coffee & bars`;
  const img = spotImage(spotsIn(c)[0]);
  return {
    title,
    description: `${MANTRA} Locally owned restaurants, coffee shops and bars in ${c.name}, added by people who live there and checked by ${BRAND}.`,
    alternates: { canonical },
    openGraph: { title, url: canonical, type: "website", ...(img ? { images: [img] } : {}) },
  };
}

export default function CityPage({ params }: { params: { state: string; city: string } }) {
  const c = findCity(params.state, params.city);
  if (!c) notFound();
  const canonical = cityPath(c);
  const all = spotsIn(c);
  const name = `Locally owned restaurants, coffee & bars in ${c.name}`;
  const description = `${all.length} hand-picked, locally owned places to eat and drink in ${c.name}, ${stateName(c.state)}.`;
  const jsonLd = [
    collectionPageLd({ name, description, path: canonical }),
    itemListLd(all.slice(0, 50), { name, description, path: canonical }),
    breadcrumbLd([{ name: "Home", path: "/" }, { name: c.name, path: canonical }]),
  ];
  return (
    <>
      <JsonLd data={jsonLd} />
      <Explorer cityId={c.id} />
    </>
  );
}
