"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** sheets opened from inside the sidebar go on top of everything (the map included) */
export default function Portal({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(false);
  useEffect(() => setOn(true), []);
  return on ? createPortal(children, document.body) : null;
}
