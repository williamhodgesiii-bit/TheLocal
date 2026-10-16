import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GuideView from "@/components/GuideView";
import { spotImage } from "@/lib/seo";
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
  const img = spotImage(g.spots()[0]);
  return {
    title: g.metaTitle,
    description: g.metaDescription,
    alternates: { canonical: url },
    openGraph: { title: g.metaTitle, description: g.metaDescription, url, type: "article", ...(img ? { images: [img] } : {}) },
  };
}

export default function BestGuidePage({ params }: { params: { slug: string } }) {
  const g = BEST_BY_SLUG[params.slug];
  if (!g || !publishable(g)) notFound();
  return <GuideView guide={g} />;
}
