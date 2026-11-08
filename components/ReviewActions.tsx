"use client";

import { useEffect, useRef, useState } from "react";
import type { Review } from "@/lib/backend";
import type { Reaction } from "@/lib/social";

/**
 * Under every review, three things people already know how to use: a heart, a comment bubble and
 * a bookmark (save the place). Icons, not buttons with words, so the review stays the loudest
 * thing on the card. Everything else (edit, delete, report) waits behind "…".
 *
 * The heart is the "helpful" vote underneath, so it still sorts reviews and earns reviewers their
 * marks. Older "Thanks" count as likes too.
 */
export function ReviewActions({
  r,
  mine,
  thread,
  onReact,
  onThread,
  menu,
}: {
  r: Review;
  mine: boolean;
  thread: null | "inline" | "sheet";
  onReact: (k: Reaction) => void;
  onThread: () => void;
  /** what "…" offers: Edit and Delete on your own, Report on others' */
  menu?: { label: string; onClick: () => void }[];
}) {
  const my = r.myReactions ?? [];
  const liked = my.includes("helpful") || my.includes("thanks");
  const likes = (r.reactions?.helpful ?? 0) + (r.reactions?.thanks ?? 0);
  const saved = my.includes("want");
  const like = () => onReact(my.includes("helpful") || !liked ? "helpful" : "thanks");
  return (
    <div className="rv-act">
      {mine ? (
        <span className={`ia ${likes ? "" : "quiet"}`} aria-label={`${likes} ${likes === 1 ? "like" : "likes"}`}>
          <Icon k="heart" />
          {likes > 0 && <span className="ia-n">{likes}</span>}
        </span>
      ) : (
        <button type="button" className={`ia ia-like ${liked ? "on" : ""}`} aria-pressed={liked} onClick={like} aria-label={liked ? "Liked" : "Like"}>
          <Icon k="heart" on={liked} />
          {likes > 0 && <span className="ia-n">{likes}</span>}
        </button>
      )}
      <button
        type="button"
        className={`ia ${thread ? "on" : ""}`}
        onClick={onThread}
        aria-expanded={!!thread}
        aria-label={r.comments ? `${r.comments} ${r.comments === 1 ? "comment" : "comments"}` : "Comment"}
      >
        <Icon k="talk" />
        {!!r.comments && <span className="ia-n">{r.comments}</span>}
      </button>
      <span className="ia-gap" />
      {!mine && (
        <button
          type="button"
          className={`ia ia-save ${saved ? "on" : ""}`}
          aria-pressed={saved}
          onClick={() => onReact("want")}
          aria-label={saved ? "Saved to want to try" : "Save to want to try"}
          title={saved ? "Saved to want to try" : "Save to want to try"}
        >
          <Icon k="save" on={saved} />
        </button>
      )}
      {!!menu?.length && <More items={menu} />}
    </div>
  );
}

function More({ items }: { items: { label: string; onClick: () => void }[] }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent | TouchEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", off);
    document.addEventListener("touchstart", off);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", off);
      document.removeEventListener("touchstart", off);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <span className="ia-more" ref={box}>
      <button type="button" className="ia" aria-haspopup="menu" aria-expanded={open} aria-label="More" onClick={() => setOpen((v) => !v)}>
        <Icon k="more" />
      </button>
      {open && (
        <span className="ia-menu" role="menu">
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                it.onClick();
              }}
            >
              {it.label}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

function Icon({ k, on }: { k: "heart" | "talk" | "save" | "more"; on?: boolean }) {
  if (k === "more")
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden className="ia-i">
        <circle cx="5.5" cy="12" r="1.6" fill="currentColor" />
        <circle cx="12" cy="12" r="1.6" fill="currentColor" />
        <circle cx="18.5" cy="12" r="1.6" fill="currentColor" />
      </svg>
    );
  const d = {
    heart: "M12 20s-7.2-4.5-7.2-10.1A4.1 4.1 0 0 1 12 7.2a4.1 4.1 0 0 1 7.2 2.7C19.2 15.5 12 20 12 20Z",
    talk: "M4.5 5.5h15v10.5H10l-5.5 4v-14.5Z",
    save: "M6.5 3.8h11v16.4L12 16.4l-5.5 3.8V3.8Z",
  }[k];
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden className="ia-i">
      <path d={d} fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/**
 * What they had and whether they'd go back, said once in a quiet line under the review
 * ("Would go back · Ordered Italian Sub and Montucky"), not a row of pills.
 */
export function ReviewFacts({ r }: { r: Review }) {
  const had = r.ordered ?? [];
  const go = typeof r.goBack === "boolean" ? r.goBack : null;
  if (!had.length && go === null) return null;
  const list = had.length > 1 ? `${had.slice(0, -1).join(", ")} and ${had[had.length - 1]}` : had[0];
  return (
    <p className="rv-facts">
      {go !== null && <span className={go ? "go-yes" : "go-no"}>{go ? "Would go back" : "Wouldn’t go back"}</span>}
      {go !== null && had.length > 0 && <span aria-hidden> · </span>}
      {had.length > 0 && <span>Ordered {list}</span>}
    </p>
  );
}
