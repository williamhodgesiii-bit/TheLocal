import type { Metadata } from "next";
import Explorer from "@/components/Explorer";
import JsonLd from "@/components/JsonLd";
import { weekFacts } from "@/components/ThursdayView";
import { BRAND, NEWSLETTER } from "@/lib/brand";
import { SPOTS } from "@/lib/data";
import { thursdayOf } from "@/lib/letter";
import { itemListLd } from "@/lib/seo";

// the front page changes every Thursday (the week's three) and as members post: rebuilt hourly
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { list } = await weekFacts(thursdayOf(new Date()));
  const title = `${BRAND}: Birmingham's locally owned restaurants, rated by locals`;
  const description = `${SPOTS.length} locally owned restaurants, coffee shops and bars around Birmingham, reviewed by neighbors. No chains, nobody pays to rank. ${NEWSLETTER} this week: ${list}.`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: "/" },
    openGraph: { title: "Skip the chains. Eat next door.", description, url: "/", type: "website" },
    twitter: { title: "Skip the chains. Eat next door.", description },
  };
}

export default async function Home() {
  const { picks, list } = await weekFacts(thursdayOf(new Date()));
  return (
    <>
      <JsonLd data={[itemListLd(picks.map((p) => p.spot), { name: `${NEWSLETTER}: this week's three`, description: list, path: "/thursday" })]} />
      <Explorer />
    </>
  );
}
