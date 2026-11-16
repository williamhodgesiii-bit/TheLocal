"use client";

import { memo, useRef } from "react";
import Link from "next/link";
import { GENRE_BY_ID, areaLabelOf, priceLabel, type Spot } from "@/lib/data";
import { NEWSLETTER } from "@/lib/brand";
import { SLOTS, weekLabel, type Letter } from "@/lib/letter";
import { thursdaySponsor } from "@/lib/sponsors";
import { useApp } from "./Providers";
import dynamic from "next/dynamic";
import type { FriendsTab, Pins } from "./Friends";
import { Cover, Poster } from "./Cover";
import { Icon } from "./Icons";
import ScrollCue, { useSwipeHint } from "./ScrollCue";
import Safe from "./Safe";
import { getThe } from "@/lib/words";

/* the Friends tab is its own download */
const Friends = dynamic(() => import("./Friends"), { ssr: false, loading: () => <div className="skeleton-feed" aria-hidden><span /></div> });

export type HomeTab = "foryou" | "friends" | "lists";

/**
 * Home has three tabs. "For you" is short on purpose: this week's three and the award winners,
 * nothing to scroll past. "Friends" is the people you follow: their reviews, photos and visits.
 * "Lists" is your shelves of places, each one something Surprise me can choose from.
 */
export default function Home({
  tab,
  onTab,
  friendsTab,
  onFriendsTab,
  spotById,
  letter,
  honors,
  lists,
  onOpen,
  onSeeAll,
  onPins,
  onSignup,
  onPeople,
}: {
  tab: HomeTab;
  onTab: (t: HomeTab) => void;
  friendsTab: FriendsTab;
  onFriendsTab: (t: FriendsTab) => void;
  spotById: Record<string, Spot>;
  letter: Letter;
  /** Michelin and James Beard places */
  honors: Spot[];
  /** the Lists tab, drawn by the app shell */
  lists: React.ReactNode;
  onOpen: (id: string) => void;
  onSeeAll: (collection: string) => void;
  onPins: (p: Pins) => void;
  onSignup: () => void;
  /** find people to follow */
  onPeople: () => void;
}) {
  const { unread, user } = useApp();
  const tabs: [HomeTab, string][] = [
    ["foryou", "For you"],
    ["friends", "Friends"],
    ["lists", "Lists"],
  ];
  return (
    <div className="home">
      <h1 className="sr-only">Locally owned restaurants, coffee shops and bars in Birmingham, Alabama</h1>
      <div className="seg-wrap">
        <div className="seg seg-3" role="tablist" aria-label="Home">
          {tabs.map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => onTab(k)}>
              {label}
              {k === "friends" && user && unread > 0 && <i className="dot" aria-label={`${unread} new`} />}
            </button>
          ))}
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
      ) : tab === "lists" ? (
        lists
      ) : (
        <div className="foryou">
          <ScrollCue />
          <Safe where="thursday-three">
            <ThursdayThree letter={letter} onOpen={onOpen} onSignup={onSignup} />
          </Safe>
          <Safe where="award-winners">
            <Shelf title="Award winners" line="Michelin and James Beard, and every one locally owned." spots={honors} onOpen={onOpen} onSeeAll={() => onSeeAll("honors")} />
          </Safe>
        </div>
      )}
    </div>
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
