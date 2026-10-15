import { PRINT_TILES } from "./map-style-print";

/** Map style URLs, kept apart from the map code so the page layout can preload them cheaply. */
export const MAP_STYLES = {
  // the main map draws its own look (lib/map-style-print.ts); set this to use an outside style instead
  print: process.env.NEXT_PUBLIC_MAP_STYLE || "",
  // more detail (shops, house numbers) for dropping a pin on a front door
  detail: "https://tiles.openfreemap.org/styles/liberty",
};

/** the first thing the main map asks for, so the page can start fetching it early */
export const MAP_FIRST_FETCH = MAP_STYLES.print || PRINT_TILES;
