import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The Local",
    short_name: "The Local",
    description: "Locally owned restaurants, coffee and bars around Birmingham, Homewood, Mountain Brook and Vestavia Hills.",
    start_url: "/",
    display: "standalone",
    background_color: "#F4EFE1",
    theme_color: "#FBF8EF",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
