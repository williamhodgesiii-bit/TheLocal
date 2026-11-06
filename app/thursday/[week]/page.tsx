import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import ThursdayView, { weekFacts } from "@/components/ThursdayView";
import { NEWSLETTER } from "@/lib/brand";
import { thursdayOf } from "@/lib/letter";
import { isLetterWeek, letterWeeks } from "@/lib/weeks";

export const revalidate = 86400;
export const dynamicParams = true;

export function generateStaticParams() {
  return letterWeeks().map((week) => ({ week }));
}

export async function generateMetadata({ params }: { params: { week: string } }): Promise<Metadata> {
  if (!isLetterWeek(params.week)) return { robots: { index: false } };
  const { list, date } = await weekFacts(params.week);
  const title = `${NEWSLETTER}, ${date}`;
  const description = `${list}: the three locally owned Birmingham places we picked for the week of ${date}.`;
  return {
    title,
    description,
    alternates: { canonical: `/thursday/${params.week}` },
    openGraph: { title, description, url: `/thursday/${params.week}`, type: "article" },
  };
}

export default function ThursdayWeekPage({ params }: { params: { week: string } }) {
  if (!isLetterWeek(params.week)) notFound();
  // this week's lives at /thursday until next Thursday
  if (params.week === thursdayOf(new Date())) redirect("/thursday");
  return <ThursdayView week={params.week} current={false} />;
}
