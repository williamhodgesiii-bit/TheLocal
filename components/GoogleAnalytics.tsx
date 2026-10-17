"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { GA_ID, gaAllowed, gaBoot } from "@/lib/analytics";

/**
 * Loads Google Analytics 4 when NEXT_PUBLIC_GA_ID is set. Skipped entirely for
 * visitors with Global Privacy Control on or who opted out on /privacy.
 * Page views on client-side navigation come from GA4's enhanced measurement
 * (browser history changes), so nothing extra is needed per route.
 */
export default function GoogleAnalytics() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (gaAllowed()) {
      gaBoot();
      setOn(true);
    }
  }, []);
  if (!on) return null;
  return <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />;
}
