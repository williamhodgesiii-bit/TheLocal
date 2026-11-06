import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GuideView from "@/components/GuideView";
import { BEST_BY_SLUG, bestParams, hrefOf, publishable } from "@/lib/guides";

export const dynamicParams = false;
export const revalidate = 86400;

export function generateStaticParams() {
  return bestParams();
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const g = BEST_BY_SLUG[params.slug];
  if (!g) return {};
  const url = hrefOf(g);
  return {
    title: g.metaTitle,
    description: g.metaDescription,
    alternates: { canonical: url },
    openGraph: { title: g.title, description: g.metaDescription, url, type: "article" },
  };
}

export default function BestGuidePage({ params }: { params: { slug: string } }) {
  const g = BEST_BY_SLUG[params.slug];
  if (!g || !publishable(g)) notFound();
  return <GuideView guide={g} />;
}
