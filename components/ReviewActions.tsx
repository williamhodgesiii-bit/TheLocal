"use client";

import type { Review } from "@/lib/backend";
import { REACTIONS, type Reaction } from "@/lib/social";

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
