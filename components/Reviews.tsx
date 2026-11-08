"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { track } from "@/lib/analytics";
import { REVIEW_PHOTOS_MAX, type Photo as MemberPhoto, type Review } from "@/lib/backend";
import { spotIdsOf, type Spot } from "@/lib/data";
import {
  AVG_MIN,
  ORDER_LEN,
  ORDER_MAX,
  RATING_WORDS,
  REPORT_REASONS,
  REVIEW_MAX,
  SORTS,
  checkDraft,
  cleanDish,
  featured,
  monthLabel,
  oneParagraph,
  sortReviews,
  summarize,
  verdictFor,
  visitMonths,
  wordFor,
  type ReviewDraft,
  type ReviewSort,
} from "@/lib/reviews";
import { VERDICT_SCORE, whoList, type FriendAt, type Reaction } from "@/lib/social";
import { feel } from "@/lib/native";
import { useApp } from "./Providers";
import { ReviewActions, ReviewFacts } from "./ReviewActions";
export { ReviewActions };
import { Stars } from "./Stars";
import { Avatar, NameLink } from "./People";
import ReviewThread from "./ReviewThread";
import { ReviewPhotos } from "./Lightbox";

/** dish-like bits of our one-line "known for" ("Pulled pork & cheese biscuits"), to tap instead of type */
const dishesIn = (known: string) =>
  known
    .split(/\s*(?:&|,| and | or )\s*/)
    .map(cleanDish)
    .filter((x) => x.split(" ").length <= 4 && !/^(where|the first|the original|since|weekday|records|from|what|same)\b/i.test(x));
const blank = (): ReviewDraft => ({ rating: 0, goBack: null, body: "", ordered: [], visited: visitMonths()[0].id, goodFor: [], sub: {}, affirmed: false });

/**
 * Reviews, near the top of every place: the score in words, how many would go back, what
 * people order, then the two most useful reviews. Everything else is one tap away, sorted the
 * way you want. Members write one review per place, one paragraph, and can edit it any time.
 */
export default function Reviews({ spot, openSignal = 0 }: { spot: Spot; /** bump to open the form (the Review button up top) */ openSignal?: number }) {
  const { backend, user, requireAuth, toast, been, markBeen, saveSpot, saved, nav } = useApp();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [friends, setFriends] = useState<FriendAt[]>([]);
  const [writing, setWriting] = useState(false);
  const [all, setAll] = useState(false);
  const [sort, setSort] = useState<ReviewSort>("helpful");
  const [stars, setStars] = useState<number | null>(null);
  const top = useRef<HTMLElement>(null);

  useEffect(() => {
    let live = true;
    setReviews(null);
    setWriting(false);
    setAll(false);
    setStars(null);
    backend
      .listReviews(spotIdsOf(spot.id))
      .then((r) => live && setReviews(r))
      .catch(() => live && setReviews([]));
    setFriends([]);
    if (user)
      backend
        .friendsAt(spotIdsOf(spot.id))
        .then((f) => live && setFriends(f))
        .catch(() => {});
    return () => {
      live = false;
    };
  }, [spot.id, backend, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => reviews ?? [], [reviews]);
  // what counts is what everyone can see; a held review shows only to the person who wrote it
  const counted = useMemo(() => list.filter((r) => r.status !== "held"), [list]);
  const sum = useMemo(() => summarize(counted), [counted]);
  const mine = list.find((r) => r.userId === user?.id);

  // the people you follow, first: their reviews lead, and the row up top says who's been
  const friendIds = useMemo(() => new Set(friends.map((f) => f.member.id)), [friends]);
  const friendsBeen = useMemo(() => friends.filter((f) => f.rating || f.verdict), [friends]);
  const friendsWant = useMemo(() => friends.filter((f) => !f.rating && !f.verdict && f.saved), [friends]);
  const friendScores = friendsBeen.map((f) => f.rating ?? VERDICT_SCORE[f.verdict!]);
  const shown = useMemo(() => {
    const theirs = counted.filter((r) => friendIds.has(r.userId));
    if (!all) {
      const top = featured(counted).filter((r) => !friendIds.has(r.userId));
      return [...sortReviews(theirs, "newest").slice(0, 2), ...top].slice(0, Math.max(2, Math.min(3, theirs.length + 2)));
    }
    const list = sortReviews(stars ? counted.filter((r) => r.rating === stars) : counted, sort);
    return sort === "helpful" ? [...list.filter((r) => friendIds.has(r.userId)), ...list.filter((r) => !friendIds.has(r.userId))] : list;
  }, [all, counted, sort, stars, friendIds]);

  function open() {
    if (!requireAuth(`Sign in to review ${spot.name}. It takes a few seconds, no password.`, open)) return;
    setWriting(true);
  }
  useEffect(() => {
    if (!openSignal) return;
    open();
    // after the form starts to open, bring the section up under the top bar
    const t = window.setTimeout(() => {
      const el = top.current;
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 76, behavior: "smooth" });
    }, 80);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSignal]);
  async function onPosted(r: Review, draft: ReviewDraft) {
    setReviews((cur) => [r, ...(cur ?? []).filter((x) => x.userId !== r.userId)]);
    setWriting(false);
    toast(mine ? "Review updated." : "Posted. Thanks for writing it up.", "ok");
    track("review", { id: spot.id, rating: r.rating });
    // a review means you've been: stamp the passport, unless you already chose how it went
    if (!been[spot.id]) markBeen(spot.id, verdictFor(draft.rating, draft.goBack));
    top.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  async function remove(id: string) {
    try {
      await backend.deleteReview(id);
      setReviews((cur) => (cur ?? []).filter((r) => r.id !== id));
      toast("Review deleted.");
    } catch {
      toast("Couldn't delete it. Try again?", "err");
    }
  }

  /** a like (the helpful vote) or a save (which also saves the place); shows at once, undone if it doesn't save */
  async function react(r: Review, kind: Reaction) {
    if (!requireAuth("Sign in to react to reviews. It takes a few seconds, no password.")) return;
    const on = !r.myReactions?.includes(kind);
    const bump = (x: Review, d: number): Review => {
      const reactions = { ...(x.reactions ?? {}), [kind]: Math.max(0, (x.reactions?.[kind] ?? 0) + d) };
      const myReactions = d > 0 ? [...(x.myReactions ?? []), kind] : (x.myReactions ?? []).filter((k) => k !== kind);
      return { ...x, reactions, myReactions, helpful: reactions.helpful ?? 0, votedHelpful: myReactions.includes("helpful") };
    };
    setReviews((cur) => (cur ?? []).map((x) => (x.id === r.id ? bump(x, on ? 1 : -1) : x)));
    if (on) feel();
    if (kind === "want" && on && !saved.includes(spot.id)) saveSpot(spot.id, true);
    try {
      await backend.react(r.id, kind, on);
      track("react", { kind, on });
    } catch (e) {
      setReviews((cur) => (cur ?? []).map((x) => (x.id === r.id ? r : x)));
      toast(e instanceof Error ? e.message : "Couldn't save that. Try again?", "err");
    }
  }
  const setCount = (id: string, n: number) => setReviews((cur) => (cur ?? []).map((x) => (x.id === id && x.comments !== n ? { ...x, comments: n } : x)));

  const n = sum.count;
  return (
    <section className="rv" ref={top} id="reviews" aria-labelledby="rv-title">
      <div className="rv-head">
        <h2 id="rv-title">Reviews</h2>
        {!writing && (
          <button type="button" className="btn btn-green rv-write" onClick={open}>
            {mine ? "Edit your review" : "Write a review"}
          </button>
        )}
      </div>

      {(friendsBeen.length > 0 || friendsWant.length > 0) && (
        <div className="rv-friends">
          <span className="av-stack">
            {[...friendsBeen, ...friendsWant].slice(0, 4).map((f) => (
              <button key={f.member.id} type="button" className="av-btn" onClick={() => nav.member(f.member.handle)} aria-label={`${f.member.name}'s page`}>
                <Avatar m={f.member} size={26} />
              </button>
            ))}
          </span>
          <span className="rv-friends-t">
            {friendsBeen.length > 0 ? (
              <>
                <b>{whoList(friendsBeen.map((f) => f.member))}</b> {friendsBeen.length === 1 ? "has" : "have"} been
                {friendScores.length >= 2 && (
                  <>
                    {" · "}friends&apos; average <b>{(friendScores.reduce((a, b) => a + b, 0) / friendScores.length).toFixed(1)}</b>
                  </>
                )}
                {friendsWant.length > 0 && <> · {friendsWant.length} more want to go</>}
              </>
            ) : (
              <>
                <b>{whoList(friendsWant.map((f) => f.member))}</b> {friendsWant.length === 1 ? "wants" : "want"} to go
              </>
            )}
          </span>
        </div>
      )}

      {reviews === null ? (
        <div className="skeleton-list">
          <span />
          <span />
        </div>
      ) : n === 0 ? (
        !writing && <p className="rv-empty">No reviews yet. If you&apos;ve been, yours is the first one people read.</p>
      ) : (
        <div className="rv-sum">
          <div className="rv-score">
            {n >= AVG_MIN ? (
              <>
                <span className="rv-n">{sum.avg.toFixed(1)}</span>
                <span className="rv-word">
                  <b>{wordFor(sum.avg)}</b>
                  <span>
                    {n} reviews
                    {sum.goBack !== null && (
                      <>
                        {" · "}
                        <b className={sum.goBack >= 80 ? "go-yes" : sum.goBack < 50 ? "go-no" : ""}>{sum.goBack}%</b> would go back
                      </>
                    )}
                  </span>
                </span>
              </>
            ) : (
              <span className="rv-word">
                <b>
                  {n} {n === 1 ? "review" : "reviews"} so far
                </b>
              </span>
            )}
          </div>
          {sum.orders.length > 0 && (
            <p className="rv-most">
              <span>People order</span> {sum.orders.slice(0, 4).map((o) => o.name).join(" · ")}
            </p>
          )}
        </div>
      )}

      <AnimatePresence initial={false}>
        {writing && (
          <ReviewForm
            key="form"
            spot={spot}
            mine={mine}
            suggestions={[...sum.orders.map((o) => o.name), ...dishesIn(spot.knownFor)]}
            onCancel={() => setWriting(false)}
            onPosted={onPosted}
          />
        )}
      </AnimatePresence>

      {mine?.status === "held" && (
        <p className="rv-held">Your review was reported and is waiting for a person to check it. Until then only you can see it.</p>
      )}

      {all && n > 0 && (
        <div className="rv-tools">
          <label>
            <span className="sr-only">Sort reviews</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as ReviewSort)}>
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          {stars && (
            <button type="button" className="b-chip b-chip-sm on" onClick={() => setStars(null)}>
              {stars} only ×
            </button>
          )}
        </div>
      )}

      {shown.length > 0 && (
        <ul className="rv-list">
          {(mine && !all && !shown.some((r) => r.id === mine.id) ? [mine, ...shown] : shown).map((r) => (
            <ReviewCard
              key={r.id}
              r={r}
              spot={spot}
              mine={r.userId === user?.id}
              friend={friendIds.has(r.userId)}
              onEdit={open}
              onDelete={() => remove(r.id)}
              onReact={(k) => react(r, k)}
              onCount={(n) => setCount(r.id, n)}
            />
          ))}
        </ul>
      )}

      {n > 2 && (
        <button type="button" className="textbtn rv-more" onClick={() => (setAll((v) => !v), setStars(null))}>
          {all ? "Show fewer" : `See all ${n} reviews`}
        </button>
      )}
      <p className="rv-rules">
        One review per member, from a visit of their own. Nobody can pay to change a review or its place in line. <Link href="/about#reviews">Review rules</Link>
      </p>
    </section>
  );
}

function ReviewCard({
  r,
  spot,
  mine,
  friend,
  onEdit,
  onDelete,
  onReact,
  onCount,
}: {
  r: Review;
  spot: Spot;
  mine: boolean;
  friend?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onReact: (k: Reaction) => void;
  onCount: (n: number) => void;
}) {
  const { backend, requireAuth, toast } = useApp();
  const [thread, setThread] = useState<null | "inline" | "sheet">(null);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const [reported, setReported] = useState(false);

  async function report(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return;
    try {
      await backend.reportReview(r.id, reason);
      setReported(true);
      setReporting(false);
      toast("Thanks. A person will look at it.", "ok");
    } catch {
      toast("Couldn't send that. Try again?", "err");
    }
  }

  return (
    <motion.li className="rv-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="rv-author">
        <Avatar m={{ id: r.userId, name: r.userName }} size={32} />
        <span className="rv-author-t">
          {r.handle ? <NameLink m={{ id: r.userId, handle: r.handle, name: r.userName }} /> : <b>{r.userName}</b>}
          <span>
            {friend && <span className="rv-friend">You follow · </span>}
            {r.reviewerCount && r.reviewerCount > 1 ? `${r.reviewerCount} reviews · ` : ""}
            {r.visited ? `went ${monthLabel(r.visited)}` : new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
            {r.updatedAt ? " · edited" : ""}
          </span>
        </span>
      </div>
      <div className="rv-top">
        <Stars value={r.rating} size={14} />
        <b className="rv-label">{RATING_WORDS[r.rating]?.short}</b>
      </div>
      <p className="rv-body">{r.body}</p>
      <ReviewPhotos photos={r.photos} spot={spot} />
      <ReviewFacts r={r} />
      <ReviewActions
        r={r}
        mine={mine}
        thread={thread}
        onReact={onReact}
        onThread={() => setThread((t) => (t ? null : window.matchMedia("(max-width: 900px)").matches ? "sheet" : "inline"))}
        menu={
          mine
            ? [
                { label: "Edit review", onClick: onEdit },
                { label: "Delete review", onClick: onDelete },
              ]
            : reported
              ? undefined
              : [{ label: "Report review", onClick: () => requireAuth("Sign in to report a review.") && setReporting(true) }]
        }
      />
      <AnimatePresence initial={false}>
        {thread === "inline" && <ReviewThread key="t" review={r} onClose={() => setThread(null)} onCount={onCount} />}
      </AnimatePresence>
      {thread === "sheet" && <ReviewThread review={r} sheet onClose={() => setThread(null)} onCount={onCount} />}
      {reporting && (
        <form className="rv-report-form" onSubmit={report}>
          <select value={reason} onChange={(e) => setReason(e.target.value)} required aria-label="What's wrong with it">
            <option value="">What&apos;s wrong with it?</option>
            {REPORT_REASONS.map((x) => (
              <option key={x.id} value={x.id}>
                {x.label}
              </option>
            ))}
          </select>
          <button className="btn btn-line" disabled={!reason}>
            Send
          </button>
        </form>
      )}
    </motion.li>
  );
}

function ReviewForm({
  spot,
  mine,
  suggestions,
  onCancel,
  onPosted,
}: {
  spot: Spot;
  mine?: Review;
  suggestions: string[];
  onCancel: () => void;
  onPosted: (r: Review, d: ReviewDraft) => void;
}) {
  const { backend, toast } = useApp();
  // an edit keeps everything it had, including details this form no longer asks for
  const [d, setD] = useState<ReviewDraft>(() =>
    mine
      ? {
          rating: mine.rating,
          goBack: typeof mine.goBack === "boolean" ? mine.goBack : null,
          body: mine.body,
          ordered: mine.ordered ?? [],
          visited: mine.visited ?? visitMonths()[0].id,
          goodFor: mine.goodFor ?? [],
          sub: mine.sub ?? {},
          affirmed: true,
        }
      : blank()
  );
  const [dish, setDish] = useState("");
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  // photos: the ones already on it (minus any taken off) and new ones, shown before they upload
  const [keep, setKeep] = useState<MemberPhoto[]>(mine?.photos ?? []);
  const [adds, setAdds] = useState<{ file: File; url: string }[]>([]);
  const picker = useRef<HTMLInputElement>(null);
  const room = REVIEW_PHOTOS_MAX - keep.length - adds.length;
  const set = <K extends keyof ReviewDraft>(k: K, v: ReviewDraft[K]) => setD((x) => ({ ...x, [k]: v }));
  const problem = checkDraft(d);
  const len = d.body.trim().length;
  const offer = Array.from(new Set(suggestions.map((x) => x.toLowerCase())))
    .map((k) => suggestions.find((x) => x.toLowerCase() === k)!)
    .filter((x) => x.length > 1 && !d.ordered.some((o) => o.toLowerCase() === x.toLowerCase()))
    .slice(0, 4);

  useEffect(() => () => adds.forEach((a) => URL.revokeObjectURL(a.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  function pick(files: FileList | null) {
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
    if (list.length > room) toast(`A review can have ${REVIEW_PHOTOS_MAX} photos.`);
    setAdds((x) => [...x, ...list.slice(0, Math.max(0, room)).map((file) => ({ file, url: URL.createObjectURL(file) }))]);
    if (picker.current) picker.current.value = "";
  }

  function addDish(name: string) {
    const v = cleanDish(name);
    if (!v || d.ordered.length >= ORDER_MAX || d.ordered.some((o) => o.toLowerCase() === v.toLowerCase())) return;
    set("ordered", [...d.ordered, v]);
    setDish("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    // a dish typed but not added yet still counts
    const draft = dish.trim() && d.ordered.length < ORDER_MAX ? { ...d, ordered: [...d.ordered, cleanDish(dish)] } : d;
    const why = checkDraft(draft);
    if (why) return toast(why, "err");
    setBusy(true);
    try {
      const r = await backend.addReview(spot.id, {
        rating: draft.rating,
        body: oneParagraph(draft.body).trim(),
        goBack: draft.goBack,
        visited: draft.visited,
        ordered: draft.ordered,
        goodFor: draft.goodFor,
        sub: draft.sub,
      });
      // then the photos: off the ones taken away, up with the new ones; the review stands either way
      const dropped = (mine?.photos ?? []).filter((p) => !keep.some((k) => k.id === p.id));
      await Promise.all(dropped.map((p) => backend.deletePhoto(p).catch(() => {})));
      const up: MemberPhoto[] = [];
      let missed = 0;
      for (const a of adds) {
        try {
          up.push(await backend.addPhoto(spot.id, a.file, "food", undefined, r.id));
        } catch {
          missed++;
        }
      }
      if (missed) toast(missed === adds.length ? "Your review is up, but the photos didn't upload. Try adding them again." : "Your review is up, but one photo didn't upload.", "err");
      if (up.length) track("review_photos", { id: spot.id, n: up.length });
      const photos = [...keep, ...up];
      onPosted({ ...r, ...(photos.length ? { photos } : { photos: undefined }) }, draft);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't post that review.", "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.form className="rv-form rv-form-simple" onSubmit={submit} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
      <div className="rv-stars-pick" role="radiogroup" aria-label="Your score">
        {[1, 2, 3, 4, 5].map((v) => (
          <button key={v} type="button" role="radio" aria-checked={d.rating === v} aria-label={`${v}: ${RATING_WORDS[v].short}`} className={d.rating >= v ? "on" : ""} onClick={() => set("rating", v)}>
            <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden>
              <path d="M12 2.8l2.8 6 6.6.8-4.9 4.5 1.3 6.5L12 17.3l-5.8 3.3 1.3-6.5L2.6 9.6l6.6-.8z" />
            </svg>
          </button>
        ))}
        <span className="rv-stars-word">{d.rating ? RATING_WORDS[d.rating].short : "Tap to score"}</span>
      </div>

      <textarea
        className="rv-text"
        value={d.body}
        onChange={(e) => set("body", oneParagraph(e.target.value).slice(0, REVIEW_MAX))}
        placeholder={`How was ${spot.name}? What should a friend order?`}
        rows={4}
        maxLength={REVIEW_MAX}
        aria-label="Your review"
      />
      {len > REVIEW_MAX - 80 && <p className="rv-count">{REVIEW_MAX - len} left</p>}

      <div className="rv-dishes" aria-label="What you got">
        {d.ordered.map((o) => (
          <button key={o} type="button" className="rv-chip on" onClick={() => set("ordered", d.ordered.filter((x) => x !== o))} aria-label={`Remove ${o}`}>
            {o} ×
          </button>
        ))}
        {d.ordered.length < ORDER_MAX && (
          <input
            value={dish}
            onChange={(e) => setDish(e.target.value.slice(0, ORDER_LEN))}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addDish(dish);
              }
            }}
            onBlur={() => dish.trim() && addDish(dish)}
            placeholder={d.ordered.length ? "Anything else?" : "What did you get? (optional)"}
            aria-label="Something you got"
            maxLength={ORDER_LEN}
          />
        )}
      </div>
      {offer.length > 0 && d.ordered.length < ORDER_MAX && !d.ordered.length && (
        <div className="rv-offer">
          {offer.map((o) => (
            <button key={o} type="button" className="rv-chip" onClick={() => addDish(o)}>
              + {o}
            </button>
          ))}
        </div>
      )}

      <div className="rv-row">
        <span className="rv-lab">Go back?</span>
        <div className="seg rv-seg rv-seg-sm">
          <button type="button" className={d.goBack === true ? "on" : ""} aria-pressed={d.goBack === true} onClick={() => set("goBack", d.goBack === true ? null : true)}>
            Yes
          </button>
          <button type="button" className={d.goBack === false ? "on" : ""} aria-pressed={d.goBack === false} onClick={() => set("goBack", d.goBack === false ? null : false)}>
            No
          </button>
        </div>
        <span className="rv-row-gap" />
        <button type="button" className="rv-photo-btn" onClick={() => picker.current?.click()} disabled={room <= 0}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
            <path d="M4 8h3l1.5-2h7L17 8h3v11H4V8Z M12 16.5a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          </svg>
          Photo
        </button>
        <input ref={picker} type="file" accept="image/*" multiple hidden onChange={(e) => pick(e.target.files)} />
      </div>

      {(keep.length > 0 || adds.length > 0) && (
        <div className="rv-pick">
          {keep.map((p) => (
            <span key={p.id} className="rv-pic">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" />
              <button type="button" className="rv-pic-x" onClick={() => setKeep((x) => x.filter((k) => k.id !== p.id))} aria-label="Take this photo off">
                ×
              </button>
            </span>
          ))}
          {adds.map((a) => (
            <span key={a.url} className="rv-pic">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.url} alt="" />
              <button
                type="button"
                className="rv-pic-x"
                onClick={() => {
                  URL.revokeObjectURL(a.url);
                  setAdds((x) => x.filter((y) => y.url !== a.url));
                }}
                aria-label="Take this photo off"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {tried && problem && <p className="form-err">{problem}</p>}
      <div className="row between rv-foot">
        <button type="button" className="textbtn" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-green" disabled={busy}>
          {busy ? "Posting…" : mine ? "Save" : "Post"}
        </button>
      </div>
      <p className="rv-fine">By posting, you&apos;re saying you went yourself and have no tie to {spot.name}.</p>
    </motion.form>
  );
}
