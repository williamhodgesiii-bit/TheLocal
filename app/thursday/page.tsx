import type { Metadata } from "next";
import ThursdayView, { weekFacts } from "@/components/ThursdayView";
import { NEWSLETTER } from "@/lib/brand";
import { thursdayOf } from "@/lib/letter";

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { list, date } = await weekFacts(thursdayOf(new Date()));
  const title = `${NEWSLETTER}: this week's 3 Birmingham picks`;
  const description = `This week (${date}): ${list}. Three locally owned places around Birmingham, picked every Thursday: a nice night out, an easy weeknight and a wildcard.`;
  return {
    title,
    description,
    alternates: { canonical: "/thursday" },
    openGraph: { title, description, url: "/thursday", type: "article" },
  };
}

export default function ThursdayPage() {
  return <ThursdayView week={thursdayOf(new Date())} current />;
}
