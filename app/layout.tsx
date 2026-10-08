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
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "The Local · Birmingham restaurants, coffee & bars", template: "%s · The Local" },
  description:
    "Locally owned restaurants, coffee shops and bars in Birmingham, Ala., by neighborhood: Downtown, Homewood, English Village, Avondale and more. No chains, no fast food.",
  keywords: ["Birmingham restaurants", "Birmingham AL food", "Homewood restaurants", "Avondale bars", "English Village", "Pepper Place", "local restaurants Birmingham"],
  openGraph: { type: "website", siteName: "The Local", locale: "en_US" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#F4EFE1",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
