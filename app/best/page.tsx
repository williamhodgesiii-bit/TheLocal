import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Brand";
import JsonLd from "@/components/JsonLd";
import { BRAND } from "@/lib/brand";
import { BEST_GUIDES, hrefOf, type Guide, publishable } from "@/lib/guides";
import { abs, breadcrumbLd } from "@/lib/seo";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Birmingham restaurant guides",
  description: `Every ${BRAND} guide to Birmingham — the best by cuisine (barbecue, seafood, pizza, Italian, Southern) and by occasion (date night, brunch, cocktails, patios). Locally owned, hand-picked, no chains.`,
  alternates: { canonical: "/best" },
  openGraph: { title: `Birmingham restaurant guides · ${BRAND}`, url: "/best", type: "website" },
};

function GuideLinks({ list }: { list: Guide[] }) {
  return (
    <ul className="hub-list">
      {list.map((g) => (
        <li key={g.slug}>
          <Link href={hrefOf(g)}>{g.title.replace(/^The best /, "Best ")}</Link>
          <span className="hub-count"> {g.spots().length}</span>
        </li>
      ))}
    </ul>
  );
}

export default function BestHub() {
  const cuisines = BEST_GUIDES.filter((g) => g.kind === "cuisine" && publishable(g));
  const occasions = BEST_GUIDES.filter((g) => g.kind === "occasion" && publishable(g));
  const jsonLd = [
    breadcrumbLd([{ name: "Home", path: "/" }, { name: "Guides", path: "/best" }]),
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Birmingham restaurant guides",
      url: abs("/best"),
      hasPart: [...cuisines, ...occasions].map((g) => ({ "@type": "SiteNavigationElement", name: g.title, url: abs(hrefOf(g)) })),
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

      <p className="cap-kicker">Birmingham guides</p>
      <h1 className="guide-h1">Where to eat in Birmingham</h1>
      <p className="guide-lede">
        Hand-picked guides to the best locally owned restaurants, coffee shops and bars around Birmingham — by what you're craving and by the kind of night it is. No chains, nobody pays to rank.
      </p>

      <h2 className="menu-head"><span>By cuisine</span></h2>
      <GuideLinks list={cuisines} />

      <h2 className="menu-head"><span>By occasion</span></h2>
      <GuideLinks list={occasions} />

      <footer className="guide-foot">
        <Link href="/neighborhood">Browse by neighborhood</Link>
        <span> · </span>
        <Link href="/about">How we pick</Link>
        <span> · </span>
        <Link href="/">The map</Link>
      </footer>
    </main>
  );
}
