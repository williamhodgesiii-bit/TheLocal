"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { track } from "@/lib/analytics";
import type { Review } from "@/lib/backend";
import { spotIdsOf, type Spot } from "@/lib/data";
import {
  AVG_MIN,
  GOOD_FOR,
  GOOD_FOR_LABEL,
  GOOD_FOR_MAX,
  ORDER_LEN,
  ORDER_MAX,
  RATING_WORDS,
  REPORT_REASONS,
  REVIEW_MAX,
  REVIEW_MIN,
  SORTS,
  checkDraft,
  cleanDish,
  featured,
  monthLabel,
  oneParagraph,
  sortReviews,
  subLabels,
  summarize,
  verdictFor,
  visitMonths,
  wordFor,
  type ReviewDraft,
  type ReviewSort,
  type SubKey,
} from "@/lib/reviews";
import { REACTIONS, VERDICT_SCORE, whoList, type FriendAt, type Reaction } from "@/lib/social";
import { feel } from "@/lib/native";
import { useApp } from "./Providers";
import { Stars } from "./Stars";
import { Avatar, NameLink } from "./People";
import ReviewThread from "./ReviewThread";

const SUBS: SubKey[] = ["taste", "service", "vibe"];
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
export default function Reviews({ spot }: { spot: Spot }) {
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
  const labels = subLabels(spot);

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
  function filterStars(n: number) {
    setStars((cur) => (cur === n ? null : n));
    setAll(true);
    setSort("helpful");
  }

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

  /** Helpful, Want to go (which also saves the place) or Thanks; shows at once, undone if it doesn't save */
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
                  {sum.recent && (
                    <span className="rv-recent">
                      Last 12 months: {sum.recent.avg.toFixed(1)} from {sum.recent.count}
                    </span>
                  )}
                </span>
              </>
            ) : (
              <span className="rv-word">
                <b>
                  {n} {n === 1 ? "review" : "reviews"} so far
                </b>
                <span>An average shows once there are {AVG_MIN}.</span>
              </span>
            )}
          </div>
          {n >= AVG_MIN && (
            <div className="rv-bars" role="group" aria-label="Filter by score">
              {sum.dist.map((c, i) => {
                const v = 5 - i;
                return (
                  <button type="button" key={v} className={`rv-bar ${stars === v ? "on" : ""}`} onClick={() => filterStars(v)} aria-pressed={stars === v} disabled={!c}>
                    <span className="rv-bar-k">{v}</span>
                    <span className="rv-bar-t">
                      <motion.span initial={{ width: 0 }} animate={{ width: `${(c / n) * 100}%` }} transition={{ delay: 0.05 * i }} />
                    </span>
                    <span className="rv-bar-c">{c}</span>
                  </button>
                );
              })}
            </div>
          )}
          {Object.keys(sum.subs).length > 0 && (
            <p className="rv-subs">
              {SUBS.filter((k) => sum.subs[k]).map((k) => (
                <span key={k}>
                  {labels[k]} <b>{sum.subs[k]!.avg.toFixed(1)}</b>
                </span>
              ))}
            </p>
          )}
          {sum.orders.length > 0 && (
            <div className="rv-chips">
              <span className="cl">People got</span>
              {sum.orders.map((o) => (
                <span key={o.name} className="rv-chip">
                  {o.name}
                  {o.n > 1 && <span className="rv-chip-n">{o.n}</span>}
                </span>
              ))}
            </div>
          )}
          {sum.goodFor.length > 0 && (
            <div className="rv-chips">
              <span className="cl">Good for</span>
              {sum.goodFor.map((g) => (
                <span key={g.id} className="rv-chip">
                  {g.label}
                  {g.n > 1 && <span className="rv-chip-n">{g.n}</span>}
                </span>
              ))}
            </div>
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
              labels={labels}
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
  labels,
  mine,
  friend,
  onEdit,
  onDelete,
  onReact,
  onCount,
}: {
  r: Review;
  labels: Record<SubKey, string>;
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
  const subs = SUBS.filter((k) => r.sub?.[k]);

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
      <p className="rv-body">{r.body}</p>
      {(subs.length > 0 || !!r.goodFor?.length) && (
        <p className="rv-extra">
          {subs.map((k) => (
            <span key={k}>
              {labels[k]} {r.sub![k]}
            </span>
          ))}
          {r.goodFor?.map((g) => GOOD_FOR_LABEL[g] && <span key={g}>{GOOD_FOR_LABEL[g]}</span>)}
        </p>
      )}
      <div className="rv-sig">
        {r.handle ? (
          <NameLink m={{ id: r.userId, handle: r.handle, name: r.userName }} className="pen-sig" />
        ) : (
          <span className="pen-sig">{r.userName}</span>
        )}
        {friend && <span className="rv-friend">You follow</span>}
        {r.reviewerCount && r.reviewerCount > 1 ? <span>{r.reviewerCount} reviews</span> : null}
        <span>{r.visited ? `Went ${monthLabel(r.visited)}` : new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>
        {r.updatedAt && <span>Edited</span>}
      </div>
      <ReviewActions
        r={r}
        mine={mine}
        thread={thread}
        onReact={onReact}
        onThread={() => setThread((t) => (t ? null : window.matchMedia("(max-width: 900px)").matches ? "sheet" : "inline"))}
        extra={
          mine ? (
            <>
              <button type="button" className="textbtn" onClick={onEdit}>
                Edit
              </button>
              <button type="button" className="textbtn" onClick={onDelete}>
                Delete
              </button>
            </>
          ) : (
            !reported && (
              <button type="button" className="textbtn rv-report" onClick={() => requireAuth("Sign in to report a review.") && setReporting((v) => !v)}>
                Report
              </button>
            )
          )
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
          affirmed: false,
        }
      : blank()
  );
  const [dish, setDish] = useState("");
  const [details, setDetails] = useState(!!mine?.sub && Object.keys(mine.sub).length > 0);
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const labels = subLabels(spot);
  const months = useMemo(() => visitMonths(), []);
  const set = <K extends keyof ReviewDraft>(k: K, v: ReviewDraft[K]) => setD((x) => ({ ...x, [k]: v }));
  const problem = checkDraft(d);
  const len = d.body.trim().length;
  const offer = Array.from(new Set(suggestions.map((x) => x.toLowerCase())))
    .map((k) => suggestions.find((x) => x.toLowerCase() === k)!)
    .filter((x) => x.length > 1 && !d.ordered.some((o) => o.toLowerCase() === x.toLowerCase()))
    .slice(0, 5);

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
        goBack: !!draft.goBack,
        visited: draft.visited,
        ordered: draft.ordered,
        goodFor: draft.goodFor,
        sub: draft.sub,
      });
      onPosted(r, draft);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Couldn't post that review.", "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.form className="rv-form" onSubmit={submit} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
      <fieldset className="rv-f">
        <legend>Your score</legend>
        <div className="rv-scale" role="radiogroup" aria-label="Score">
          {[1, 2, 3, 4, 5].map((v) => (
            <button key={v} type="button" role="radio" aria-checked={d.rating === v} className={d.rating === v ? "on" : d.rating > v ? "under" : ""} onClick={() => set("rating", v)}>
              <b>{v}</b>
              <span>{RATING_WORDS[v].short}</span>
            </button>
          ))}
        </div>
        <p className="rv-hint">{d.rating ? RATING_WORDS[d.rating].long : "3 means good. Save 5 for the best in town."}</p>
      </fieldset>

      <fieldset className="rv-f">
        <legend>Would you go back?</legend>
        <div className="seg rv-seg">
          <button type="button" className={d.goBack === true ? "on" : ""} aria-pressed={d.goBack === true} onClick={() => set("goBack", true)}>
            Yes
          </button>
          <button type="button" className={d.goBack === false ? "on" : ""} aria-pressed={d.goBack === false} onClick={() => set("goBack", false)}>
            No
          </button>
        </div>
      </fieldset>

      <fieldset className="rv-f">
        <legend>What did you get?</legend>
        <div className="rv-dishes">
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
              placeholder={d.ordered.length ? "Anything else?" : "The burger, a latte…"}
              aria-label="Something you got"
              maxLength={ORDER_LEN}
            />
          )}
        </div>
        {offer.length > 0 && d.ordered.length < ORDER_MAX && (
          <div className="rv-offer">
            {offer.map((o) => (
              <button key={o} type="button" className="rv-chip" onClick={() => addDish(o)}>
                + {o}
              </button>
            ))}
          </div>
        )}
      </fieldset>

      <fieldset className="rv-f">
        <legend>Your review</legend>
        <textarea
          value={d.body}
          onChange={(e) => set("body", oneParagraph(e.target.value).slice(0, REVIEW_MAX))}
          placeholder="What stood out, good or bad? Would you order it again? One thing a friend should know before going."
          rows={5}
          maxLength={REVIEW_MAX}
          aria-describedby="rv-count"
        />
        <p id="rv-count" className={`rv-count ${len < REVIEW_MIN ? "short" : ""}`}>
          {len < REVIEW_MIN ? `${REVIEW_MIN - len} more to go` : "One paragraph."} <span>{len} / {REVIEW_MAX}</span>
        </p>
      </fieldset>

      <fieldset className="rv-f rv-f-row">
        <label>
          <span className="rv-lab">When did you go?</span>
          <select value={d.visited} onChange={(e) => set("visited", e.target.value)}>
            {months.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      <fieldset className="rv-f">
        <legend>
          Good for <span className="rv-opt">optional, up to {GOOD_FOR_MAX}</span>
        </legend>
        <div className="rv-offer">
          {GOOD_FOR.map((g) => {
            const on = d.goodFor.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                className={`rv-chip ${on ? "on" : ""}`}
                aria-pressed={on}
                disabled={!on && d.goodFor.length >= GOOD_FOR_MAX}
                onClick={() => set("goodFor", on ? d.goodFor.filter((x) => x !== g.id) : [...d.goodFor, g.id])}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {details ? (
        <fieldset className="rv-f">
          <legend>
            The details <span className="rv-opt">optional</span>
          </legend>
          {SUBS.map((k) => (
            <div className="rv-sub" key={k}>
              <span>{labels[k]}</span>
              <div role="radiogroup" aria-label={labels[k]}>
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={d.sub[k] === v}
                    className={d.sub[k] === v ? "on" : ""}
                    onClick={() => set("sub", { ...d.sub, [k]: d.sub[k] === v ? undefined : v })}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </fieldset>
      ) : (
        <button type="button" className="textbtn rv-add-details" onClick={() => setDetails(true)}>
          + Score the {labels.taste.toLowerCase()}, service and vibe (optional)
        </button>
      )}

      <label className={`rv-affirm ${tried && !d.affirmed ? "missing" : ""}`}>
        <input type="checkbox" checked={d.affirmed} onChange={(e) => set("affirmed", e.target.checked)} />
        <span>I went myself. I don&apos;t own, work at or compete with {spot.name}, and nobody gave me anything for this review.</span>
      </label>

      {tried && problem && <p className="form-err">{problem}</p>}
      <div className="row between rv-foot">
        <button type="button" className="textbtn" onClick={onCancel}>
          Never mind
        </button>
        <button className="btn btn-green" disabled={busy}>
          {busy ? "Posting…" : mine ? "Save changes" : "Post review"}
        </button>
      </div>
    </motion.form>
  );
}

/** Helpful · Want to go · Thanks, and the comments: on every review card and in the feed */
export function ReviewActions({
  r,
  mine,
  thread,
  onReact,
  onThread,
  extra,
}: {
  r: Review;
  mine: boolean;
  thread: null | "inline" | "sheet";
  onReact: (k: Reaction) => void;
  onThread: () => void;
  extra?: React.ReactNode;
}) {
  const got = REACTIONS.filter((x) => r.reactions?.[x.id]);
  return (
    <div className="rv-act">
      {mine ? (
        got.length > 0 && (
          <span className="rx-mine">
            {got.map((x) => (
              <span key={x.id}>
                <RxIcon k={x.id} /> {r.reactions![x.id]} {x.id === "helpful" ? "found it helpful" : x.id === "want" ? "want to go" : "said thanks"}
              </span>
            ))}
          </span>
        )
      ) : (
        <span className="rx" role="group" aria-label="React to this review">
          {REACTIONS.map((x) => {
            const on = !!r.myReactions?.includes(x.id);
            const n = r.reactions?.[x.id] ?? 0;
            return (
              <button
                key={x.id}
                type="button"
                className={`rx-chip ${x.id === "helpful" ? "rv-helpful" : ""} ${on ? "on" : ""}`}
                aria-pressed={on}
                onClick={() => onReact(x.id)}
                title={x.id === "want" ? "Also saves the place to your want-to-try list" : undefined}
              >
                <RxIcon k={x.id} />
                <span>{on ? x.mine : x.label}</span>
                {n > 0 && <span className="rx-n">{n}</span>}
              </button>
            );
          })}
        </span>
      )}
      <button
        type="button"
        className={`rx-chip rx-talk ${thread ? "on" : ""}`}
        onClick={onThread}
        aria-expanded={!!thread}
        aria-label={r.comments ? `${r.comments} ${r.comments === 1 ? "comment" : "comments"}` : "Comment"}
      >
        <RxIcon k="talk" />
        <span>{r.comments ? r.comments : "Comment"}</span>
      </button>
      {extra}
    </div>
  );
}

function RxIcon({ k }: { k: Reaction | "talk" }) {
  const d = {
    helpful: "M7 11v9H4v-9h3Zm0 0 4-7c1.4 0 2.3 1.1 2 2.5L12.5 10H18a2 2 0 0 1 2 2.3l-1.1 6A2 2 0 0 1 17 20H7",
    want: "M6 3.5h12v17l-6-4-6 4v-17Z",
    thanks: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z",
    talk: "M4 5.5h16v10H9l-5 4v-14Z",
  }[k];
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden className="rx-i">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
