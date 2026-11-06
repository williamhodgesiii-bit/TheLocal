import type { MetadataRoute } from "next";
import { BRAND, MANTRA } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND,
    short_name: "The Plate", // fits under a home-screen icon
    description: `${MANTRA} Locally owned restaurants, coffee and bars around Birmingham, Homewood, Mountain Brook and Vestavia Hills.`,
    id: "/",
    start_url: "/",
    scope: "/",
    lang: "en-US",
    categories: ["food", "lifestyle", "social"],
    display: "standalone",
    background_color: "#F4EFE1",
    theme_color: "#F4EFE1",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android crops icons to its own shape: this one has room around the plate so nothing's cut off
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
