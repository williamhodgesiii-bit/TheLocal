import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import localFont from "next/font/local";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import "./ui.css";
import Providers from "@/components/Providers";
import JsonLd from "@/components/JsonLd";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { MAP_FIRST_FETCH } from "@/lib/map-styles";
import { siteUrl } from "@/lib/site";
import { BRAND, MANTRA } from "@/lib/brand";
import { organizationLd, websiteLd } from "@/lib/seo";

/*
  Fonts: only the Latin files, served from our own domain. The two that every page needs first
  (the serif and the sans) are preloaded; fallbacks are size-matched so text doesn't jump when
  they arrive.
*/
const display = localFont({
  src: [
    { path: "../node_modules/@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2", weight: "200 800", style: "normal" },
    { path: "../node_modules/@fontsource-variable/newsreader/files/newsreader-latin-wght-italic.woff2", weight: "200 800", style: "italic" },
  ],
  variable: "--font-display",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: "Times New Roman",
});
const sans = localFont({
  src: "../node_modules/@fontsource-variable/libre-franklin/files/libre-franklin-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-sans",
  display: "swap",
  fallback: ["Helvetica Neue", "Arial", "sans-serif"],
  adjustFontFallback: "Arial",
});
const script = localFont({
  src: "../node_modules/@fontsource/yellowtail/files/yellowtail-latin-400-normal.woff2",
  weight: "400",
  variable: "--font-script",
  display: "swap",
  fallback: ["Brush Script MT", "cursive"],
  adjustFontFallback: false,
});
const sign = localFont({
  src: "../node_modules/@fontsource-variable/big-shoulders-display/files/big-shoulders-display-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-sign",
  display: "swap",
  preload: false,
  fallback: ["Arial Narrow", "Impact", "sans-serif"],
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${BRAND} · Birmingham's locally owned restaurants, coffee & bars`, template: `%s · ${BRAND}` },
  description: `${MANTRA} Locally owned restaurants, coffee shops and bars in Birmingham, Homewood, Mountain Brook and Vestavia Hills, by neighborhood. No chains, no fast food.`,
  keywords: ["Birmingham restaurants", "Birmingham AL food", "Homewood restaurants", "Avondale bars", "English Village", "Pepper Place", "local restaurants Birmingham"],
  openGraph: { type: "website", siteName: BRAND, locale: "en_US" },
  twitter: { card: "summary_large_image" },
  appleWebApp: { capable: true, title: "The Plate", statusBarStyle: "default" },
  applicationName: BRAND,
  category: "food",
  creator: BRAND,
  publisher: BRAND,
  robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  verification: {
    ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } : {}),
    ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ? { other: { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION } } : {}),
  },
};

export const viewport: Viewport = {
  themeColor: "#F4EFE1",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${script.variable} ${sign.variable}`}>
      <head>
        {/* start the map's style download (and its connection) before the map code arrives */}
        <link rel="preconnect" href={new URL(MAP_FIRST_FETCH).origin} crossOrigin="anonymous" />
        <link rel="preload" href={MAP_FIRST_FETCH} as="fetch" crossOrigin="anonymous" />
        {/* the feed: every Thursday Plate and the newest reviews */}
        <link rel="alternate" type="application/rss+xml" title={BRAND} href="/feed.xml" />
      </head>
      <body>
        <JsonLd data={[organizationLd(), websiteLd()]} />
        <Providers>{children}</Providers>
        <Analytics />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
