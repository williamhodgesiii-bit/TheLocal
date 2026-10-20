import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Brand";
import AnalyticsOptOut from "@/components/AnalyticsOptOut";
import { BRAND, FOUNDER, NEWSLETTER } from "@/lib/brand";

// only describe the sign-in ways the site actually offers right now
const GOOGLE_ON = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const PASSKEYS_ON = process.env.NEXT_PUBLIC_PASSKEYS === "on";

export const metadata: Metadata = {
  title: "Privacy",
  description: `What ${BRAND} keeps, why, and how to delete it. Plain English.`,
  alternates: { canonical: "/privacy" },
};

const UPDATED = "October 19, 2026";
const CONTACT = FOUNDER.email || "emails@theplatenextdoor.com";

export default function Privacy() {
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

      <p className="cap-kicker">Privacy</p>
      <h1 className="guide-h1">What we keep, and why</h1>
      <p className="guide-lede">
        The short version: you can explore the whole map without an account. If you sign in, we keep what it takes to give you your stuff back on any device, and
        nothing more. We don&apos;t sell your information or use it for ads.
      </p>
      <p className="guide-meta">Last updated {UPDATED}</p>

      <h2 className="menu-head">
        <span>Without an account</span>
      </h2>
      <p>
        You can browse every place, the map and the guides. The home city you pick is saved in your browser, on your device; we don&apos;t see it. The Plate
        Passport, the want-to-try list, Surprise me and reviews need an account.
      </p>

      <h2 className="menu-head">
        <span>With an account</span>
      </h2>
      <ul className="privacy-list">
        <li>
          <b>Your email</b>, to send your sign-in code. There&apos;s no password, so there&apos;s no password for anyone to steal.
        </li>
        <li>
          <b>The name you pick</b>, your <b>home city</b>, your <b>passport stamps</b> and your <b>want-to-try list</b>, so they follow you to every device.
        </li>
        <li>
          <b>Reviews and photos you post</b>. These are public and signed with your name.
        </li>
        <li>
          <b>Places you send us</b>, and the note you add, so we can check them. The team gets an email about each one, with your name and email so we can
          write back.
        </li>
        <li>
          <b>Who you follow and who follows you</b>, your <b>comments</b> and <b>reactions</b> (Helpful, Want to go, Thanks), people you block or mute,
          and the notifications we show you.
        </li>
        {GOOGLE_ON && (
          <li>
            <b>Sign in with Google</b>: Google tells us your name, email and profile picture. We never see your Google password.
          </li>
        )}
        {PASSKEYS_ON && (
          <li>
            <b>Passkeys</b> (Face ID, fingerprint, device PIN): your device keeps the secret part. We only store a public key that can&apos;t sign you in on its
            own.
          </li>
        )}
      </ul>

      <h2 className="menu-head">
        <span>What other members see</span>
      </h2>
      <ul className="privacy-list">
        <li>
          <b>Your page</b> at /u/your-name: your name, @name, the line about you, your Top 4, and how many people you follow and who follow you. Never your
          email, your home city or when you sign in.
        </li>
        <li>
          <b>Your passport and want-to-go list</b>, only while &quot;Share my passport&quot; and &quot;Share my want-to-go list&quot; are on (Your page &amp;
          privacy). Visits show the day, never the time. If you joined before October 19, 2026, both start off.
        </li>
        <li>
          <b>Approve followers</b> keeps your passport, lists and activity to people you say yes to. Your reviews still show on each place&apos;s page,
          signed with your name.
        </li>
        <li>
          <b>Blocking</b> hides the two of you from each other everywhere on the site and ends any follows between you. Muting quietly takes someone out of
          your feed. Neither tells the other person.
        </li>
        <li>
          Who reacted to a review isn&apos;t public: everyone sees the counts, and the review&apos;s writer is told. Member pages aren&apos;t shown to search
          engines.
        </li>
      </ul>

      <h2 className="menu-head">
        <span>Gift cards</span>
      </h2>
      <p>
        We don&apos;t sell gift cards. &quot;Gift card&quot; sends you to the restaurant&apos;s own page (on Toast, Square, Instagift or their website), and
        what you type there goes to them, not us. We count the click (which place, never who) so we can tell restaurants how many gift buyers we send them.
      </p>

      <h2 className="menu-head">
        <span>In the iPhone app</span>
      </h2>
      <ul className="privacy-list">
        <li>
          <b>Location</b> is used only when you tap Nearest or &quot;Use my location&quot;, to sort places on your phone. It isn&apos;t sent to us or saved.
        </li>
        <li>
          <b>Notifications</b>: if you turn them on, we keep your phone&apos;s notification address with your account to send replies, comments, @mentions,
          follow requests and gift notes. Signing out on the phone removes it, and you can turn them off any time in iOS Settings.
        </li>
        <li>
          <b>Photos and camera</b>: only the photos you pick are uploaded.
        </li>
        <li>The app doesn&apos;t load Google Analytics, and nothing in it tracks you across other companies&apos; apps or websites.</li>
      </ul>

      <h2 className="menu-head">
        <span>Email</span>
      </h2>
      <p>
        {NEWSLETTER} goes only to people who ask for it, and every issue has an unsubscribe link. Sign-in codes aren&apos;t marketing; they only come when you
        ask for one.
      </p>

      <h2 className="menu-head">
        <span>Analytics</span>
      </h2>
      <p>
        We use Vercel Analytics (no cookies, counts only) and Google Analytics (uses cookies) to see which pages and guides people use, so we know what to
        improve. When you&apos;re signed in, analytics gets an anonymous member number, never your email or name. If your browser sends Global Privacy
        Control, Google Analytics doesn&apos;t load at all.
      </p>
      <AnalyticsOptOut />

      <h2 className="menu-head">
        <span>Who holds it</span>
      </h2>
      <p>
        Supabase (our database and sign-in), Vercel (hosting), Google ({GOOGLE_ON ? "analytics, and Google sign-in if you use it" : "analytics"}) our email provider (to deliver codes) and Apple (to deliver notifications in the iPhone app).
        They process it for us under their own security and privacy terms.
      </p>

      <h2 className="menu-head">
        <span>Deleting it</span>
      </h2>
      <p>
        Open your page and tap <b>Delete my account</b>. Your account, reviews, photos, stamps, saved places, follows, comments, reactions and
        notifications are deleted right then. Or email{" "}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a> and we&apos;ll do it for you.
      </p>

      <h2 className="menu-head">
        <span>Kids</span>
      </h2>
      <p>{BRAND} isn&apos;t meant for children under 13, and we don&apos;t knowingly collect their information.</p>

      <h2 className="menu-head">
        <span>Questions</span>
      </h2>
      <p>
        Write to <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. A person reads it.
      </p>

      <footer className="guide-foot">
        <Link href="/terms">Terms</Link>
        <span> · </span>
        <Link href="/about">How we pick</Link>
        <span> · </span>
        <Link href="/best">Guides</Link>
        <span> · </span>
        <Link href="/">The map</Link>
      </footer>
    </main>
  );
}
