"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { track } from "@/lib/analytics";
import type { Review } from "@/lib/backend";
import { GENRE_BY_ID, areaLabelOf, type Spot } from "@/lib/data";
import { RATING_WORDS } from "@/lib/reviews";
import { timeAgo, type Activity, type MemberLite, type Reaction } from "@/lib/social";
import { feel } from "@/lib/native";
import { Thumb } from "./Photo";
import { ReviewPhotos } from "./Lightbox";
import { Avatar, NameLink } from "./People";
import { useApp } from "./Providers";
import { ReviewActions } from "./ReviewActions";
import { Stars } from "./Stars";

/* the comments only download when someone opens them */
const ReviewThread = dynamic(() => import("./ReviewThread"), { ssr: false });

/** a page of the feed at a time; the next loads when the end scrolls into view */
export function useFeed(scope: "following" | "everyone", on: boolean) {
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
    if (on) feel();
    if (kind === "want" && on && !saved.includes(spot!.id)) saveSpot(spot!.id, true);
    try {
      await backend.react(r.id, kind, on);
      track("react", { kind, on, from: "feed" });
    } catch (e) {
      onReview(r);
      toast(e instanceof Error ? e.message : "Couldn't save that. Try again?", "err");
    }
  }

  const photos = r.photos ?? [];
  return (
    <li className={`post ${plain ? "plain" : ""}`}>
      {!plain && (
        <header className="post-head">
          <Avatar m={actor} size={36} />
          <p className="post-who">
            <NameLink m={actor} />
            <span className="post-when">
              {actor.handle ? `@${actor.handle} · ` : ""}
              {timeAgo(at)}
            </span>
          </p>
        </header>
      )}
      <button type="button" className="post-place" onClick={() => onOpen(spot.id)}>
        <Thumb spot={spot} w={44} />
        <span className="post-place-t">
          <b>{spot.name}</b>
          <span>
            {GENRE_BY_ID[spot.genres[0]]?.short} · {areaLabelOf(spot)}
          </span>
        </span>
        <span className="post-score" aria-label={`${r.rating} out of 5, ${RATING_WORDS[r.rating]?.short}`}>
          <Stars value={r.rating} size={13} />
          <span>{RATING_WORDS[r.rating]?.short}</span>
        </span>
      </button>
      {photos.length > 0 && <ReviewPhotos photos={photos} spot={spot} />}
      <p className={`post-body ${full ? "" : "clamp"}`} onClick={() => setFull(true)}>
        {r.body}
      </p>
      {(!!r.ordered?.length || typeof r.goBack === "boolean") && (
        <p className="post-tags">
          {typeof r.goBack === "boolean" && <span className={r.goBack ? "go-yes" : "go-no"}>{r.goBack ? "Would go back" : "Wouldn't go back"}</span>}
          {r.ordered?.map((o) => (
            <span key={o}>{o}</span>
          ))}
        </p>
      )}
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
    </li>
  );
}

