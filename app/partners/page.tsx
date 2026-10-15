import type { Metadata } from "next";
import Link from "next/link";
import PartnerForm from "@/components/PartnerForm";
import { Logo } from "@/components/Brand";
import { BRAND, NEWSLETTER } from "@/lib/brand";

export const metadata: Metadata = {
  title: "For restaurants",
  description: `Claim your listing on ${BRAND} for free, or pay to be featured in your neighborhood.`,
};

const TIERS = [
  {
    id: "neighbor",
    name: "Listing",
    price: "Free",
    per: "",
    pitch: "Every locally owned place gets one.",
    perks: ["Claim and verify your page", "Update your hours, links and menu", "Answer reviews", "An owner mark on your page"],
  },
  {
    id: "regular",
    name: "Featured",
    price: "$39",
    per: "a month",
    pitch: "Show up first in your kind of food.",
    perks: ["Everything in Listing", "Top of your category, marked as paid", "Pick your cover photo and order your gallery", "A monthly count of views, saves and directions", "Post specials and events"],
  },
  {
    id: "institution",
    name: "Front page",
    price: "$99",
    per: "a month",
    pitch: "Own your part of town.",
    perks: ["Everything in Featured", "Top of your neighborhood on the map", "Comes up more often in Surprise Me (marked)", `A write-up in ${NEWSLETTER}, our Thursday email`, "A call with us every quarter"],
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
          Your neighbors are deciding where to eat tonight. {BRAND} only lists places that are locally owned: no chains, no fast food. A basic listing is
          free. If you want to be seen first in your neighborhood or your kind of food, there are two paid options.
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
          <h3 className="small-head">What we promise diners</h3>
          <p>
            Anything paid is marked <span className="paid">Paid listing</span>. Owners can&apos;t buy, edit or remove reviews. Ratings only come from people with
            accounts.
          </p>
        </div>
        <div>
          <h3 className="small-head">Other ways to work with us</h3>
          <p>Sponsor {NEWSLETTER}, take over a neighborhood for a week, list an event, or add reservation and delivery links to your page.</p>
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
