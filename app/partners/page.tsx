import type { Metadata } from "next";
import Link from "next/link";
import PartnerForm from "@/components/PartnerForm";
import { Logo } from "@/components/Brand";
import { BRAND, NEWSLETTER } from "@/lib/brand";

export const metadata: Metadata = {
  title: "For restaurants",
  description: `Every locally owned place gets a free listing on ${BRAND}. Optional extras for owners; nobody can pay to rank.`,
};

const TIERS = [
  {
    id: "neighbor",
    name: "Listing",
    price: "Free",
    per: "always",
    pitch: "Every locally owned place gets one.",
    perks: ["Your page: photos, what to order, directions", "Claim it and correct your details", "Answer reviews", "An owner mark on your page"],
  },
  {
    id: "regular",
    name: "Partner",
    price: "$39",
    per: "a month, or $390 a year",
    pitch: "Look your best, and see what it's doing for you.",
    perks: ["Everything in Listing", "Pick your cover photo and order your gallery", 'Post specials and events, marked "From the owner"', "A monthly report: views, saves, stamps and directions", "Your place in the list stays exactly where it was"],
  },
  {
    id: "institution",
    name: "Sponsored spot",
    price: "$99",
    per: "a month",
    pitch: "Be the first card people see in your kind of food or your neighborhood.",
    perks: ["Everything in Partner", 'One card, labeled "Sponsored" everywhere it shows', "At most one per kind of food and one per neighborhood", "Never in awards, rankings or Surprise me"],
  },
];

export default function Partners({ searchParams }: { searchParams: { spot?: string } }) {
  return (
    <main className="partners">
      <header className="partners-top">
        <Link href="/" className="textbtn">
          ← Back to the map
        </Link>
        <Link href="/" className="brand" aria-label={`${BRAND}, home`}>
          <Logo size={36} />
        </Link>
      </header>

      <section className="partners-hero">
        <p className="cap-kicker">For restaurants, bars and coffee shops</p>
        <h1>Be the plate next door.</h1>
        <p>
          Your neighbors are deciding where to eat tonight. {BRAND} only lists places that are locally owned: no chains, no fast food. Your listing is free,
          and where you show up is never for sale. That&apos;s why people trust the list, and why being on it is worth something.
        </p>
      </section>

      <section className="rates">
        <h2 className="menu-head">
          <span>Rates</span>
        </h2>
        <div className="rate-grid">
          {TIERS.map((t) => (
            <article key={t.id} className="rate">
              <h3>{t.name}</h3>
              <p className="rate-price">
                <strong>{t.price}</strong> {t.per}
              </p>
              <p className="rate-pitch">{t.pitch}</p>
              <ul>
                {t.perks.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <a href="#contact" className="btn btn-line btn-block">
                {t.price === "Free" ? "Claim my listing" : `Ask about ${t.name}`}
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="principles">
        <div>
          <h3 className="small-head">What we promise diners (and you)</h3>
          <p>
            Nobody pays to rank. Anything paid is marked <span className="paid">Sponsored</span> right next to it. Owners can&apos;t buy, edit or remove reviews, and
            reviews come only from members with accounts. <Link href="/about">How we pick</Link>.
          </p>
        </div>
        <div>
          <h3 className="small-head">Other ways to work with us</h3>
          <p>
            Put a &quot;presented by&quot; line on {NEWSLETTER} or a seasonal trail (local banks, credit unions and services welcome), host a stop on a ticketed Plate
            Crawl, or list an event.
          </p>
        </div>
      </section>

      <section id="contact" className="contact">
        <h2>Get in touch</h2>
        <p className="muted">Tell us about your place, or tell us if a listing is closed or wrong.</p>
        <PartnerForm spot={searchParams.spot} />
      </section>
    </main>
  );
}
