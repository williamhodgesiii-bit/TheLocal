"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/** A pen circle drawn around the chosen option, the way you'd mark up a paper menu. */
export default function Circled({ on, children, seed = 0 }: { on: boolean; children: ReactNode; seed?: number }) {
  const paths = [
    "M10,24 C6,9 38,3 62,5 C86,7 98,15 94,27 C90,37 56,40 32,37 C12,34 2,26 9,15 C13,9 22,7 31,6",
    "M14,8 C34,2 74,2 90,10 C99,16 96,30 80,35 C60,41 24,39 10,31 C1,25 4,12 18,8 C26,6 34,6 40,6",
    "M6,20 C8,6 44,2 70,4 C92,6 99,18 92,29 C84,39 44,40 22,35 C6,31 3,22 12,13",
  ];
  return (
    <span className="circled">
      {children}
      {on && (
        <svg viewBox="0 0 100 42" preserveAspectRatio="none" aria-hidden>
          <motion.path
            d={paths[seed % paths.length]}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          />
        </svg>
      )}
    </span>
  );
}
