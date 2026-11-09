import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Brand";
import AnalyticsOptOut from "@/components/AnalyticsOptOut";
import { BRAND, NEWSLETTER } from "@/lib/brand";
import { LEGAL_ADDRESS, LEGAL_EMAIL, LEGAL_UPDATED, MIN_AGE, OPERATOR, TERMS_VERSION } from "@/lib/legal";

// only describe the sign-in ways the site actually offers right now
const GOOGLE_ON = !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const PASSKEYS_ON = process.env.NEXT_PUBLIC_PASSKEYS === "on";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `The ${BRAND} Privacy Policy: what we collect, why, who processes it, how it's protected, your choices and how to delete it.`,
  alternates: { canonical: "/privacy" },
};

const UPDATED = LEGAL_UPDATED;
const CONTACT = LEGAL_EMAIL;

export default function Privacy() {
  return (
    <main className="guide privacy legal">
      <header className="partners-top">
        <Link href="/" className="textbtn">
          ← Back
        </Link>
        <Link href="/" className="brand" aria-label={`${BRAND}, home`}>
          <Logo size={36} />
        </Link>
      </header>

      <p className="cap-kicker">Legal</p>
      <h1 className="guide-h1">Privacy Policy</h1>
      <p className="guide-meta">
        Last updated {UPDATED} · Version {TERMS_VERSION}
      </p>
      <p className="guide-lede">
        The short version: you can search restaurants without an account. If you sign in, we keep what it takes to run your account and give your things back
        on any device. We don&apos;t sell your personal information, and we don&apos;t use it for targeted advertising.
      </p>
      <p>
        This Privacy Policy explains how {OPERATOR} (&quot;{BRAND},&quot; &quot;we,&quot; &quot;us&quot;) collects, uses, shares and protects information
        when you use our website, app, newsletter and related services (the &quot;Service&quot;). It is part of our{" "}
        <Link href="/terms">Terms of Service</Link>. By using the Service you agree to this policy; if you don&apos;t, please don&apos;t use the Service.
      </p>

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
          <b>Reviews and photos you post</b>, including photos on your reviews. These are public and signed with your name. The team gets an email with
          each new photo so we can check it, and we may feature one as the picture for that place (credited to you). You can delete your photos any time.
        </li>
        <li>
          <b>Places you send us</b>, and the note you add, so we can check them. The team gets an email about each one, with your name and email so we can
          write back.
        </li>
        <li>
          <b>Who you follow and who follows you</b>, your <b>comments</b> and <b>reactions</b> (likes and saves), people you block or mute,
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
        {NEWSLETTER} goes only to people who ask for it, once a week, and every issue has a one-tap unsubscribe link that takes your email off the list for
        good. We send it through Resend, the same service that sends sign-in codes. Sign-in codes aren&apos;t marketing; they only come when you ask for one.
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
        <span>Collected automatically</span>
      </h2>
      <p>
        Like nearly every website, our hosting and database providers automatically record technical information when you use the Service, such as your IP
        address, browser and device type, operating system, pages requested, referring page, and the date and time, in server and security logs. We use these
        logs to run, secure and fix the Service (for example, to stop abuse and investigate errors), and they are kept for a limited time. Your browser also
        stores small pieces of information on your device (local storage and, for Google Analytics, cookies) so the site remembers your choices and keeps you
        signed in.
      </p>

      <h2 className="menu-head">
        <span>How we use information</span>
      </h2>
      <ul className="privacy-list">
        <li>To provide the Service: create and secure your account, sign you in, save your passport, lists and reviews, and show your content where you post it.</li>
        <li>To keep the Service safe and fair: prevent fraud, spam, fake reviews and abuse, enforce our Terms, and investigate reports.</li>
        <li>To communicate with you: sign-in codes, account and security notices, notifications you turn on, replies to your messages, and {NEWSLETTER} if you subscribe.</li>
        <li>To understand and improve the Service: see which pages and features are used, fix problems, and plan what to build.</li>
        <li>To comply with law and protect rights: respond to legal requests, and protect the rights, property and safety of our members, the public and us.</li>
      </ul>

      <h2 className="menu-head">
        <span>When we share it</span>
      </h2>
      <p>We don&apos;t sell your personal information, and we don&apos;t share it for cross-context behavioral advertising. We share information only:</p>
      <ul className="privacy-list">
        <li>Publicly, when you post it (reviews, photos, comments, your public page), as described above.</li>
        <li>With service providers who process it for us under contract, listed below, only as needed to run the Service.</li>
        <li>With restaurants, only as counts that never identify you (for example, how many people saved a place).</li>
        <li>
          If required by law, or if we believe in good faith it&apos;s necessary to comply with a subpoena, court order or other legal process, to protect the
          safety of any person, to investigate fraud or security issues, or to enforce our Terms.
        </li>
        <li>In connection with a merger, acquisition, financing or sale of all or part of our business, in which case this policy continues to apply to it.</li>
        <li>With your consent, or at your direction.</li>
      </ul>

      <h2 className="menu-head">
        <span>Who holds it</span>
      </h2>
      <p>
        Supabase (our database and sign-in), Vercel (hosting), Google ({GOOGLE_ON ? "analytics, and Google sign-in if you use it" : "analytics"}) our email provider (to deliver codes) and Apple (to deliver notifications in the iPhone app).
        They process it for us under their own security and privacy terms.
      </p>

      <h2 className="menu-head">
        <span>How we protect it</span>
      </h2>
      <ul className="privacy-list">
        <li>No passwords: sign-in uses one-time email codes{GOOGLE_ON ? ", Google" : ""}{PASSKEYS_ON ? " or passkeys" : ""}, so there&apos;s no password of yours for anyone to steal from us.</li>
        <li>Every connection to the Service is encrypted (HTTPS), and browsers are told to use only encrypted connections.</li>
        <li>Our database enforces, on every request, that members can read and change only their own private information. Emails and sign-up lists can&apos;t be read through the public website at all.</li>
        <li>Photos can only be uploaded to your own folder, reviews are always signed with your real account name, and staff powers can&apos;t be claimed by members.</li>
        <li>Access to our systems is limited to the people who run the Service.</li>
      </ul>
      <p>
        No system is perfectly secure, and we can&apos;t guarantee that information will never be accessed, used or disclosed without permission. If we learn
        of a breach of security involving your personal information, we will notify you and any required authorities as and when required by applicable law,
        including the Alabama Data Breach Notification Act of 2018. Keep your email account secure, since it&apos;s how you sign in.
      </p>

      <h2 className="menu-head">
        <span>How long we keep it</span>
      </h2>
      <p>
        We keep your account information and content for as long as your account is open. When you delete your account, we delete it from the live Service
        right away; copies may remain in backups and logs for a limited time until they&apos;re overwritten, and we may keep information we&apos;re required
        to keep by law, need to resolve disputes, or need to enforce our agreements (such as a record that you agreed to our Terms). Newsletter addresses are
        kept until you unsubscribe.
      </p>

      <h2 className="menu-head">
        <span>Your choices and rights</span>
      </h2>
      <ul className="privacy-list">
        <li>See and edit your name, @name, picture, bio and privacy settings any time on your page.</li>
        <li>Delete any review, photo or comment you posted, or your whole account, as described below.</li>
        <li>Turn off sharing of your passport and want-to-go list, approve followers, block or mute people.</li>
        <li>Unsubscribe from {NEWSLETTER} with one tap in any issue, and turn off notifications in your device settings.</li>
        <li>
          Ask us for a copy of your information, to correct it, or to delete it, by emailing <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. We&apos;ll verify
          the request comes from the account&apos;s email and respond within 45 days. Residents of states with privacy laws (such as California, Colorado,
          Connecticut, Virginia and others) have these rights by law, and we honor them for everyone. We won&apos;t treat you differently for using them.
        </li>
        <li>Global Privacy Control is honored (see Analytics). Browsers&apos; older &quot;Do Not Track&quot; signal has no agreed standard, so we rely on GPC instead.</li>
      </ul>

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
      <p>
        {BRAND} isn&apos;t meant for children under {MIN_AGE}, and we don&apos;t knowingly collect personal information from them, consistent with the
        Children&apos;s Online Privacy Protection Act (COPPA). Students and anyone under {MIN_AGE} should not create an account. If you believe a child under{" "}
        {MIN_AGE} has given us information, email us and we&apos;ll delete it. Members aged {MIN_AGE} to 17 should use the Service with a parent&apos;s or
        guardian&apos;s permission.
      </p>

      <h2 className="menu-head">
        <span>Where it&apos;s kept</span>
      </h2>
      <p>
        The Service is run from, and your information is stored and processed in, the United States. If you use the Service from somewhere else, you
        understand your information will be transferred to and processed in the United States, where privacy laws may differ from yours.
      </p>

      <h2 className="menu-head">
        <span>Changes to this policy</span>
      </h2>
      <p>
        We may update this policy. When we make a material change we&apos;ll update the date above and ask signed-in members to review and agree before
        continuing. Using the Service after a change means you accept it.
      </p>

      <h2 className="menu-head">
        <span>Questions</span>
      </h2>
      <p>
        Write to <a href={`mailto:${CONTACT}`}>{CONTACT}</a>, or by mail to {OPERATOR}, {LEGAL_ADDRESS}. A person reads it.
      </p>

      <footer className="guide-foot">
        <Link href="/terms">Terms of Service</Link>
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
