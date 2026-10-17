"use client";

import { useEffect, useState } from "react";
import { GA_ID, NO_ANALYTICS_KEY } from "@/lib/analytics";

/** Lets a visitor turn Google Analytics off on this device (and shows when GPC already has). */
export default function AnalyticsOptOut() {
  const [state, setState] = useState<"gpc" | "off" | "on" | null>(null);
  useEffect(() => {
    if ((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true) return setState("gpc");
    try {
      setState(localStorage.getItem(NO_ANALYTICS_KEY) === "1" ? "off" : "on");
    } catch {
      setState("on");
    }
  }, []);
  if (!GA_ID || state === null) return null;
  if (state === "gpc") return <p className="optout">Your browser sends Global Privacy Control, so Google Analytics never loads for you here.</p>;
  const flip = () => {
    try {
      if (state === "on") localStorage.setItem(NO_ANALYTICS_KEY, "1");
      else localStorage.removeItem(NO_ANALYTICS_KEY);
    } catch {
      /* ignore */
    }
    setState(state === "on" ? "off" : "on");
  };
  return (
    <p className="optout">
      Google Analytics is <strong>{state}</strong> for you on this device.{" "}
      <button className="textbtn" onClick={flip}>
        {state === "on" ? "Turn it off" : "Turn it back on"}
      </button>
      {state === "off" && " (takes effect on your next page load)"}
    </p>
  );
}
