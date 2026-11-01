/* One small set of line icons, drawn for this site (no icon font, nothing to download). */

const PATHS = {
  home: "M4 10.5 12 4l8 6.5V20h-5.5v-5.5h-5V20H4z",
  search: "M10.5 18a7.5 7.5 0 1 1 5.3-2.2L21 21",
  spark: "M12 3.5c.6 3.9 1.9 5.9 5.6 6.6-3.7.8-5 2.8-5.6 6.7-.6-3.9-1.9-5.9-5.6-6.7 3.7-.7 5-2.7 5.6-6.6ZM18.5 15.5c.3 1.6.8 2.4 2.2 2.7-1.4.3-1.9 1.1-2.2 2.7-.3-1.6-.8-2.4-2.2-2.7 1.4-.3 1.9-1.1 2.2-2.7Z",
  lists: "M8 6h12M8 12h12M8 18h8M4 6h.01M4 12h.01M4 18h.01",
  user: "M12 12a4 4 0 1 0-.1 0M4.5 20c1.5-4 4.4-5.5 7.5-5.5s6 1.5 7.5 5.5",
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z",
  check: "M5 12.5l4.2 4.2L19 7",
  pen: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  share: "M12 15V4M8 8l4-4 4 4M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6",
  plus: "M12 5v14M5 12h14",
  back: "M15 5l-7 7 7 7",
  close: "M6 6l12 12M18 6 6 18",
  chevron: "M6 9l6 6 6-6",
  right: "M9 6l6 6-6 6",
  map: "M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  bell: "M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15l1.5-2ZM10 20.5a2 2 0 0 0 4 0",
  pin: "M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11ZM12 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z",
  dice: "M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  sliders: "M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6",
  phone: "M5 4h3.5l1.5 4-2 1.5a11 11 0 0 0 6.5 6.5l1.5-2 4 1.5V19a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1Z",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3Z",
  gift: "M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-1.5-3-5-3.5-5-1.2C7 7 9.5 7 12 7Zm0 0c1.5-3 5-3.5 5-1.2C17 7 14.5 7 12 7Z",
  camera: "M4 8h3l1.5-2h7L17 8h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
  directions: "M12 3 21 12l-9 9-9-9zM9 14v-2.5a1.5 1.5 0 0 1 1.5-1.5H15M13 8l2 2-2 2",
  people: "M9 11a3.5 3.5 0 1 0-.1 0M2.5 19.5c1-3.3 3.4-4.8 6.5-4.8s5.5 1.5 6.5 4.8M16 11.2a3 3 0 1 0-.6-5.9M17.2 14.8c2.2.4 3.6 1.9 4.3 4.4",
  star: "M12 3.8l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, fill = false, stroke = 1.75, className }: { name: IconName; size?: number; fill?: boolean; stroke?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className={className}>
      <path d={PATHS[name]} fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
