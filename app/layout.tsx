import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/react";
import "@fontsource-variable/fraunces/index.css";
import "@fontsource-variable/fraunces/wght-italic.css";
import "@fontsource-variable/instrument-sans/index.css";
import "@fontsource/big-shoulders-display/700";
import "@fontsource/big-shoulders-display/800";
import "@fontsource/big-shoulders-display/900";
import "@fontsource/jetbrains-mono/400";
import "@fontsource/jetbrains-mono/600";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import Providers from "@/components/Providers";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "The Local — Birmingham's independent food & drink map", template: "%s · The Local" },
  description:
    "Pick a craving and a neighborhood — Downtown, Homewood, English Village, Avondale and more — and find Birmingham's best independent restaurants, coffee and bars. No fast food. No chains.",
  keywords: ["Birmingham restaurants", "Birmingham AL food", "Homewood restaurants", "Avondale bars", "English Village", "Pepper Place", "local restaurants Birmingham"],
  openGraph: { type: "website", siteName: "The Local", locale: "en_US" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#1C1714",
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
