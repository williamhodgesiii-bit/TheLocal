"use client";

import { useState } from "react";

const PATH = "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z";

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="stars" aria-label={`${value.toFixed(1)} out of 5`} style={{ height: size }}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <svg key={i} viewBox="0 0 24 24" width={size} height={size} aria-hidden>
            <defs>
              <linearGradient id={`st-${i}-${Math.round(fill * 100)}`}>
                <stop offset={fill} stopColor="currentColor" />
                <stop offset={fill} stopColor="currentColor" stopOpacity=".18" />
              </linearGradient>
            </defs>
            <path d={PATH} fill={`url(#st-${i}-${Math.round(fill * 100)})`} />
          </svg>
        );
      })}
    </span>
  );
}

const WORDS = ["", "1 out of 5", "2 out of 5", "3 out of 5", "4 out of 5", "5 out of 5"];

export function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="star-input" onMouseLeave={() => setHover(0)}>
      <div role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className={n <= shown ? "on" : ""}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n)}
          >
            <svg viewBox="0 0 24 24" width="28" height="28">
              <path d={PATH} />
            </svg>
          </button>
        ))}
      </div>
      <span className="star-word">{WORDS[shown]}</span>
    </div>
  );
}
