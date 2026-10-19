"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { track } from "@/lib/analytics";
import type { Review } from "@/lib/backend";
import {
  COMMENT_MAX,
  COMMENT_REPORT_REASONS,
  canEdit,
  splitMentions,
  threadOf,
  tidyComment,
  timeAgo,
  type Comment,
} from "@/lib/social";
import { Avatar, NameLink } from "./People";
import Portal from "./Portal";
import { useApp } from "./Providers";

/** replies shown before "View more replies" */
const REPLIES_SHOWN = 2;
/** words aimed at a person, not the food: worth a second look before posting */
const HEATED = /\b(you('| a)?re|ur|u r)\s+(an?\s+|so\s+)?(idiot|moron|stupid|dumb|loser|clown|pathetic|joke)\b|\bshut up\b|\b(idiot|moron|dumbass|imbecile)\b/i;

/**
 * Comments on one review: one level of replies, oldest first, 500 characters, 15 minutes to fix a
 * typo. Inline under the review on a computer; a sheet from the bottom on a phone.
 */
export default function ReviewThread({
  review,
  sheet,
  onClose,
  onCount,
}: {
  review: Review;
  sheet?: boolean;
  onClose: () => void;
  onCount: (n: number) => void;
}) {
  const { backend, user, requireAuth, toast } = useApp();
  const [list, setList] = useState<Comment[] | null>(null);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [editing, setEditing] = useState<Comment | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rethink, setRethink] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const box = useRef<HTMLTextAreaElement>(null);
  const writer = user?.id === review.userId;
  const off = review.writerComments === "off" && !writer;

  useEffect(() => {
    let live = true;
    backend
      .listComments(review.id)
      .then((c) => live && setList(c))
      .catch((e) => live && (setList([]), setErr(e instanceof Error ? e.message : "Couldn't load comments.")));
    return () => {
      live = false;
    };
  }, [backend, review.id, user?.id]);

  const live = useMemo(() => (list ?? []).filter((c) => c.status === "live").length, [list]);
  useEffect(() => {
    if (list) onCount(live);
  }, [live, list]); // eslint-disable-line react-hooks/exhaustive-deps
  const thread = useMemo(() => threadOf(list ?? []), [list]);

  function startReply(c: Comment) {
    if (!requireAuth("Sign in to reply. It takes a few seconds, no password.")) return;
    setEditing(null);
    setReplyTo(c);
    const tag = c.user.handle && c.user.id !== user?.id ? `@${c.user.handle} ` : "";
    setBody((b) => (b.startsWith(tag) ? b : tag + b));
    setTimeout(() => box.current?.focus(), 30);
  }
  function startEdit(c: Comment) {
    setReplyTo(null);
    setEditing(c);
    setBody(c.body ?? "");
    setTimeout(() => box.current?.focus(), 30);
  }
  function cancel() {
    setReplyTo(null);
    setEditing(null);
    setBody("");
    setErr(null);
    setRethink(false);
  }

  async function post(e?: React.FormEvent) {
    e?.preventDefault();
    if (!requireAuth("Sign in to comment. It takes a few seconds, no password.")) return;
    const text = body.trim();
    if (!text) return;
    if (HEATED.test(text) && !rethink) return setRethink(true);
    setBusy(true);
    setErr(null);
    try {
      if (editing) {
        const c = await backend.editComment(editing.id, text);
        setList((cur) => (cur ?? []).map((x) => (x.id === c.id ? c : x)));
      } else {
        const c = await backend.addComment(review.id, text, replyTo?.id);
        setList((cur) => [...(cur ?? []), c]);
        track("comment", { reply: !!replyTo });
        if (replyTo) setOpen((o) => ({ ...o, [c.parentId ?? replyTo.id]: true }));
      }
      cancel();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Couldn't post that. Try again?");
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: Comment) {
    try {
      await backend.deleteComment(c.id);
      setList(await backend.listComments(review.id));
      toast("Comment deleted.");
    } catch (x) {
      toast(x instanceof Error ? x.message : "Couldn't delete it.", "err");
    }
  }
  async function hide(c: Comment, hidden: boolean) {
    try {
      await backend.hideComment(c.id, hidden);
      setList((cur) => (cur ?? []).map((x) => (x.id === c.id ? { ...x, status: hidden ? "hidden" : "live" } : x)));
      toast(hidden ? "Hidden. Only its writer can see it now." : "It's back.");
    } catch (x) {
      toast(x instanceof Error ? x.message : "Couldn't do that.", "err");
    }
  }

  const content = (
    <>
      {list === null ? (
        <div className="skeleton-list">
          <span />
        </div>
      ) : thread.length === 0 ? (
        <p className="th-empty">{off ? "Comments are off for this review." : "No comments yet. Ask about the dish, or say thanks."}</p>
      ) : (
        <ul className="th-list">
          {thread.map(({ c, replies }) => {
            const more = replies.length - REPLIES_SHOWN;
            const shown = open[c.id] || more <= 0 ? replies : replies.slice(0, REPLIES_SHOWN);
            return (
              <li key={c.id} className="th-item">
                <CommentRow c={c} review={review} onReply={startReply} onEdit={startEdit} onDelete={remove} onHide={hide} />
                {replies.length > 0 && (
                  <ul className="th-replies">
                    {shown.map((r) => (
                      <li key={r.id}>
                        <CommentRow c={r} review={review} onReply={startReply} onEdit={startEdit} onDelete={remove} onHide={hide} />
                      </li>
                    ))}
                    {more > 0 && !open[c.id] && (
                      <li>
                        <button type="button" className="textbtn th-more" onClick={() => setOpen((o) => ({ ...o, [c.id]: true }))}>
                          View {more} more {more === 1 ? "reply" : "replies"}
                        </button>
                      </li>
                    )}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );

  const composer = off ? null : (
    <form className="th-form" onSubmit={post}>
      {(replyTo || editing) && (
        <p className="th-mode">
          {editing ? "Editing your comment" : `Replying to ${replyTo!.user.name}`}
          <button type="button" className="textbtn" onClick={cancel}>
            Cancel
          </button>
        </p>
      )}
      <div className="th-row">
        <label className="sr-only" htmlFor={`th-${review.id}`}>
          Comment
        </label>
        <textarea
          id={`th-${review.id}`}
          ref={box}
          rows={1}
          value={body}
          maxLength={COMMENT_MAX}
          placeholder={user ? "Add a comment" : "Sign in to comment"}
          onFocus={() => !user && requireAuth("Sign in to comment. It takes a few seconds, no password.")}
          onChange={(e) => {
            setBody(tidyComment(e.target.value));
            setRethink(false);
            const t = e.target;
            t.style.height = "auto";
            t.style.height = `${Math.min(t.scrollHeight, 140)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              post();
            }
          }}
        />
        <button className="btn btn-green th-send" disabled={busy || !body.trim()}>
          {editing ? "Save" : "Post"}
        </button>
      </div>
      {rethink ? (
        <p className="th-rethink" role="alert">
          That could read as a jab at a person. Talk about the food, not the person.{" "}
          <button type="button" className="textbtn" onClick={() => post()}>
            Post anyway
          </button>
        </p>
      ) : err ? (
        <p className="form-err" role="alert">
          {err}
        </p>
      ) : (
        <p className="th-hint">
          <span>Talk about the food, not the person.</span>
          {body.length > COMMENT_MAX - 100 && <span>{COMMENT_MAX - body.length} left</span>}
        </p>
      )}
    </form>
  );

  if (!sheet)
    return (
      <motion.div className="thread" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
        {content}
        {composer}
      </motion.div>
    );
  return <ThreadSheet title={live === 1 ? "1 comment" : `${live || "No"} comments`} onClose={onClose} foot={composer}>{content}</ThreadSheet>;
}

function CommentRow({
  c,
  review,
  onReply,
  onEdit,
  onDelete,
  onHide,
}: {
  c: Comment;
  review: Review;
  onReply: (c: Comment) => void;
  onEdit: (c: Comment) => void;
  onDelete: (c: Comment) => void;
  onHide: (c: Comment, hidden: boolean) => void;
}) {
  const { backend, user, requireAuth, toast, nav } = useApp();
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const [sure, setSure] = useState(false);
  const mine = user?.id === c.user.id;
  const writer = user?.id === review.userId;
  if (c.status === "deleted") return <p className="cm cm-gone">Comment deleted</p>;

  async function report(reason: string) {
    try {
      await backend.reportComment(c.id, reason);
      setReported(true);
      setReporting(false);
      toast("Thanks. A person will look at it.", "ok");
    } catch {
      toast("Couldn't send that. Try again?", "err");
    }
  }

  return (
    <div className={`cm ${c.status !== "live" ? "cm-off" : ""}`}>
      <Avatar m={c.user} size={28} />
      <div className="cm-main">
        <p className="cm-head">
          <NameLink m={c.user} className="cm-name" />
          {c.user.id === review.userId && <span className="cm-badge">Wrote the review</span>}
          <span className="cm-time">{timeAgo(c.createdAt)}</span>
          {c.editedAt && <span className="cm-time">Edited</span>}
          {c.status === "hidden" && <span className="cm-badge off">Hidden{mine ? " by the review's writer" : ""}</span>}
          {c.status === "held" && <span className="cm-badge off">Being checked</span>}
        </p>
        <p className="cm-body">
          {splitMentions(c.body ?? "").map((part, i) =>
            part.handle ? (
              <a
                key={i}
                href={`/u/${part.handle}`}
                className="mention"
                onClick={(e) => {
                  e.preventDefault();
                  nav.member(part.handle!);
                }}
              >
                {part.text}
              </a>
            ) : (
              <span key={i}>{part.text}</span>
            )
          )}
        </p>
        <p className="cm-act">
          {c.status === "live" && (
            <button type="button" className="textbtn" onClick={() => onReply(c)}>
              Reply
            </button>
          )}
          {mine && c.status === "live" && canEdit(c) && (
            <button type="button" className="textbtn" onClick={() => onEdit(c)}>
              Edit
            </button>
          )}
          {mine && (
            <button type="button" className="textbtn" onClick={() => (sure ? onDelete(c) : setSure(true))}>
              {sure ? "Delete it?" : "Delete"}
            </button>
          )}
          {writer && !mine && (c.status === "live" || c.status === "hidden") && (
            <button type="button" className="textbtn" onClick={() => onHide(c, c.status === "live")}>
              {c.status === "live" ? "Hide" : "Unhide"}
            </button>
          )}
          {!mine && !reported && c.status === "live" && (
            <button type="button" className="textbtn" onClick={() => requireAuth("Sign in to report a comment.") && setReporting((v) => !v)}>
              Report
            </button>
          )}
        </p>
        {reporting && (
          <div className="cm-report" role="group" aria-label="What's wrong with it">
            {COMMENT_REPORT_REASONS.map((r) => (
              <button key={r.id} type="button" className="b-chip b-chip-sm" onClick={() => report(r.id)}>
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The phone sheet: most of the screen, an X to close, Back closes it too, and the comment box
 * rides above the keyboard (iPhone Safari shrinks the visual viewport, not the layout one).
 */
function ThreadSheet({ title, onClose, foot, children }: { title: string; onClose: () => void; foot: React.ReactNode; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    history.pushState({ ...(history.state ?? {}), tlSheet: 1 }, "");
    let popped = false;
    const pop = () => {
      popped = true;
      onClose();
    };
    window.addEventListener("popstate", pop);
    const vv = window.visualViewport;
    const fit = () => {
      if (!vv || !ref.current) return;
      ref.current.style.setProperty("--vvh", `${vv.height}px`);
      ref.current.style.setProperty("--vvb", `${Math.max(0, window.innerHeight - vv.height - vv.offsetTop)}px`);
    };
    // the sheet mounts a frame later (it's portaled), so fit once it's there
    const raf = requestAnimationFrame(fit);
    vv?.addEventListener("resize", fit);
    vv?.addEventListener("scroll", fit);
    const key = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", key);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("popstate", pop);
      vv?.removeEventListener("resize", fit);
      vv?.removeEventListener("scroll", fit);
      window.removeEventListener("keydown", key);
      // closed some other way (a name tapped, say): mark the entry so the next move reuses it
      if (!popped && history.state?.tlSheet) history.replaceState({ ...history.state, tlSheet: 0, tlDead: 1 }, "");
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  function close() {
    if (history.state?.tlSheet) history.back();
    else onClose();
  }
  return (
    <Portal>
      <AnimatePresence>
      <motion.div className="overlay thread-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={close}>
        <motion.div
          ref={ref}
          className="modal where thread-sheet"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="sheet-head">
            <h2 className="modal-title">{title}</h2>
            <button className="modal-x" onClick={close} aria-label="Close">
              ×
            </button>
          </div>
          <div className="sheet-body">{children}</div>
          <div className="sheet-foot th-foot">{foot}</div>
        </motion.div>
      </motion.div>
      </AnimatePresence>
    </Portal>
  );
}
