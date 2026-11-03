import type { Metadata } from "next";
import Link from "next/link";
import { PlateMark } from "@/components/Brand";
import { BRAND } from "@/lib/brand";
import { SPOTS } from "@/lib/data";

export const metadata: Metadata = {
  title: "Pop quiz: Birmingham, local edition (answer key)",
  description: "The answers to the Birmingham food pop quiz, and 140 locally owned places to study.",
  alternates: { canonical: "/quiz" },
};

/* The answer key for the pop quiz flyer (schools, coffee shops). Every answer comes from the guide itself (lib/data.ts, lib/honors.ts). */
const ANSWERS: { q: string; a: string; why: string; spot?: string }[] = [
  { q: "Golden Rule in Irondale has been cooking barbecue since…", a: "1891", why: "It calls itself Alabama's oldest barbecue restaurant. The Crestwood Boulevard flagship is the original.", spot: "golden-rule-irondale" },
  { q: "Gus's Hot Dogs downtown has been open since…", a: "1947", why: "Greek-owned, the longest-running hot dog stand in town. Get the chargrilled dog with onion sauce.", spot: "gus-hot-dogs" },
  { q: "How many Birmingham places made Michelin's first American South guide (2025)?", a: "11", why: "All eleven are on the list, from Bib Gourmands to Recommended." },
  { q: "J&J Grocery & Deli, home of the double bacon cheeseburger, used to be a…", a: "Gas station", why: "On Dickey Springs Road, just south of I-459. Opens at 5:30 in the morning, done by 2.", spot: "jj-grocery" },
];

export default function Quiz() {
  return (
    <main className="biz quiz">
      <header className="biz-top">
        <Link href="/" className="brand" aria-label={`${BRAND}, home`}>
          <PlateMark size={30} />
          <span className="brand-name">{BRAND}</span>
        </Link>
        <Link href="/" className="link-btn">
          See the list
        </Link>
      </header>
      <section className="quiz-head">
        <p className="eyebrow">Pop quiz · answer key</p>
        <h1>How&apos;d you do?</h1>
        <p className="biz-lede">Four out of four means you already eat like a local. Anything less means you&apos;ve got some eating to do.</p>
      </section>
      <ol className="quiz-list">
        {ANSWERS.map((x, i) => (
          <li key={i}>
            <p className="quiz-q">{x.q}</p>
            <p className="quiz-a">{x.a}</p>
            <p className="quiz-why">
              {x.why}{" "}
              {x.spot && (
                <Link href={`/spot/${x.spot}`} className="link-btn">
                  See it
                </Link>
              )}
            </p>
          </li>
        ))}
        <li>
          <p className="quiz-q">Bonus: name five locally owned places you&apos;d send a friend to. No chains.</p>
          <p className="quiz-a">Here are {SPOTS.length}.</p>
          <p className="quiz-why">Every one is locally owned and checked by a person. Stamp the ones you&apos;ve been to and see how you stack up.</p>
        </li>
      </ol>
      <section className="quiz-cta">
        <h2 className="biz-h2">Make it count</h2>
        <p>
          Join free, no password. Stamp the places you&apos;ve been, follow your friends, and let Surprise me pick dinner. Join before March 1, 2027 and you&apos;re a{" "}
          <b>Founding member</b>, for good.
        </p>
        <p className="biz-ctas">
          <Link href="/?join=1&utm_source=flyer&utm_medium=print&utm_campaign=launch&utm_content=quiz" className="btn btn-red">
            Join free
          </Link>
          <Link href="/?stamp=1&utm_source=flyer&utm_medium=print&utm_campaign=launch&utm_content=quiz" className="btn btn-line">
            Stamp where I&apos;ve been
          </Link>
        </p>
      </section>
    </main>
  );
}
