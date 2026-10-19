"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { track } from "@/lib/analytics";
import type { Review } from "@/lib/backend";
import { GENRE_BY_ID, areaLabelOf, type Spot } from "@/lib/data";
import { RATING_WORDS } from "@/lib/reviews";
import {
  VERDICT_WORDS,
  groupFeed,
  groupNotes,
  noteLine,
  popularWithFriends,
  profilePath,
  timeAgo,
  whoList,
  type Activity,
  type FeedGroup,
  type MemberLite,
  type NoteGroup,
  type Person,
  type Reaction,
} from "@/lib/social";
import { Thumb } from "./Photo";
import { Avatar, NameLink, PersonRow } from "./People";
import { useApp } from "./Providers";
import { ReviewActions } from "./Reviews";
import ReviewThread from "./ReviewThread";
import { Stars } from "./Stars";

export type FriendsTab = "following" | "everyone" | "activity";
type Chip = "all" | "reviews" | "visits" | "mutual";
const CHIPS: { id: Chip; label: string }[] = [
  { id: "all", label: "All" },
  { id: "reviews", label: "Reviews" },
  { id: "visits", label: "Visits" },
  { id: "mutual", label: "Friends only" },
];
export type Pins = { ids: string[]; title: string; sub: string } | null;

/**
 * Friends: what the people you follow have been up to, newest first. "Everyone" is the latest
 * reviews from all members, so there's something to read (and someone to follow) on day one.
 * "Activity" is what happened to you: follows, comments, reactions, gift notes.
 */
export default function Friends({
  spotById,
  onOpen,
  onPins,
  tab,
  onTab,
}: {
  spotById: Record<string, Spot>;
  onOpen: (id: string) => void;
  onPins: (p: Pins) => void;
  tab: FriendsTab;
  onTab: (t: FriendsTab) => void;
}) {
  const { backend, user, authReady, openAuth, unread, refreshUnread, me, toast } = useApp();
  const [finding, setFinding] = useState(false);
  const [chip, setChip] = useState<Chip>("all");
  const [mutuals, setMutuals] = useState<Set<string>>(new Set());
  const [following, setFollowing] = useState<number | null>(null);
  const scope = tab === "everyone" || !user ? "everyone" : "following";
  const feed = useFeed(scope, tab !== "activity");

  // who follows me back, for "Friends only"
  useEffect(() => {
    if (!user || !me) return;
    Promise.all([backend.network(user.id, "followers"), backend.network(user.id, "following")])
      .then(([fol, ing]) => {
        const back = new Set(fol.map((p) => p.id));
        setMutuals(new Set(ing.filter((p) => back.has(p.id)).map((p) => p.id)));
        setFollowing(ing.length);
      })
      .catch(() => {});
  }, [user, me, backend]);

  const items = useMemo(() => {
    const list = (feed.items ?? []).filter((a) => !a.spotId || spotById[a.spotId] || a.kind === "follow");
    if (chip === "reviews") return list.filter((a) => a.kind === "review");
    if (chip === "visits") return list.filter((a) => a.kind === "been");
    if (chip === "mutual") return list.filter((a) => mutuals.has(a.actor.id));
    return list;
  }, [feed.items, chip, mutuals, spotById]);
  const groups = useMemo(() => groupFeed(items), [items]);
  const popular = useMemo(() => (scope === "following" ? popularWithFriends(feed.items ?? []).filter((p) => spotById[p.spotId]) : []), [feed.items, scope, spotById]);

  // the map shows where these people have been
  useEffect(() => {
    if (tab === "activity") return onPins(null);
    const ids = Array.from(new Set(items.filter((a) => a.spotId && spotById[a.spotId]).map((a) => a.spotId!)));
    onPins(ids.length ? { ids, title: scope === "following" ? "Where people you follow went" : "Lately reviewed", sub: `${ids.length} place${ids.length === 1 ? "" : "s"} in this feed` } : null);
  }, [items, tab, scope, spotById]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => onPins(null), []); // eslint-disable-line react-hooks/exhaustive-deps

  async function share() {
    if (!me) return;
    const url = `${location.origin}${profilePath(me.handle)}`;
    try {
      if (navigator.share) await navigator.share({ title: `${me.name} on The Plate Next Door`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast("Link copied. Send it to a friend.", "ok");
      }
      track("share_profile");
    } catch {
      /* closed the share sheet */
    }
  }

  return (
    <div className="friends">
      <header className="fr-head">
        <div>
          <span className="cap-kicker">The people you eat with</span>
          <h1 className="fr-title">Friends</h1>
        </div>
        <button type="button" className={`btn btn-line btn-sm fr-find ${finding ? "on" : ""}`} onClick={() => setFinding((v) => !v)} aria-expanded={finding}>
          {finding ? "Done" : "Find people"}
        </button>
      </header>

      <AnimatePresence initial={false}>{finding && <FindPeople key="find" onShare={me ? share : undefined} />}</AnimatePresence>

      <nav className="fr-tabs" role="tablist" aria-label="Friends">
        {(
          [
            ["following", "Following"],
            ["everyone", "Everyone"],
            ["activity", "Activity"],
          ] as [FriendsTab, string][]
        ).map(([k, l]) => (
          <button
            key={k}
            role="tab"
            type="button"
            aria-selected={tab === k}
            className={tab === k ? "on" : ""}
            onClick={() => {
              if (k === "activity" && !user) return openAuth("Sign in to see who followed you and what people said about your reviews.");
              onTab(k);
            }}
          >
            {l}
            {k === "activity" && unread > 0 && <span className="fr-dot">{unread > 9 ? "9+" : unread}</span>}
          </button>
        ))}
      </nav>

      {tab === "activity" ? (
        <ActivityTab onOpen={onOpen} spotById={spotById} onSeen={refreshUnread} />
      ) : (
        <>
          {tab === "following" && authReady && !user && (
            <section className="fr-pitch">
              <h2>See where your friends eat</h2>
              <p>Follow people whose taste you trust. Their reviews, visits and want-to-go lists show up here, and their favorite places light up on the map.</p>
              <button className="btn btn-green" onClick={() => openAuth("Sign in to follow friends. It takes a few seconds, no password.")}>
                Sign in to follow people
              </button>
              <p className="fr-pitch-sub">Meanwhile, here&apos;s what members have been reviewing lately.</p>
            </section>
          )}
          {tab === "following" && user && following === 0 && (
            <section className="fr-pitch">
              <h2>Your feed fills up when you follow people</h2>
              <p>Start with someone below, or send a friend your page so they can follow you back.</p>
              <FindPeople inline onShare={me ? share : undefined} />
            </section>
          )}
          {popular.length > 0 && chip === "all" && (
            <section className="fr-popular" aria-label="Popular with people you follow">
              <h2 className="fr-sub">Popular with people you follow</h2>
              <div className="fr-pop-row">
                {popular.map((p) => (
                  <button key={p.spotId} type="button" className="fr-pop" onClick={() => onOpen(p.spotId)}>
                    <Thumb spot={spotById[p.spotId]} w={56} />
                    <span>
                      <b>{spotById[p.spotId].name}</b>
                      <span>{p.people} people</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
          {scope === "following" && (
            <div className="fr-chips" role="group" aria-label="Show">
              {CHIPS.map((c) => (
                <button key={c.id} type="button" className={`b-chip b-chip-sm ${chip === c.id ? "on" : ""}`} aria-pressed={chip === c.id} onClick={() => setChip(c.id)}>
                  {c.label}
                </button>
              ))}
            </div>
          )}
          {feed.items === null ? (
            <div className="skeleton-list">
              <span />
              <span />
              <span />
            </div>
          ) : feed.error ? (
            <p className="p-empty">{feed.error}</p>
          ) : groups.length === 0 ? (
            scope === "following" && following !== 0 ? (
              <p className="p-empty">{chip === "all" ? "Nothing new from the people you follow yet." : "Nothing like that yet. Try All."}</p>
            ) : scope === "everyone" ? (
              <p className="p-empty">No reviews yet. Be the first: open a place you&apos;ve been and write one.</p>
            ) : null
          ) : (
            <ul className="feed">
              {groups.map((g) => (
                <FeedItem key={g.key} g={g} review={g.type === "review" ? feed.reviews[g.item.reviewId!] : undefined} spotById={spotById} onOpen={onOpen} onReview={feed.patch} />
              ))}
            </ul>
          )}
          {feed.more && (
            <button type="button" className="textbtn fr-more" onClick={feed.loadMore} ref={feed.sentinel}>
              Show more
            </button>
          )}
        </>
      )}
    </div>
  );
}

/** a page of the feed at a time; the next loads when the end scrolls into view */
function useFeed(scope: "following" | "everyone", on: boolean) {
  const { backend, user } = useApp();
  const [items, setItems] = useState<Activity[] | null>(null);
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const sentinel = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!on) return;
    let live = true;
    setItems(null);
    setError(null);
    backend
      .feed(scope)
      .then((r) => {
        if (!live) return;
        setItems(r.items);
        setReviews(r.reviews);
        setMore(r.items.length >= 40);
      })
      .catch((e) => live && (setItems([]), setError(e instanceof Error ? e.message : "Couldn't load the feed.")));
    return () => {
      live = false;
    };
  }, [scope, on, backend, user?.id]);

  const loadMore = useCallback(async () => {
    if (busy.current || !items?.length) return;
    busy.current = true;
    const last = items[items.length - 1];
    try {
      const r = await backend.feed(scope, { at: last.at, id: last.id });
      setItems((cur) => [...(cur ?? []), ...r.items.filter((a) => !(cur ?? []).some((b) => b.id === a.id))]);
      setReviews((cur) => ({ ...cur, ...r.reviews }));
      setMore(r.items.length >= 40);
    } finally {
      busy.current = false;
    }
  }, [items, backend, scope]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !more) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && loadMore(), { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [more, loadMore]);

  const patch = useCallback((r: Review) => setReviews((cur) => ({ ...cur, [r.id]: r })), []);
  return { items, reviews, more, error, loadMore, sentinel, patch };
}

function FeedItem({
  g,
  review,
  spotById,
  onOpen,
  onReview,
}: {
  g: FeedGroup;
  review?: Review;
  spotById: Record<string, Spot>;
  onOpen: (id: string) => void;
  onReview: (r: Review) => void;
}) {
  if (g.type === "review" && review)
    return <FeedReviewCard actor={g.item.actor} at={g.item.at} r={review} spot={spotById[review.spotId]} onOpen={onOpen} onReview={onReview} />;
  if (g.type === "review") return null;
  const actor = g.actor;
  const places = g.items.map((a) => a.spotId && spotById[a.spotId]).filter((s): s is Spot => !!s);
  const PlaceBtn = ({ s }: { s: Spot }) => (
    <button type="button" className="fd-place" onClick={() => onOpen(s.id)}>
      {s.name}
    </button>
  );
  return (
    <li className={`fd fd-${g.type}`}>
      <Avatar m={actor} size={32} />
      <div className="fd-main">
        <p className="fd-line">
          <NameLink m={actor} />{" "}
          {g.type === "been" ? (
            places.length === 1 ? (
              <>
                went to <PlaceBtn s={places[0]} />
                {g.items[0].verdict && <span className={`fd-verdict v-${g.items[0].verdict}`}> · {VERDICT_WORDS[g.items[0].verdict]}</span>}
              </>
            ) : (
              <>went to {places.length} places</>
            )
          ) : g.type === "save" ? (
            places.length === 1 ? (
              <>
                wants to try <PlaceBtn s={places[0]} />
              </>
            ) : (
              <>wants to try {places.length} places</>
            )
          ) : (
            <>
              followed{" "}
              {g.items.slice(0, 2).map((a, i) => (
                <span key={a.id}>
                  {i > 0 && (g.items.length === 2 ? " and " : ", ")}
                  {a.target && <NameLink m={a.target} />}
                </span>
              ))}
              {g.items.length > 2 && <> and {g.items.length - 2} more</>}
            </>
          )}
          <span className="fd-time"> · {timeAgo(g.at)}</span>
        </p>
        {places.length > 1 && (
          <p className="fd-places">
            {places.slice(0, 8).map((s, i) => (
              <button key={s.id} type="button" className="b-chip b-chip-sm" onClick={() => onOpen(s.id)}>
                {s.name}
                {g.type === "been" && g.items[i]?.verdict === "loved" && " ♥"}
              </button>
            ))}
            {places.length > 8 && <span className="fd-time">+{places.length - 8} more</span>}
          </p>
        )}
        {g.type === "been" && places.length === 1 && <PlaceMini s={places[0]} onOpen={onOpen} />}
      </div>
    </li>
  );
}

function PlaceMini({ s, onOpen }: { s: Spot; onOpen: (id: string) => void }) {
  return (
    <button type="button" className="fd-mini" onClick={() => onOpen(s.id)}>
      <Thumb spot={s} w={48} />
      <span>
        <b>{s.name}</b>
        <span>
          {GENRE_BY_ID[s.genres[0]]?.label} · {areaLabelOf(s)}
        </span>
      </span>
    </button>
  );
}

/** a review in a list: in the feed (who reviewed what), or on someone's page ("plain": the place leads) */
export function FeedReviewCard({
  actor,
  at,
  r,
  spot,
  onOpen,
  onReview,
  plain,
}: {
  actor: MemberLite;
  at: string;
  r: Review;
  spot?: Spot;
  onOpen: (id: string) => void;
  onReview: (r: Review) => void;
  plain?: boolean;
}) {
  const { backend, user, requireAuth, toast, saveSpot, saved } = useApp();
  const [thread, setThread] = useState<null | "inline" | "sheet">(null);
  const [full, setFull] = useState(false);
  if (!spot) return null;

  async function react(kind: Reaction) {
    if (!requireAuth("Sign in to react to reviews. It takes a few seconds, no password.")) return;
    const on = !r.myReactions?.includes(kind);
    const reactions = { ...(r.reactions ?? {}), [kind]: Math.max(0, (r.reactions?.[kind] ?? 0) + (on ? 1 : -1)) };
    const myReactions = on ? [...(r.myReactions ?? []), kind] : (r.myReactions ?? []).filter((k) => k !== kind);
    onReview({ ...r, reactions, myReactions });
    if (kind === "want" && on && !saved.includes(spot!.id)) saveSpot(spot!.id, true);
    try {
      await backend.react(r.id, kind, on);
      track("react", { kind, on, from: "feed" });
    } catch (e) {
      onReview(r);
      toast(e instanceof Error ? e.message : "Couldn't save that. Try again?", "err");
    }
  }

  return (
    <li className={`fd fd-review ${plain ? "plain" : ""}`}>
      {!plain && <Avatar m={actor} size={32} />}
      <div className="fd-main">
        {!plain && (
          <p className="fd-line">
            <NameLink m={actor} /> reviewed{" "}
            <button type="button" className="fd-place" onClick={() => onOpen(spot.id)}>
              {spot.name}
            </button>
            <span className="fd-time"> · {timeAgo(at)}</span>
          </p>
        )}
        <div className="fd-card">
          <PlaceMini s={spot} onOpen={onOpen} />
          <div className="rv-top">
            <Stars value={r.rating} size={13} />
            <b className="rv-label">{RATING_WORDS[r.rating]?.short}</b>
            {typeof r.goBack === "boolean" && <span className={r.goBack ? "rv-go go-yes" : "rv-go go-no"}>{r.goBack ? "Would go back" : "Wouldn't go back"}</span>}
          </div>
          {!!r.ordered?.length && (
            <p className="rv-got">
              <span className="cl">Got</span> {r.ordered.join(" · ")}
            </p>
          )}
          <p className={`rv-body ${full ? "" : "clamp"}`} onClick={() => setFull(true)}>
            {r.body}
          </p>
          <ReviewActions
            r={r}
            mine={r.userId === user?.id}
            thread={thread}
            onReact={react}
            onThread={() => setThread((t) => (t ? null : window.matchMedia("(max-width: 900px)").matches ? "sheet" : "inline"))}
          />
          <AnimatePresence initial={false}>
            {thread === "inline" && <ReviewThread key="t" review={r} onClose={() => setThread(null)} onCount={(n) => n !== r.comments && onReview({ ...r, comments: n })} />}
          </AnimatePresence>
          {thread === "sheet" && <ReviewThread review={r} sheet onClose={() => setThread(null)} onCount={(n) => n !== r.comments && onReview({ ...r, comments: n })} />}
        </div>
      </div>
    </li>
  );
}

/** search by name or @name; with nothing typed, people worth following and a link to share */
function FindPeople({ inline, onShare }: { inline?: boolean; onShare?: () => void }) {
  const { backend, user } = useApp();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Person[] | null>(null);
  const [suggest, setSuggest] = useState<Person[] | null>(null);
  const box = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!inline) box.current?.focus();
    backend.suggestedMembers().then(setSuggest, () => setSuggest([]));
  }, [backend, user?.id, inline]);
  useEffect(() => {
    const t = q.trim();
    if (t.replace(/^@/, "").length < 2) return setHits(null);
    let live = true;
    const h = window.setTimeout(() => {
      backend
        .searchMembers(t)
        .then((r) => live && setHits(r))
        .catch(() => live && setHits([]));
      track("member_search");
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(h);
    };
  }, [q, backend]);

  const body = (
    <>
      {!inline && (
        <label className="fp-search">
          <span className="sr-only">Search people</span>
          <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden>
            <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.9" />
            <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
          </svg>
          <input ref={box} type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or @name" autoComplete="off" enterKeyHint="search" />
        </label>
      )}
      {hits ? (
        hits.length ? (
          <ul className="people">
            {hits.map((p) => (
              <PersonRow key={p.id} p={p} />
            ))}
          </ul>
        ) : (
          <p className="p-empty">Nobody by that name yet. Invite them: send your page.</p>
        )
      ) : (
        <>
          {suggest && suggest.length > 0 && (
            <>
              <h3 className="fr-sub">People to follow</h3>
              <ul className="people">
                {suggest.slice(0, inline ? 5 : 12).map((p) => (
                  <PersonRow key={p.id} p={p} />
                ))}
              </ul>
            </>
          )}
          {suggest && suggest.length === 0 && <p className="p-empty">No one to suggest yet. As members write reviews they&apos;ll show up here.</p>}
        </>
      )}
      {onShare && (
        <p className="fp-invite">
          <button type="button" className="btn btn-line btn-sm" onClick={onShare}>
            Share your page
          </button>
          <span>Friends who open it can follow you in one tap.</span>
        </p>
      )}
    </>
  );
  if (inline) return <div className="find-people inline">{body}</div>;
  return (
    <motion.section className="find-people" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
      {body}
    </motion.section>
  );
}

/** what happened to me: requests first, then follows, comments, reactions and gift notes, folded by day */
function ActivityTab({ spotById, onOpen, onSeen }: { spotById: Record<string, Spot>; onOpen: (id: string) => void; onSeen: () => void }) {
  const { backend, user, nav, toast } = useApp();
  const [notes, setNotes] = useState<NoteGroup[] | null>(null);
  const [requests, setRequests] = useState<(MemberLite & { at: string })[]>([]);

  useEffect(() => {
    if (!user) return;
    let live = true;
    Promise.all([backend.notes(), backend.requests()])
      .then(async ([n, r]) => {
        if (!live) return;
        setNotes(groupNotes(n.filter((x) => x.kind !== "request")));
        setRequests(r);
        if (n.some((x) => !x.read)) {
          await backend.markRead();
          onSeen();
        }
      })
      .catch(() => live && setNotes([]));
    return () => {
      live = false;
    };
  }, [backend, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function answer(m: MemberLite, accept: boolean) {
    try {
      await backend.answerRequest(m.id, accept);
      setRequests((r) => r.filter((x) => x.id !== m.id));
      toast(accept ? `${m.name} can see your page now.` : "Request declined. They won't be told.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't do that.", "err");
    }
  }

  function open(g: NoteGroup) {
    if (g.kind === "follow" || g.kind === "accepted") return g.actors[0] && nav.member(g.actors[0].handle);
    const sp = g.notes[0].spotId;
    if (sp && spotById[sp]) onOpen(sp);
  }

  return (
    <section className="activity">
      {requests.length > 0 && (
        <>
          <h2 className="fr-sub">
            {requests.length} {requests.length === 1 ? "person wants" : "people want"} to follow you
          </h2>
          <ul className="people">
            {requests.map((m) => (
              <li key={m.id} className="person">
                <Avatar m={m} size={40} />
                <span className="person-main">
                  <NameLink m={m} className="person-name" />
                  <span className="person-sub">@{m.handle} · asked {timeAgo(m.at)}</span>
                </span>
                <span className="req-act">
                  <button type="button" className="follow-btn sm none" onClick={() => answer(m, true)}>
                    Accept
                  </button>
                  <button type="button" className="textbtn" onClick={() => answer(m, false)}>
                    Decline
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {notes === null ? (
        <div className="skeleton-list">
          <span />
          <span />
        </div>
      ) : notes.length === 0 ? (
        <p className="p-empty">Nothing yet. When someone follows you, comments on a review or finds it helpful, it shows up here.</p>
      ) : (
        <ul className="notes">
          {notes.map((g) => {
            const place = g.notes[0].spotId ? spotById[g.notes[0].spotId]?.name : undefined;
            return (
              <li key={g.key} className={`note ${g.read ? "" : "unread"}`}>
                <button type="button" className="note-hit" onClick={() => open(g)}>
                  <span className="av-stack">
                    {g.actors.slice(0, 3).map((a) => (
                      <Avatar key={a.id} m={a} size={30} />
                    ))}
                  </span>
                  <span className="note-text">
                    <b>{whoList(g.actors)}</b> {noteLine(g, place)}
                    {(g.kind === "comment" || g.kind === "reply" || g.kind === "mention") && g.notes[0].detail && <span className="note-quote">“{g.notes[0].detail}”</span>}
                    {g.kind === "gift" && g.notes[0].detail && <span className="note-quote">“{g.notes[0].detail}”</span>}
                    <span className="note-time">{timeAgo(g.at)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
