import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Brand";
import { BRAND, CHECKED, FOUNDER, MANTRA, NEWSLETTER } from "@/lib/brand";
import { SPOTS } from "@/lib/data";

export const metadata: Metadata = {
  title: "How we pick",
  description: `How ${BRAND} decides what's on the list, how it makes money, and the rules for reviews. Nobody pays to rank.`,
  alternates: { canonical: "/about" },
};

export default function About() {
  return (
    <main className="about">
      <header className="partners-top">
        <Link href="/" className="textbtn">
          ← Back to the map
        </Link>
        <Link href="/" className="brand" aria-label={`${BRAND}, home`}>
          <Logo size={36} />
        </Link>
      </header>

      <p className="cap-kicker">How we pick</p>
      <h1>{MANTRA}</h1>
      <p className="about-lede">
        {BRAND} is a guide to the {SPOTS.length} locally owned restaurants, coffee shops and bars we&apos;d send a friend to in Birmingham, Homewood, Mountain Brook,
        Vestavia Hills and Hoover, plus a few worth the drive. Here is exactly how a place gets on it, how we keep it current, and how we pay for it.
      </p>

      <section className="about-promises" aria-label="Our promises">
        <div>
          <b>Nobody pays to rank.</b>
          <span>Order comes from how well-loved a place is, or the sort you pick. Money never moves a place up.</span>
        </div>
        <div>
          <b>Every place checked by a person.</b>
          <span>Our list was last checked {CHECKED}. Member additions are checked before they show.</span>
        </div>
        <div>
          <b>Anything paid says Sponsored.</b>
          <span>Right next to it, on the list, the map, the place page and the email.</span>
        </div>
      </section>

      <h2 className="menu-head">
        <span>What makes the list</span>
      </h2>
      <ul className="about-list">
        <li>
          <b>Locally owned, or born here.</b> Most of these are one place, owned by people who live here. Some local favorites have grown to more than one location, a
          few into franchises (Saw&apos;s, Taco Mama, Jim &apos;N Nick&apos;s). They count because they started in the Birmingham area.
        </li>
        <li>
          <b>No outside chains, no fast food.</b> If it started somewhere else, it isn&apos;t on here, even when a neighbor owns the local franchise. Neither is anything
          drive-thru only. Submissions that match a known chain get flagged automatically.
        </li>
        <li>
          <b>Somewhere we&apos;d send a friend.</b> Good food or drink, made with care, at any price. A $ lunch counter belongs next to a tasting menu.
        </li>
      </ul>

      <h2 className="menu-head">
        <span>How a place gets on</span>
      </h2>
      <ol className="about-list">
        <li>We started from places we eat at, checked against local reporting (Bham Now, The Homewood Star, Village Living, Vestavia Voice) in {CHECKED}.</li>
        <li>Members can write in a place. One of us checks it&apos;s real, open and locally owned, then it goes up with the member&apos;s name on it.</li>
        <li>Awards show only when we can point to where they were announced, with the year. Tap a badge to see the source.</li>
      </ol>

      <h2 className="menu-head">
        <span>Keeping it current</span>
      </h2>
      <p>
        Restaurants close and change hands. When we hear a place has closed for good we take it off; a place that&apos;s closed for the night or for repairs stays on. Map pins
        are refreshed from OpenStreetMap every month. If something&apos;s wrong, <Link href="/partners#contact">tell us</Link> and we&apos;ll fix it.
      </p>

      <h2 className="menu-head">
        <span>How we make money</span>
      </h2>
      <ul className="about-list">
        <li>
          <b>Optional extras for owners</b>, like more photos and a monthly report on views and directions. Paying never changes where a place shows up.
        </li>
        <li>
          <b>Sponsors</b>: a clearly labeled sponsored spot, at most one per kind of food and one per neighborhood, and a &quot;presented by&quot; line in {NEWSLETTER}.
        </li>
        <li>We don&apos;t sell rankings, reviews, awards or a better chance in &quot;Surprise me.&quot; Owners can&apos;t buy, edit or remove reviews.</li>
      </ul>

      <h2 className="menu-head" id="reviews">
        <span>Reviews</span>
      </h2>
      <ul className="about-list">
        <li>
          <b>Members only, one per place.</b> Anyone with an account can review a place once, and edit it any time; an edited review says so. Five a day at most.
        </li>
        <li>
          <b>What a review is.</b> A score from 1 to 5 where every number has words (3 is good, 5 is one of the best in town), whether you&apos;d go back, what
          you got, the month you went, and one paragraph of 100 to 600 characters. Optional: what it&apos;s good for, and scores for the food, service and vibe.
        </li>
        <li>
          <b>First-hand, no ties.</b> You have to have gone yourself. Owners, staff, their families and competitors can&apos;t review a place, and nobody (us,
          owners, anyone) may offer anything for a review, good or bad. Every reviewer confirms this when they post.
        </li>
        <li>
          <b>The same rules for good and bad.</b> We never hide a review for being negative. We take down reviews that are fake, not first-hand, written by
          someone with a tie to the place, abusive, hateful, personal (names or private details), spam, or about something other than the visit. When three
          members report a review it&apos;s held until a person checks it, and held reviews don&apos;t count.
        </li>
        <li>
          <b>How the numbers work.</b> The score is the plain average of every review that&apos;s up, shown once a place has three. &quot;Would go back&quot; is
          the share who said yes. &quot;Top rated&quot; pulls places with only a few reviews toward the site-wide average, so a single 5 can&apos;t top the list.
          Sponsors and partners can&apos;t change, reorder, hide or answer for any of it.
        </li>
        <li>Your Plate Passport (the places you&apos;ve stamped) is yours. We don&apos;t sell it or show it to anyone.</li>
      </ul>

      {FOUNDER.name && (
        <>
          <h2 className="menu-head">
            <span>Who we are</span>
          </h2>
          <p>
            <b>{FOUNDER.name}</b>
            {FOUNDER.line ? `, ${FOUNDER.line}` : ""}.{" "}
            {FOUNDER.email && (
              <>
                Write any time: <a href={`mailto:${FOUNDER.email}`}>{FOUNDER.email}</a>.
              </>
            )}
          </p>
        </>
      )}

      <p className="about-foot">
        Questions, corrections or a place we&apos;re missing? <Link href="/partners#contact">Get in touch</Link>. Own a restaurant? <Link href="/partners">Here&apos;s how listings work</Link>.
      </p>
    </main>
  );
}
