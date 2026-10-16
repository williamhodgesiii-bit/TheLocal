import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Brand";
import JsonLd from "@/components/JsonLd";
import { BRAND } from "@/lib/brand";
import { PLACE_GUIDES, hrefOf, type Guide, publishable } from "@/lib/guides";
import { abs, breadcrumbLd } from "@/lib/seo";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Birmingham neighborhoods — where to eat",
  description: `Where to eat and drink in every Birmingham neighborhood — Avondale, Downtown, Five Points South, Lakeview, Homewood, Mountain Brook and Vestavia Hills. Locally owned, hand-picked by ${BRAND}.`,
  alternates: { canonical: "/neighborhood" },
  openGraph: { title: `Birmingham neighborhoods · ${BRAND}`, url: "/neighborhood", type: "website" },
};

function GuideLinks({ list }: { list: Guide[] }) {
  return (
    <ul className="hub-list">
      {list.map((g) => (
        <li key={g.slug}>
          <Link href={hrefOf(g)}>{g.label}</Link>
          <span className="hub-count"> {g.spots().length}</span>
        </li>
      ))}
    </ul>
  );
}

export default function NeighborhoodHub() {
  const towns = PLACE_GUIDES.filter((g) => g.kind === "town" && publishable(g));
  const hoods = PLACE_GUIDES.filter((g) => g.kind === "neighborhood" && publishable(g));
  const jsonLd = [
    breadcrumbLd([{ name: "Home", path: "/" }, { name: "Neighborhoods", path: "/neighborhood" }]),
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Birmingham neighborhoods — where to eat",
      url: abs("/neighborhood"),
      hasPart: [...towns, ...hoods].map((g) => ({ "@type": "SiteNavigationElement", name: g.title, url: abs(hrefOf(g)) })),
    },
  ];
  return (
    <main className="guide hub">
      <JsonLd data={jsonLd} />
      <header className="partners-top">
        <Link href="/" className="textbtn">← Back to the map</Link>
        <Link href="/" className="brand" aria-label={`${BRAND}, home`}>
          <Logo size={36} />
        </Link>
      </header>

      <p className="cap-kicker">Birmingham neighborhoods</p>
      <h1 className="guide-h1">Where to eat, neighborhood by neighborhood</h1>
      <p className="guide-lede">
        Birmingham is a city of neighborhoods, and every one eats a little differently. Here's where locals go in each — over the mountain in Homewood, Mountain Brook and Vestavia Hills, and across the city from Avondale to Five Points South.
      </p>

      {towns.length > 0 && (
        <>
          <h2 className="menu-head"><span>Towns</span></h2>
          <GuideLinks list={towns} />
        </>
      )}

      <h2 className="menu-head"><span>Neighborhoods</span></h2>
      <GuideLinks list={hoods} />

      <footer className="guide-foot">
        <Link href="/best">Browse by cuisine &amp; occasion</Link>
        <span> · </span>
        <Link href="/about">How we pick</Link>
        <span> · </span>
        <Link href="/">The map</Link>
      </footer>
    </main>
  );
}
