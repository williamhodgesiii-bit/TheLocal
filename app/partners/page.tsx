import type { Metadata } from "next";
import Link from "next/link";
import PartnerForm from "@/components/PartnerForm";
import OwnerSnapshot from "@/components/OwnerSnapshot";
import { PlateMark } from "@/components/Brand";
import { BRAND, NEWSLETTER } from "@/lib/brand";
import { SPOT_BY_ID } from "@/lib/data";

export const metadata: Metadata = {
  title: "For restaurants",
  description: `Every locally owned place gets a free listing on ${BRAND}. Get on the lists Birmingham actually uses: want-to-try lists, people's own lists and Surprise me. Nobody can pay to rank.`,
  alternates: { canonical: "/partners" },
};

const TIERS = [
  {
    id: "neighbor",
    name: "Listing",
    price: "Free",
    per: "always",
    pitch: "Every locally owned place gets one.",
    perks: ["Claim it and fix anything that's wrong", "Answer reviews with an Owner mark on your name", "Send your own photos: they replace your matchbook cover", "A monthly email: saves, stamps and reviews"],
    cta: "Claim my listing",
  },
  {
    id: "regular",
    name: "Partner",
    price: "$39",
    per: "a month",
    pitch: "Look your best, and know what it's doing for you.",
    perks: ["Everything in Listing", "Pick your cover and the order of your photos", "Post specials and events on your page, marked “From the owner”", "A monthly report: saves, stamps, lists you're on, Surprise me landings, directions taps"],
    cta: "Ask about Partner",
    lead: true,
  },
  {
    id: "institution",
    name: "Featured",
    price: "$99",
    per: "a month",
    pitch: "Be seen first by people already looking for you.",
    perks: ["Everything in Partner", "The Sponsored card at the top of Explore for your kind of food or your part of town (one each, at most)", "One Featured post a month in the For you feed, with your photo", "Always labeled Sponsored. Never in rankings, awards or Surprise me"],
    cta: "Ask about Featured",
  },
];

export default function Partners({ searchParams }: { searchParams: { spot?: string; fix?: string } }) {
  const spot = searchParams.spot && SPOT_BY_ID[searchParams.spot] ? searchParams.spot : undefined;
  return (
    <main className="biz">
      <header className="biz-top">
        <Link href="/" className="brand" aria-label={`${BRAND}, home`}>
          <PlateMark size={30} />
          <span className="brand-name">{BRAND}</span>
        </Link>
        <Link href="/" className="link-btn">
          Back to the site
        </Link>
      </header>

      <section className="biz-hero">
        <div>
          <p className="eyebrow">For restaurants, bars &amp; coffee shops</p>
          <h1>Be the place Birmingham saves for Friday.</h1>
          <p className="biz-lede">
            People here don&apos;t scroll past ads. They save places to try, make their own lists (&ldquo;Date night,&rdquo; &ldquo;Vestavia,&rdquo; &ldquo;Cheap eats&rdquo;) and let Surprise me pick
            from them. Your listing is free, and your spot in the list is never for sale. That&apos;s why being on it means something.
          </p>
          <p className="biz-ctas">
            <a href="#contact" className="btn btn-red">
              Claim your free listing
            </a>
            <a href="#rates" className="btn btn-line">
              See the options
            </a>
          </p>
        </div>
        <OwnerSnapshot spot={spot} />
      </section>

      <section className="biz-how" aria-label="How people find you">
        <h2 className="biz-h2">How people find you here</h2>
        <ol>
          <li>
            <span className="biz-n">01</span>
            <h3>They save you</h3>
            <p>&ldquo;Want to try&rdquo; is a promise to visit. You&apos;ll see how many people in town have you on theirs.</p>
          </li>
          <li>
            <span className="biz-n">02</span>
            <h3>Surprise me picks you</h3>
            <p>Members build lists by occasion, price and neighborhood. When they can&apos;t decide, we pick from those lists. Weighted by love, never by money.</p>
          </li>
          <li>
            <span className="biz-n">03</span>
            <h3>Their friends see it</h3>
            <p>Every stamp and review, photos included, lands in their friends&apos; feeds. Word of mouth, written down.</p>
          </li>
        </ol>
      </section>

      <section className="biz-photo">
        <div className="biz-pair" aria-hidden>
          <span className="biz-pair-a">
            <span className="mx mx-sign" style={{ ["--mx-bg" as string]: "#2c5a43", ["--mx-fg" as string]: "#f3e9d2", ["--mx-ac" as string]: "#e0ae45" }}>
              <span className="mx-face">
                <span className="mx-top">Your street</span>
                <span className="mx-name" style={{ fontSize: "19cqw" }}>
                  <span>Your</span>
                  <span>place</span>
                </span>
                <span className="mx-foot">Today</span>
              </span>
              <span className="mx-strike" />
            </span>
          </span>
          <span className="biz-arrow">→</span>
          <span className="biz-pair-b">
            <span>Your best photo here</span>
          </span>
        </div>
        <div>
          <h2 className="biz-h2">Your photos change everything</h2>
          <p>
            A place without photos gets one of our matchbook covers. Send us yours (the room, the dish, the people) and you become the mouth-watering cover in every list, every feed, and
            every Surprise me that lands on you. It&apos;s free on every listing. We only use photos you send or say yes to.
          </p>
        </div>
      </section>

      <section className="biz-rates" id="rates">
        <h2 className="biz-h2">Options</h2>
        <div className="biz-tiers">
          {TIERS.map((t) => (
            <article key={t.id} className={`tier ${t.lead ? "lead" : ""}`}>
              <h3>{t.name}</h3>
              <p className="tier-price">
                <strong>{t.price}</strong> {t.per}
              </p>
              <p className="tier-pitch">{t.pitch}</p>
              <ul>
                {t.perks.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <a href="#contact" className={`btn ${t.lead ? "btn-ink" : "btn-line"} btn-block`}>
                {t.cta}
              </a>
            </article>
          ))}
        </div>
        <p className="biz-more">
          <b>Plate Invites, coming soon.</b> Host a table of Birmingham&apos;s Trusted reviewers (people other diners already follow for their reviews) for a
          tasting. Every review from an invited visit says &ldquo;Invited&rdquo; at the top and never counts toward your score, so it&apos;s honest and it&apos;s
          legal. <a href="#contact">Get on the early list</a>.
        </p>
        <p className="biz-more">
          <b>Not a restaurant?</b> Local banks, markets and makers can present {NEWSLETTER} (one sponsor at a time, &ldquo;Presented by&rdquo; on the email and the front page) or a seasonal trail.{" "}
          <a href="#contact">Ask us</a>.
        </p>
      </section>

      <section className="biz-promise">
        <h2 className="biz-h2">What we promise diners, and you</h2>
        <ul>
          <li>
            <b>Nobody pays to rank.</b> Lists sort by love, rating, distance or A to Z. Never by money.
          </li>
          <li>
            <b>Paid is labeled.</b> Anything paid says Sponsored or &ldquo;Presented by&rdquo; right next to it.
          </li>
          <li>
            <b>Reviews are off-limits.</b> Owners can answer them, never buy, edit, hide or reorder them.
          </li>
          <li>
            <b>Surprise me is never for sale.</b> It picks from what people chose, weighted by how loved a place is.
          </li>
        </ul>
        <p>
          <Link href="/about">How we pick places</Link>
        </p>
      </section>

      <section id="contact" className="biz-contact">
        <h2 className="biz-h2">Get in touch</h2>
        <p className="muted">Claim your place, send photos, ask about an option, or tell us a listing is closed or wrong. A person writes back.</p>
        <PartnerForm spot={spot} fix={!!searchParams.fix} />
      </section>
    </main>
  );
}
