"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { GENRE_BY_ID, areaLabelOf, priceLabel, type Spot } from "@/lib/data";
import { NEWSLETTER } from "@/lib/brand";
import { SLOTS, weekLabel, type Letter } from "@/lib/letter";
import { featuredPost, thursdaySponsor } from "@/lib/sponsors";
import type { Collection } from "@/lib/collections";
import { useApp } from "./Providers";
import Friends, { FeedReviewCard, useFeed, type FriendsTab, type Pins } from "./Friends";
import { Cover, Poster } from "./Cover";
import { Icon } from "./Icons";
import Photo from "./Photo";

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
}) {
  const { unread, user } = useApp();
  return (
    <div className="home">
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
        <Friends spotById={spotById} onOpen={onOpen} onPins={onPins} tab={friendsTab} onTab={onFriendsTab} />
      ) : (
        <ForYou spotById={spotById} letter={letter} rows={rows} fresh={fresh} onOpen={onOpen} onSeeAll={onSeeAll} onSignup={onSignup} />
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
}: {
  spotById: Record<string, Spot>;
  letter: Letter;
  rows: Row[];
  fresh: Spot[];
  onOpen: (id: string) => void;
  onSeeAll: (collection: string) => void;
  onSignup: () => void;
}) {
  const feed = useFeed("everyone", true);
  const posts = useMemo(
    () => (feed.items ?? []).filter((a) => a.kind === "review" && a.reviewId && feed.reviews[a.reviewId] && spotById[feed.reviews[a.reviewId].spotId]),
    [feed.items, feed.reviews, spotById]
  );
  const feature = featuredPost();

  // shelves and the odd module between posts, so the feed reads like a magazine, not a wall
  const modules = useMemo(() => {
    const m: { at: number; key: string; node: React.ReactNode }[] = [];
    if (feature && spotById[feature.spotId]) m.push({ at: 1, key: "featured", node: <FeaturedCard f={feature} spot={spotById[feature.spotId]} onOpen={onOpen} /> });
    rows.slice(0, 3).forEach((r, i) => m.push({ at: [2, 5, 9][i], key: `row-${r.id}`, node: <Shelf title={r.title} line={r.line} spots={r.spots} now={r.now} onOpen={onOpen} onSeeAll={() => onSeeAll(r.id)} /> }));
    if (fresh.length) m.push({ at: 7, key: "fresh", node: <Shelf title="Just added" line="Places members wrote in, checked by us." spots={fresh} onOpen={onOpen} /> });
    m.push({ at: 12, key: "house", node: <HouseAd /> });
    return m.sort((a, b) => a.at - b.at);
  }, [feature, spotById, rows, fresh, onOpen, onSeeAll]);

  const blocks: React.ReactNode[] = [];
  let mi = 0;
  posts.forEach((a, i) => {
    while (mi < modules.length && modules[mi].at <= i) blocks.push(<div key={modules[mi].key}>{modules[mi++].node}</div>);
    const r = feed.reviews[a.reviewId!];
    blocks.push(<FeedReviewCard key={a.id} actor={a.actor} at={a.at} r={r} spot={spotById[r.spotId]} onOpen={onOpen} onReview={feed.patch} />);
  });
  const rest = modules.slice(mi);

  return (
    <div className="foryou">
      <ThursdayThree letter={letter} onOpen={onOpen} onSignup={onSignup} />
      {feed.items === null ? (
        <div className="skeleton-feed" aria-hidden>
          <span />
        </div>
      ) : (
        <>
          {posts.length > 0 && <h2 className="feed-label">Lately on the plate</h2>}
          <ul className="feed-list">{blocks}</ul>
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
        <div key={m.key}>{m.node}</div>
      ))}
      {feed.more && (
        <button type="button" className="more-btn" onClick={feed.loadMore} ref={feed.sentinel}>
          Show more
        </button>
      )}
    </div>
  );
}

/** The Thursday Plate on the front page: one fine dining, one casual, one wildcard, as big covers. */
export const ThursdayThree = memo(function ThursdayThree({ letter, onOpen, onSignup }: { letter: Letter; onOpen: (id: string) => void; onSignup: () => void }) {
  const picks = SLOTS.flatMap((slot) => (letter.picks[slot.id] ? [{ slot, spot: letter.picks[slot.id]!, note: letter.notes[slot.id] }] : []));
  const sponsor = thursdaySponsor();
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
      <ol className="t3-row">
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
              <span className="t3-note">{note || `Order the ${spot.knownFor.charAt(0).toLowerCase()}${spot.knownFor.slice(1)}.`}</span>
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
