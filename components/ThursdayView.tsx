import Link from "next/link";
import { Logo } from "@/components/Brand";
import JsonLd from "@/components/JsonLd";
import { BRAND, NEWSLETTER } from "@/lib/brand";
import { SPOTS, areaLabelOf, GENRE_BY_ID, type Spot } from "@/lib/data";
import { honorsOf } from "@/lib/honors";
import { SLOTS, letterFor, weekLabel } from "@/lib/letter";
import { letterRow, ratings } from "@/lib/live";
import { articleLd, abs, breadcrumbLd, getThe, itemListLd } from "@/lib/seo";
import { letterWeeks } from "@/lib/weeks";

/** the headline for a week: its three places, by name (what people actually search for) */
export async function weekFacts(week: string) {
  const letter = letterFor(week, SPOTS, await letterRow(week));
  const picks = SLOTS.flatMap((slot) => (letter.picks[slot.id] ? [{ slot, spot: letter.picks[slot.id]! }] : []));
  const names = picks.map((p) => p.spot.name);
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0] ?? "";
  const date = weekLabel(week, { month: "long", day: "numeric", year: "numeric" });
  return { letter, picks, names, list, date };
}

/**
 * The Thursday Plate on the web: this week's three (one nice night out, one easy weeknight, one
 * wildcard), each with why, and every past week at its own address. It's the site's freshest page:
 * new every Thursday, dated, and linked from the sitemap and the feed.
 */
export default async function ThursdayView({ week, current }: { week: string; current: boolean }) {
  const [{ letter, picks, list, date }, rated] = await Promise.all([weekFacts(week), ratings()]);
  const path = current ? "/thursday" : `/thursday/${week}`;
  const weeks = letterWeeks();
  const headline = current ? `This week's three: ${list}` : `${NEWSLETTER}, ${date}: ${list}`;
  const lede =
    letter.intro ||
    `Every Thursday we pick three locally owned places around Birmingham: one for a nice night out, one easy weeknight, and one wildcard you might not have tried. ${current ? "Here's this week's." : `These were the picks for ${date}.`}`;
  const crumbs = [
    { name: "Home", path: "/" },
    { name: NEWSLETTER, path: "/thursday" },
    ...(current ? [] : [{ name: date, path }]),
  ];
  const spots = picks.map((p) => p.spot) as Spot[];
  const jsonLd = [
    articleLd({
      headline,
      description: lede,
      path,
      published: `${week}T07:00:00-05:00`,
      image: abs(current ? `/thursday/opengraph-image/week-${week}` : `${path}/opengraph-image/week`),
      about: spots,
    }),
    itemListLd(spots, { name: headline, description: lede, path }),
    breadcrumbLd(crumbs),
  ];

  return (
    <main className="guide thursday">
      <JsonLd data={jsonLd} />
      <header className="partners-top">
        <Link href="/" className="textbtn">
          ← Back
        </Link>
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

      <p className="cap-kicker">
        {NEWSLETTER} · <time dateTime={week}>{date}</time>
      </p>
      <h1 className="guide-h1">{headline}</h1>
      <p className="guide-lede">{lede}</p>

      <ol className="guide-list">
        {picks.map(({ slot, spot: s }, i) => {
          const honors = honorsOf(s.id);
          const r = rated[s.id];
          const note = letter.notes[slot.id];
          return (
            <li key={slot.id} className="guide-item">
              <span className="guide-rank" aria-hidden>
                {i + 1}
              </span>
              <div className="guide-item-body">
                <p className="th-slot">{slot.label}</p>
                <h2 className="guide-item-name">
                  <Link href={`/spot/${s.id}`}>{s.name}</Link>
                </h2>
                <p className="guide-item-meta">
                  {areaLabelOf(s)} · {"$".repeat(s.price)} · {s.genres.map((g) => GENRE_BY_ID[g]?.label).filter(Boolean).slice(0, 3).join(", ")}
                  {r && r.count > 0 ? ` · ★ ${r.avg.toFixed(1)} from ${r.count} local review${r.count === 1 ? "" : "s"}` : ""}
                </p>
                <p className="guide-item-known">
                  <b>{getThe(s.knownFor)}.</b> {s.blurb}
                </p>
                {note && <blockquote className="th-note">{note}</blockquote>}
                {honors.length > 0 && (
                  <p className="guide-badges">
                    {honors.slice(0, 2).map((h, k) => (
                      <span key={k} className="guide-badge">
                        {h.label}
                        {h.who ? ` · ${h.who}` : ""}
                      </span>
                    ))}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <section className="th-cta" aria-label={`Get ${NEWSLETTER}`}>
        <p>
          <b>Get it every Thursday.</b> Three places in your inbox, before the weekend. Free, and one click to stop.
        </p>
        <Link href="/#letter-signup" className="btn btn-ink">
          Sign up
        </Link>
      </section>

      {weeks.length > 1 && (
        <section className="guide-related" aria-label="Past weeks">
          <h2 className="menu-head">
            <span>Past weeks</span>
          </h2>
          <ul className="th-weeks">
            {weeks
              .filter((w) => w !== week)
              .slice(0, 12)
              .map((w) => (
                <li key={w}>
                  <Link href={`/thursday/${w}`}>{weekLabel(w, { month: "long", day: "numeric", year: "numeric" })}</Link>
                </li>
              ))}
          </ul>
        </section>
      )}

      <footer className="guide-foot">
        <Link href="/best">Birmingham guides</Link>
        <span> · </span>
        <Link href="/neighborhood">Neighborhoods</Link>
        <span> · </span>
        <Link href="/feed.xml">RSS</Link>
        <span> · </span>
        <Link href="/">The map</Link>
      </footer>
    </main>
  );
}
