/** Map style URLs, kept apart from the map code so the page layout can preload them cheaply. */
export const MAP_STYLES = {
  // quiet gray base for the main map; our own neighborhood names sit on top
  print: process.env.NEXT_PUBLIC_MAP_STYLE || "https://tiles.openfreemap.org/styles/positron",
  // more detail (shops, house numbers) for dropping a pin on a front door
  detail: "https://tiles.openfreemap.org/styles/liberty",
};
