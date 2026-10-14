import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import "@fontsource/yellowtail/400.css";
import "@fontsource/young-serif/400.css";
import "@fontsource-variable/libre-franklin/index.css";
import "@fontsource-variable/libre-franklin/wght-italic.css";
import "@fontsource/nanum-pen-script/400.css";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import Providers from "@/components/Providers";
import { MAP_STYLES } from "@/lib/map-styles";
import { siteUrl } from "@/lib/site";
import { BRAND, MANTRA } from "@/lib/brand";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${BRAND} · Birmingham's locally owned restaurants, coffee & bars`, template: `%s · ${BRAND}` },
  description: `${MANTRA} Locally owned restaurants, coffee shops and bars in Birmingham, Homewood, Mountain Brook and Vestavia Hills, by neighborhood. No chains, no fast food.`,
  keywords: ["Birmingham restaurants", "Birmingham AL food", "Homewood restaurants", "Avondale bars", "English Village", "Pepper Place", "local restaurants Birmingham"],
  openGraph: { type: "website", siteName: BRAND, locale: "en_US" },
  twitter: { card: "summary_large_image" },
  appleWebApp: { capable: true, title: "The Plate", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#FBF8EF",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* start the map's style download (and its connection) before the map code arrives */}
        <link rel="preconnect" href={new URL(MAP_STYLES.print).origin} crossOrigin="anonymous" />
        <link rel="preload" href={MAP_STYLES.print} as="fetch" crossOrigin="anonymous" />
      </head>
      <body>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
