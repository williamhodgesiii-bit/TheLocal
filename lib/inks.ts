import { hash } from "./images";

/** A matchbook's inks: background, lettering, accent. The cover, share cards and icons all use them. */
export const INKS: [string, string, string][] = [
  ["#b23a24", "#f6eedc", "#22201c"],
  ["#2c5a43", "#f3e9d2", "#e0ae45"],
  ["#22201c", "#f4efe1", "#d0502f"],
  ["#d9a33a", "#22201c", "#b23a24"],
  ["#efe5cf", "#b23a24", "#2c5a43"],
  ["#26408b", "#f4efe1", "#e0ae45"],
  ["#5e2f3e", "#f2e4d3", "#e0ae45"],
  ["#2f5d62", "#f4efe1", "#e7b452"],
  ["#c2643c", "#fbf3e4", "#22201c"],
  ["#4d4b26", "#f4efe1", "#e8c26a"],
];

/** the same inks a place's matchbook cover uses */
export const inksFor = (id: string) => INKS[hash(id) % INKS.length];
