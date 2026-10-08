"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PenLine, Trash2 } from "lucide-react";
import { track } from "@vercel/analytics";
import type { Review } from "@/lib/backend";
import type { Spot } from "@/lib/data";
import { useApp } from "./Providers";
import { StarInput, Stars } from "./Stars";

const PROMPTS = ["What did you order?", "Who should go here?", "Best seat in the house?", "Would you go back?"];

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
    if (!rating) return toast("Tap a star rating first", "err");
    if (body.trim().length < 10) return toast("Tell us a little more (10+ characters)", "err");
    setBusy(true);
    try {
      const r = await backend.addReview(spot.id, rating, body.trim());
      setReviews((list) => [r, ...(list ?? []).filter((x) => x.userId !== r.userId)]);
      setWriting(false);
      toast("Review posted. Thanks, local!", "ok");
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
        <h3 className="eyebrow">Word from the locals</h3>
        <button className="btn btn-ink btn-sm" onClick={open}>
          <PenLine size={14} /> {mine ? "Edit your review" : "Write a review"}
        </button>
      </div>

      {stats.count > 0 && (
        <div className="score">
          <div className="score-big">
            <span className="display">{stats.avg.toFixed(1)}</span>
            <Stars value={stats.avg} size={15} />
            <span className="mono-sm">
              {stats.count} review{stats.count === 1 ? "" : "s"}
            </span>
          </div>
          <div className="bars">
            {stats.dist.map((c, i) => (
              <div className="bar-row" key={i}>
                <span className="mono-sm">{5 - i}</span>
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
              <span className="mono-sm">{body.length}/2000</span>
              <div className="row gap8">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setWriting(false)}>
                  Cancel
                </button>
                <button className="btn btn-rust btn-sm" disabled={busy}>
                  {busy ? "Posting…" : "Post review"}
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
          <p className="display">No reviews yet.</p>
          <p className="muted small">Been to {spot.name}? Be the first local to weigh in.</p>
        </div>
      ) : (
        <ul className="review-list">
          {reviews.map((r, i) => (
            <motion.li key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <div className="avatar" aria-hidden>
                {r.userName.slice(0, 1).toUpperCase()}
              </div>
              <div className="review-main">
                <div className="row between">
                  <strong>{r.userName}</strong>
                  <span className="mono-sm">{new Date(r.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>
                <Stars value={r.rating} size={13} />
                <p>{r.body}</p>
                {r.userId === user?.id && (
                  <button className="link-btn" onClick={() => remove(r.id)}>
                    <Trash2 size={12} /> Delete
                  </button>
                )}
              </div>
            </motion.li>
          ))}
        </ul>
      )}
    </section>
  );
}
