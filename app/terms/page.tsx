import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Brand";
import { BRAND, FOUNDER } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Terms",
  description: `The rules for using ${BRAND}: what you can post, what we take down, and what we're not responsible for. Plain English.`,
  alternates: { canonical: "/terms" },
};

const UPDATED = "October 19, 2026";
const CONTACT = FOUNDER.email || "emails@theplatenextdoor.com";

export default function Terms() {
  return (
    <main className="guide privacy">
      <header className="partners-top">
        <Link href="/" className="textbtn">
          ← Back to the map
        </Link>
        <Link href="/" className="brand" aria-label={`${BRAND}, home`}>
          <Logo size={36} />
        </Link>
      </header>

      <p className="cap-kicker">Terms</p>
      <h1 className="guide-h1">The rules, in plain English</h1>
      <p className="guide-lede">
        By making an account or posting anything on {BRAND}, on the website or in the app, you agree to these terms and to our{" "}
        <Link href="/privacy">privacy policy</Link>. If you don&apos;t agree, you can still browse; just don&apos;t sign up or post.
      </p>
      <p className="guide-meta">Last updated {UPDATED}</p>

      <h2 className="menu-head">
        <span>Who can use it</span>
      </h2>
      <p>You have to be 13 or older to make an account. One account per person, in your own name or a name you go by. Keep your sign-in email to yourself.</p>

      <h2 className="menu-head">
        <span>No tolerance for abuse</span>
      </h2>
      <p>
        We have zero tolerance for objectionable content and abusive users. You may not post, in a review, comment, photo, bio, @name or anywhere else:
      </p>
      <ul className="privacy-list">
        <li>Hate speech, slurs, threats, or anything that attacks people for who they are.</li>
        <li>Harassment, bullying, or picking on another member, a restaurant&apos;s staff or anyone else.</li>
        <li>Sexual content, violence or anything illegal.</li>
        <li>Someone&apos;s private information (addresses, phone numbers, photos of people who didn&apos;t agree to it).</li>
        <li>Spam, ads, or fake reviews: reviews of places you didn&apos;t visit, or of a place you own, work at, compete with, or were paid or given something to review.</li>
        <li>Pretending to be someone else.</li>
      </ul>
      <p>
        Every review, comment and member page has a <b>Report</b> button, and you can <b>block</b> anyone. We read reports within 24 hours, remove content that
        breaks these rules, and suspend or delete the accounts that posted it. Words that are never OK are filtered before they post. The full review rules
        are on <Link href="/about#reviews">How we pick</Link>.
      </p>

      <h2 className="menu-head">
        <span>What you post</span>
      </h2>
      <p>
        You own your reviews, comments and photos. By posting them you give {BRAND} permission to show them on the site and in the app, and in things that
        point to it (like a link preview), for as long as they&apos;re up. Delete them, or your account, and they come down. Only post photos you took or have
        the right to share.
      </p>

      <h2 className="menu-head">
        <span>Places and information</span>
      </h2>
      <p>
        We check every place, but hours, prices, menus and owners change. Call ahead before you make a special trip. Ratings and reviews are members&apos;
        opinions, not ours, and nobody pays to change them or their order.
      </p>

      <h2 className="menu-head">
        <span>Gift cards and other sites</span>
      </h2>
      <p>
        We don&apos;t sell gift cards. &quot;Gift card&quot; and links like Directions, Website and Order take you to the restaurant&apos;s own page or another
        company&apos;s site. Anything you buy there is between you and them, under their terms, including refunds and what happens if a place closes.
      </p>

      <h2 className="menu-head">
        <span>Ending things</span>
      </h2>
      <p>
        You can delete your account any time from your page (Passport → <b>Delete my account</b>); it removes everything you posted. We can remove content or
        close accounts that break these terms.
      </p>

      <h2 className="menu-head">
        <span>The legal part</span>
      </h2>
      <p>
        {BRAND} is provided as it is, without warranties. To the extent the law allows, we aren&apos;t liable for indirect or incidental damages from using it,
        and our total liability is limited to $50. These terms are governed by Alabama law. If we change them in a way that matters, we&apos;ll say so on the
        site before the change applies.
      </p>

      <h2 className="menu-head">
        <span>Contact</span>
      </h2>
      <p>
        Questions, a report that can&apos;t wait, or a legal notice: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. A person reads it.
      </p>

      <footer className="guide-foot">
        <Link href="/privacy">Privacy</Link>
        <span> · </span>
        <Link href="/about">How we pick</Link>
        <span> · </span>
        <Link href="/">The map</Link>
      </footer>
    </main>
  );
}
