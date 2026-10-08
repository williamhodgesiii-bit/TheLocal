"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { track } from "@vercel/analytics";
import type { Review } from "@/lib/backend";
import type { Spot } from "@/lib/data";
import { useApp } from "./Providers";
import { StarInput, Stars } from "./Stars";

const PROMPTS = ["What'd you get? Would you go back?", "Who would you bring here?", "Anything you'd skip?", "Best time to go?"];

export default function Reviews({ spot }: { spot: Spot }) {
  const { backend, user, requireAuth, toast } = useApp();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [writing, setWriting] = useState(false);
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    setReviews(null);
    setWriting(false);
    backend
      .listReviews(spot.id)
      .then((r) => live && setReviews(r))
      .catch(() => live && setReviews([]));
    return () => {
      live = false;
    };
  }, [spot.id, backend]);

  const mine = reviews?.find((r) => r.userId === user?.id);
  const stats = useMemo(() => {
    const list = reviews ?? [];
    const dist = [5, 4, 3, 2, 1].map((n) => list.filter((r) => r.rating === n).length);
    const avg = list.length ? list.reduce((a, r) => a + r.rating, 0) / list.length : 0;
    return { dist, avg, count: list.length };
  }, [reviews]);

  function open() {
    if (!requireAuth(`Sign in to review ${spot.name}.`)) return;
    if (mine) {
      setRating(mine.rating);
      setBody(mine.body);
    } else {
      setRating(0);
      setBody("");
    }
    setWriting(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return toast("Pick a rating first", "err");
    if (body.trim().length < 10) return toast("Write a little more than that", "err");
    setBusy(true);
    try {
      const r = await backend.addReview(spot.id, rating, body.trim());
      setReviews((list) => [r, ...(list ?? []).filter((x) => x.userId !== r.userId)]);
      setWriting(false);
      toast("Posted. Thanks for writing it up.", "ok");
      track("review", { id: spot.id, rating });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't post review", "err");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await backend.deleteReview(id);
    setReviews((list) => (list ?? []).filter((r) => r.id !== id));
  }

  return (
    <section className="reviews">
      <div className="reviews-head">
        <h3 className="small-head">What people are saying</h3>
        <button className="textbtn" onClick={open}>
          {mine ? "Edit yours" : "Write one"}
        </button>
      </div>

      {stats.count > 0 && (
        <div className="score">
          <div className="score-big">
            <span className="score-n">{stats.avg.toFixed(1)}</span>
            <span className="score-of">
              out of 5
              <br />
              {stats.count} {stats.count === 1 ? "member" : "members"}
            </span>
          </div>
          <div className="bars">
            {stats.dist.map((c, i) => (
              <div className="bar-row" key={i}>
                <span className="bar-n">{5 - i}</span>
                <span className="bar">
                  <motion.span initial={{ width: 0 }} animate={{ width: `${(c / stats.count) * 100}%` }} transition={{ delay: 0.1 + i * 0.05 }} />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence initial={false}>
        {writing && (
          <motion.form
            className="review-form"
            onSubmit={submit}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <StarInput value={rating} onChange={setRating} />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={PROMPTS[spot.id.length % PROMPTS.length]}
              rows={4}
              maxLength={2000}
              autoFocus
            />
            <div className="row between">
              <span className="count">{body.length} / 2000</span>
              <div className="row gap8">
                <button type="button" className="textbtn" onClick={() => setWriting(false)}>
                  Never mind
                </button>
                <button className="btn btn-green" disabled={busy}>
                  {busy ? "Posting…" : "Post it"}
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {reviews === null ? (
        <div className="skeleton-list">
          <span />
          <span />
        </div>
      ) : reviews.length === 0 ? (
        <div className="empty-reviews">
          <p>Nobody&apos;s written this one up yet. If you&apos;ve been, you&apos;d be first.</p>
        </div>
      ) : (
        <ul className="review-list">
          {reviews.map((r, i) => (
            <motion.li key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}>
              <div className="review-main">
                <p className="r-body">{r.body}</p>
                <div className="r-sig">
                  <span className="pen-sig">{r.userName}</span>
                  <Stars value={r.rating} size={12} />
                  <span className="r-date">{new Date(r.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                  {r.userId === user?.id && (
                    <button className="textbtn" onClick={() => remove(r.id)}>
                      delete
                    </button>
                  )}
                </div>
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  );
}
