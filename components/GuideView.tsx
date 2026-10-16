import Link from "next/link";
import { Logo } from "@/components/Brand";
import JsonLd from "@/components/JsonLd";
import { BRAND, CHECKED } from "@/lib/brand";
import { areaLabelOf, GENRE_BY_ID } from "@/lib/data";
import { honorsOf } from "@/lib/honors";
import { type Guide, guideFaqs, guideIntro, hrefOf, relatedGuides } from "@/lib/guides";
import { breadcrumbLd, collectionPageLd, faqLd, itemListLd } from "@/lib/seo";

export default function GuideView({ guide }: { guide: Guide }) {
  const spots = guide.spots();
  const href = hrefOf(guide);
  const isPlace = guide.kind === "neighborhood" || guide.kind === "town";
  const hub = isPlace ? { name: "Neighborhoods", path: "/neighborhood" } : { name: "Guides", path: "/best" };
  const crumbs = [
    { name: "Home", path: "/" },
    hub,
    { name: guide.label, path: href },
  ];
  const faqs = guideFaqs(guide);
  const related = relatedGuides(guide);

  const jsonLd = [
    collectionPageLd({ name: guide.title, description: guide.metaDescription, path: href }),
    itemListLd(spots, { name: guide.title, description: guide.metaDescription, path: href }),
    breadcrumbLd(crumbs),
    ...(faqs.length ? [faqLd(faqs)] : []),
  ];

  return (
    <main className="guide">
      <JsonLd data={jsonLd} />

      <header className="partners-top">
        <Link href="/" className="textbtn">← Back to the map</Link>
        <Link href="/" className="brand" aria-label={`${BRAND}, home`}>
          <Logo size={36} />
        </Link>
      </header>

      <nav className="guide-crumbs" aria-label="Breadcrumb">
        {crumbs.map((c, i) => (
          <span key={c.path}>
            {i > 0 && <span className="guide-crumb-sep"> / </span>}
            {i < crumbs.length - 1 ? <Link href={c.path}>{c.name}</Link> : <span aria-current="page">{c.name}</span>}
          </span>
        ))}
      </nav>

      <p className="cap-kicker">{isPlace ? "Neighborhood guide" : "Birmingham guide"}</p>
      <h1 className="guide-h1">{guide.title}</h1>
      <p className="guide-lede">{guideIntro(guide)}</p>
      <p className="guide-meta">
        {spots.length} places · ranked by how well-loved they are · last checked {CHECKED} ·{" "}
        <Link href="/" className="guide-maplink">See them on the map →</Link>
      </p>

      <ol className="guide-list">
        {spots.map((s, i) => {
          const honors = honorsOf(s.id);
          const cuisines = s.genres.map((g) => GENRE_BY_ID[g]?.label).filter(Boolean).slice(0, 3);
          return (
            <li key={s.id} className="guide-item">
              <span className="guide-rank" aria-hidden>{i + 1}</span>
              <div className="guide-item-body">
                <h2 className="guide-item-name">
                  <Link href={`/spot/${s.id}`}>{s.name}</Link>
                </h2>
                <p className="guide-item-meta">
                  {areaLabelOf(s)} · {"$".repeat(s.price)} · {cuisines.join(", ")}
                </p>
                <p className="guide-item-known">{s.knownFor}. {s.blurb}</p>
                {honors.length > 0 && (
                  <p className="guide-badges">
                    {honors.slice(0, 3).map((h, k) => (
                      <span key={k} className="guide-badge">{h.label}{h.who ? ` · ${h.who}` : ""}</span>
                    ))}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {faqs.length > 0 && (
        <section className="guide-faq" aria-label="Frequently asked questions">
          <h2 className="menu-head"><span>Good to know</span></h2>
          {faqs.map((f, i) => (
            <div key={i} className="guide-qa">
              <h3 className="guide-q">{f.q}</h3>
              <p className="guide-a">{f.a}</p>
            </div>
          ))}
        </section>
      )}

      {related.length > 0 && (
        <section className="guide-related" aria-label="More guides">
          <h2 className="menu-head"><span>Keep exploring</span></h2>
          <div className="guide-pills">
            {related.map((r) => (
              <Link key={r.slug} href={hrefOf(r)} className="guide-pill">{r.label}</Link>
            ))}
          </div>
        </section>
      )}

      <footer className="guide-foot">
        <Link href="/best">All Birmingham guides</Link>
        <span> · </span>
        <Link href="/neighborhood">Neighborhoods</Link>
        <span> · </span>
        <Link href="/about">How we pick</Link>
        <span> · </span>
        <Link href="/">The map</Link>
      </footer>
    </main>
  );
}
