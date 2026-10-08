import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Explorer from "@/components/Explorer";
import { CITIES, findCity, stateName } from "@/lib/regions";

export function generateStaticParams() {
  return CITIES.map((c) => ({ state: c.state.toLowerCase(), city: c.slug }));
}

export function generateMetadata({ params }: { params: { state: string; city: string } }): Metadata {
  const c = findCity(params.state, params.city);
  if (!c) return {};
  const title = `${c.name}, ${stateName(c.state)} — independent restaurants, coffee & bars`;
  return {
    title,
    description: `The independent food & drink map of ${c.name}. No chains, no fast food — every spot added by locals and verified by The Local.`,
    alternates: { canonical: `/${params.state}/${params.city}` },
    openGraph: { title, url: `/${params.state}/${params.city}` },
  };
}

export default function CityPage({ params }: { params: { state: string; city: string } }) {
  const c = findCity(params.state, params.city);
  if (!c) notFound();
  return <Explorer cityId={c.id} />;
}
