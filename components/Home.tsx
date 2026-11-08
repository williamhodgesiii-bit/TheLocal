"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { GENRE_BY_ID, areaLabelOf, priceLabel, type Spot } from "@/lib/data";
import { NEWSLETTER } from "@/lib/brand";
import { SLOTS, weekLabel, type Letter } from "@/lib/letter";
import { featuredPost, thursdaySponsor } from "@/lib/sponsors";
import type { Collection } from "@/lib/collections";
import { useApp } from "./Providers";
import dynamic from "next/dynamic";
import type { FriendsTab, Pins } from "./Friends";
import { FeedReviewCard, useFeed } from "./Feed";
import { Cover, Poster } from "./Cover";
import { Icon } from "./Icons";
import Photo from "./Photo";
import ScrollCue, { useSwipeHint } from "./ScrollCue";
import Safe from "./Safe";
import { Avatar, FollowButton, NameLink, useBadges } from "./People";
import { milestoneName, nextMilestone } from "@/lib/passport";
import { getThe } from "@/lib/words";
import type { Person } from "@/lib/social";

/* the Friends tab is its own download */
const Friends = dynamic(() => import("./Friends"), { ssr: false, loading: () => <div className="skeleton-feed" aria-hidden><span /></div> });

export type HomeTab = "foryou" | "friends";
type Row = Collection & { spots: Spot[]; now: boolean };

/**
 * The front page is a feed. "For you": this week's three, then what members are reviewing,
 * with shelves of places in between so it's never empty. "Friends": only people you follow.
 */
export default function Home({
  tab,
  onTab,
  friendsTab,
  onFriendsTab,
  spotById,
  letter,
  rows,
  fresh,
  onOpen,
  onSeeAll,
  onPins,
  onSignup,
  onPeople,
  onPassport,
  onSearch,
}: {
  tab: HomeTab;
  onTab: (t: HomeTab) => void;
  friendsTab: FriendsTab;
  onFriendsTab: (t: FriendsTab) => void;
  spotById: Record<string, Spot>;
  letter: Letter;
  rows: Row[];
  /** places members added lately */
  fresh: Spot[];
  onOpen: (id: string) => void;
  onSeeAll: (collection: string) => void;
  onPins: (p: Pins) => void;
  onSignup: () => void;
  /** find people to follow */
  onPeople: () => void;
  /** your Plate Passport (on the You page) */
  onPassport: () => void;
  /** to the restaurant search */
  onSearch: () => void;
}) {
  const { unread, user } = useApp();
  return (
    <div className="home">
      <h1 className="sr-only">Locally owned restaurants, coffee shops and bars in Birmingham, Alabama</h1>
      <div className="seg-wrap">
        <div className="seg" role="tablist" aria-label="Feed">
          <button role="tab" aria-selected={tab === "foryou"} className={tab === "foryou" ? "on" : ""} onClick={() => onTab("foryou")}>
            For you
          </button>
          <button role="tab" aria-selected={tab === "friends"} className={tab === "friends" ? "on" : ""} onClick={() => onTab("friends")}>
            Friends
            {user && unread > 0 && <i className="dot" aria-label={`${unread} new`} />}
          </button>
        </div>
      </div>
      {tab === "friends" ? (
        <>
          <button type="button" className="find-bar" onClick={onPeople}>
            <Icon name="search" size={18} />
            <span>Find friends and local reviewers</span>
            <Icon name="right" size={16} />
          </button>
          <Safe where="friends">
            <Friends spotById={spotById} onOpen={onOpen} onPins={onPins} tab={friendsTab} onTab={onFriendsTab} />
          </Safe>
        </>
      ) : (
        <ForYou spotById={spotById} letter={letter} rows={rows} fresh={fresh} onOpen={onOpen} onSeeAll={onSeeAll} onSignup={onSignup} onPeople={onPeople} onPassport={onPassport} onSearch={onSearch} />
      )}
    </div>
  );
}

function ForYou({
  spotById,
  letter,
  rows,
  fresh,
  onOpen,
  onSeeAll,
  onSignup,
  onPeople,
  onPassport,
  onSearch,
}: {
  spotById: Record<string, Spot>;
  letter: Letter;
  rows: Row[];
  fresh: Spot[];
  onOpen: (id: string) => void;
  onSeeAll: (collection: string) => void;
  onSignup: () => void;
  onPeople: () => void;
  onPassport: () => void;
  onSearch: () => void;
}) {
  const { user, authReady, openAuth } = useApp();
  // signed out: search is open, the feed is a taste (two posts), and the rest asks them to join
  const guest = authReady && !user;
  const feed = useFeed("everyone", true);
  const allPosts = useMemo(
    () => (feed.items ?? []).filter((a) => a.kind === "review" && a.reviewId && feed.reviews[a.reviewId] && spotById[feed.reviews[a.reviewId].spotId]),
    [feed.items, feed.reviews, spotById]
  );
  const posts = guest ? allPosts.slice(0, 2) : allPosts;
  const feature = featuredPost();

  // shelves and the odd module between posts, so the feed reads like a magazine, not a wall
  const modules = useMemo(() => {
    const m: { at: number; key: string; node: React.ReactNode }[] = [];
    if (feature && spotById[feature.spotId]) m.push({ at: 1, key: "featured", node: <FeaturedCard f={feature} spot={spotById[feature.spotId]} onOpen={onOpen} /> });
    rows.slice(0, 3).forEach((r, i) => m.push({ at: [2, 5, 9][i], key: `row-${r.id}`, node: <Shelf title={r.title} line={r.line} spots={r.spots} now={r.now} onOpen={onOpen} onSeeAll={() => onSeeAll(r.id)} /> }));
    if (!guest) m.push({ at: 4, key: "people", node: <PeopleShelf onPeople={onPeople} /> });
    if (fresh.length) m.push({ at: 7, key: "fresh", node: <Shelf title="Just added" line="Places members wrote in, checked by us." spots={fresh} onOpen={onOpen} /> });
    m.push({ at: 12, key: "house", node: <HouseAd /> });
    return m.sort((a, b) => a.at - b.at);
  }, [feature, spotById, rows, fresh, onOpen, onSeeAll, onPeople, guest]);

  const blocks: React.ReactNode[] = [];
  let mi = 0;
  posts.forEach((a, i) => {
    while (mi < modules.length && modules[mi].at <= i)
      blocks.push(
        <div key={modules[mi].key}>
          <Safe where={`module-${modules[mi].key}`}>{modules[mi++].node}</Safe>
        </div>
      );
    const r = feed.reviews[a.reviewId!];
    blocks.push(
      <Safe key={a.id} where="feed-post">
        <FeedReviewCard actor={a.actor} at={a.at} r={r} spot={spotById[r.spotId]} onOpen={onOpen} onReview={feed.patch} />
      </Safe>
    );
  });
  const rest = modules.slice(mi);

  return (
    <div className="foryou">
      <ScrollCue />
      {guest && (
        <>
          <button type="button" className="find-bar" onClick={onSearch}>
            <Icon name="search" size={18} />
            <span>Search Birmingham restaurants</span>
            <Icon name="right" size={16} />
          </button>
          <JoinCard onJoin={() => openAuth()} />
        </>
      )}
      <Safe where="thursday-three">
        <ThursdayThree letter={letter} onOpen={onOpen} onSignup={onSignup} />
      </Safe>
      {!guest && <PassportStrip total={Object.keys(spotById).length} onOpen={onPassport} />}
      {feed.items === null ? (
        <div className="skeleton-feed" aria-hidden>
          <span />
        </div>
      ) : (
        <>
          {posts.length > 0 && <h2 className="feed-label">Lately on the plate</h2>}
          <ul className="feed-list">{blocks}</ul>
          {guest && allPosts.length > posts.length && (
            <div className="feed-gate">
              <p className="fg-big">That&apos;s a taste.</p>
              <p>Sign in to see the whole feed, follow friends and keep your own reviews and photos.</p>
              <button type="button" className="btn btn-ink" onClick={() => openAuth("Sign in to see the whole feed. It takes a few seconds, no password.")}>
                Sign in or join
              </button>
            </div>
          )}
          {posts.length === 0 && (
            <div className="first-review">
              <p className="fr-big">No reviews yet this week.</p>
              <p>Been somewhere good lately? Open it and say how it went. Yours is the first one people read.</p>
            </div>
          )}
        </>
      )}
      {/* shelves draw right away (and for search engines), before the reviews arrive */}
      {(feed.items === null ? modules : rest).map((m) => (
        <div key={m.key}>
          <Safe where={`module-${m.key}`}>{m.node}</Safe>
        </div>
      ))}
      {feed.more && !guest && (
        <button type="button" className="more-btn" onClick={feed.loadMore} ref={feed.sentinel}>
          Show more
        </button>
      )}
    </div>
  );
}

/** For people who aren't signed in: what joining gets them, said once, calmly. */
function JoinCard({ onJoin }: { onJoin: () => void }) {
  return (
    <section className="join-card" aria-labelledby="join-title">
      <h2 id="join-title">Your Birmingham food life, saved</h2>
      <ul>
        <li>See what friends are eating, with their photos</li>
        <li>Stamp a Plate Passport of every local place you&apos;ve been</li>
        <li>Make lists, and let Surprise me pick from them</li>
      </ul>
      <button type="button" className="btn btn-ink" onClick={onJoin}>
        Sign in or join
      </button>
      <p className="join-fine">Free, no password. Join before March 1 and you&apos;re a Founding member.</p>
    </section>
  );
}

/** The Thursday Plate on the front page: one fine dining, one casual, one wildcard, as big covers. */
export const ThursdayThree = memo(function ThursdayThree({ letter, onOpen, onSignup }: { letter: Letter; onOpen: (id: string) => void; onSignup: () => void }) {
  const picks = SLOTS.flatMap((slot) => (letter.picks[slot.id] ? [{ slot, spot: letter.picks[slot.id]!, note: letter.notes[slot.id] }] : []));
  const sponsor = thursdaySponsor();
  const row = useRef<HTMLOListElement>(null);
  useSwipeHint(row, "t3");
  if (!picks.length) return null;
  return (
    <section className="t3" aria-label={`${NEWSLETTER}: this week's three`}>
      <header className="t3-head">
        <div>
          <p className="eyebrow">
            {NEWSLETTER} · {weekLabel(letter.week)}
          </p>
          <h2 className="t3-title">This week&apos;s three</h2>
        </div>
        <button type="button" className="link-btn" onClick={onSignup}>
          Get it by email
        </button>
      </header>
      <ol className="t3-row" ref={row}>
        {picks.map(({ slot, spot, note }) => (
          <li key={slot.id}>
            <button className="t3-card" onClick={() => onOpen(spot.id)}>
              <span className="t3-img">
                <Cover spot={spot} sizes="(max-width: 640px) 78vw, 300px" widths={[500, 800]} eager />
                <span className="t3-slot">{slot.label}</span>
              </span>
              <span className="t3-name">{spot.name}</span>
              <span className="t3-meta">
                {GENRE_BY_ID[spot.genres[0]]?.short} · {areaLabelOf(spot)} · {priceLabel(spot.price)}
              </span>
              <span className="t3-note">{note || (spot.knownFor ? `${getThe(spot.knownFor).replace(/^Get/, "Order")}.` : "")}</span>
            </button>
          </li>
        ))}
      </ol>
      {sponsor && (
        <p className="presented">
          Presented by{" "}
          <a href={sponsor.url} target="_blank" rel="noreferrer sponsored">
            {sponsor.name}
          </a>
          {sponsor.line ? ` · ${sponsor.line}` : ""}
        </p>
      )}
    </section>
  );
});

/** a row of posters you swipe through */
export const Shelf = memo(function Shelf({
  title,
  line,
  spots,
  now,
  onOpen,
  onSeeAll,
}: {
  title: string;
  line?: string;
  spots: Spot[];
  now?: boolean;
  onOpen: (id: string) => void;
  onSeeAll?: () => void;
}) {
  const { been, saved } = useApp();
  if (!spots.length) return null;
  return (
    <section className="shelf">
      <header className="shelf-head">
        <div>
          <h2 className="shelf-title">
            {title}
            {now && <span className="now-tag">Right now</span>}
          </h2>
          {line && <p className="shelf-line">{line}</p>}
        </div>
        {onSeeAll && (
          <button type="button" className="link-btn" onClick={onSeeAll}>
            See all
          </button>
        )}
      </header>
      <div className="shelf-row">
        {spots.slice(0, 10).map((s) => (
          <button key={s.id} className="shelf-item" onClick={() => onOpen(s.id)}>
            <Poster spot={s} sizes="(max-width: 640px) 38vw, 160px">
              {been[s.id] ? <span className="mark mark-been" aria-label="Been" /> : saved.includes(s.id) ? <span className="mark mark-saved" aria-label="Want to try" /> : null}
            </Poster>
            <span className="shelf-name">{s.name}</span>
            <span className="shelf-meta">{areaLabelOf(s).split(" & ")[0]}</span>
          </button>
        ))}
      </div>
    </section>
  );
});

function FeaturedCard({ f, spot, onOpen }: { f: NonNullable<ReturnType<typeof featuredPost>>; spot: Spot; onOpen: (id: string) => void }) {
  return (
    <article className="featured">
      <p className="featured-label">
        <span className="paid">Sponsored</span> {spot.name}
      </p>
      <button className="featured-img" onClick={() => onOpen(spot.id)}>
        <Photo src={f.photo} alt={`${spot.name}: ${f.headline}`} genre={spot.genres[0]} />
      </button>
      <h3 className="featured-h">{f.headline}</h3>
      {f.body && <p className="featured-b">{f.body}</p>}
      <p className="featured-cta">
        <button className="btn btn-ink btn-sm" onClick={() => onOpen(spot.id)}>
          See {spot.name}
        </button>
        {f.cta && (
          <a className="btn btn-line btn-sm" href={f.cta.url} target="_blank" rel="noreferrer sponsored">
            {f.cta.label}
          </a>
        )}
      </p>
    </article>
  );
}

/** one quiet line for owners, far down the feed */
function HouseAd() {
  return (
    <Link href="/partners" className="house-ad">
      <span>
        <b>Own a local place?</b> Your listing is free. Claim it, add your photos, and see who&apos;s saving you.
      </span>
      <Icon name="right" size={18} />
    </Link>
  );
}

/**
 * The Plate Passport, one line on the front page: how far along you are, a tap away. It's there
 * so people know it exists, never in the way of the feed.
 */
function PassportStrip({ total, onOpen }: { total: number; onOpen: () => void }) {
  const { user, been, authReady, openAuth } = useApp();
  if (!authReady || !total) return null;
  const count = Object.keys(been).length;
  const { next, left } = nextMilestone(count, total);
  const pct = Math.min(1, count / total);
  const go = () => (user ? onOpen() : openAuth("Sign in to start your Plate Passport. It takes a few seconds, no password.", onOpen));
  return (
    <button type="button" className="pp-strip" onClick={go}>
      <span className="pp-mini" style={{ ["--p" as string]: pct }} aria-hidden>
        <span>{count}</span>
      </span>
      <span className="pp-strip-t">
        <b>Your Plate Passport</b>
        <span>
          {!user || count === 0
            ? "Stamp the local places you've been and watch it fill in."
            : left > 0
              ? `${count} of ${total} stamped · ${left} more to "${milestoneName(next, total)}"`
              : `All ${total}. Legend.`}
        </span>
      </span>
      <Icon name="right" size={18} />
    </button>
  );
}

/** a row of people worth following, between posts */
function PeopleShelf({ onPeople }: { onPeople: () => void }) {
  const { backend, user } = useApp();
  const [people, setPeople] = useState<Person[] | null>(null);
  useEffect(() => {
    let live = true;
    backend
      .topReviewers(30)
      .then(async (t) => (t.length >= 3 ? t : [...t, ...(await backend.suggestedMembers().catch(() => [] as Person[])).filter((p) => !t.some((x) => x.id === p.id))]))
      .then((p) => live && setPeople(p.slice(0, 10)), () => live && setPeople([]));
    return () => {
      live = false;
    };
  }, [backend, user?.id]);
  if (!people?.length) return null;
  return (
    <section className="shelf">
      <header className="shelf-head">
        <div>
          <h2 className="shelf-title">People to follow</h2>
          <p className="shelf-line">Local reviewers whose reviews people find useful.</p>
        </div>
        <button type="button" className="link-btn" onClick={onPeople}>
          See all
        </button>
      </header>
      <div className="shelf-row ppl-row">
        {people.map((p) => (
          <PersonCard key={p.id} p={p} />
        ))}
      </div>
    </section>
  );
}

function PersonCard({ p }: { p: Person }) {
  const mark = useBadges(p).find((b) => b.id !== "verified" && b.id !== "founding");
  return (
    <div className="pcard-p">
      <Avatar m={p} size={64} />
      <NameLink m={p} className="pcard-name" />
      <span className="pcard-sub">{mark ? mark.label : p.reviews ? `${p.reviews} ${p.reviews === 1 ? "review" : "reviews"}` : `@${p.handle}`}</span>
      <FollowButton person={p} small />
    </div>
  );
}
