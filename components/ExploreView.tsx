"use client";

import { memo, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { DRINK_KINDS, GENRES, GENRE_BY_ID, areaLabelOf, priceLabel, type DrinkKind, type GenreId, type Spot } from "@/lib/data";
import type { RatingSummary } from "@/lib/backend";
import { AVG_MIN } from "@/lib/reviews";
import { useApp } from "./Providers";
import { Poster } from "./Cover";
import { Thumb } from "./Photo";
import { Icon } from "./Icons";
import Sheet from "./Sheet";
import MapCards from "./MapCards";

export type Sort = "popular" | "rating" | "az" | "near";
const SORTS: { id: Sort; label: string }[] = [
  { id: "popular", label: "Most loved" },
  { id: "rating", label: "Top rated" },
  { id: "near", label: "Nearest to me" },
  { id: "az", label: "A to Z" },
];

/**
 * Explore: search, a few filters in one row, and every place as a cover. The map is one tap
 * away (Map), never in the way.
 */
export default function ExploreView(p: {
  searchRef: RefObject<HTMLInputElement>;
  list: Spot[];
  ratings: RatingSummary;
  query: string;
  setQuery: (q: string) => void;
  genre: GenreId | "all";
  chooseGenre: (g: GenreId | "all") => void;
  genreCounts: Record<string, number>;
  drink: DrinkKind | "all";
  setDrink: (d: DrinkKind | "all") => void;
  whereLabel: string;
  whereOn: boolean;
  openWhere: () => void;
  prices: number[];
  setPrices: (f: (x: number[]) => number[]) => void;
  savedOnly: boolean;
  setSavedOnly: (v: boolean) => void;
  sort: Sort;
  pickSort: (s: Sort) => void;
  theme: { label: string; onClear: () => void } | null;
  narrowed: boolean;
  clearFilters: () => void;
  countLine: string;
  mapMode: boolean;
  setMapMode: (v: boolean) => void;
  isMobile: boolean;
  map: ReactNode;
  sponsoredPick: Spot | null;
  onOpen: (id: string) => void;
  onHover: (id: string | null) => void;
  hoveredId: string | null;
  focusId: string | null;
  onFocus: (id: string) => void;
  milesTo?: (s: Spot) => number | undefined;
  empty: ReactNode;
  foot: ReactNode;
}) {
  const [sheet, setSheet] = useState<null | "food" | "price" | "sort">(null);
  // the first screenful draws at once, the rest a frame later as you scroll (phones stay quick)
  const [shown, setShown] = useState(12);
  useEffect(() => setShown(12), [p.list]);
  const genreLabel = p.genre === "all" ? "Cuisine" : p.genre === "drinks" && p.drink !== "all" ? DRINK_KINDS.find((d) => d.id === p.drink)!.label : GENRE_BY_ID[p.genre].short;
  const priceText = p.prices.length ? [...p.prices].sort().map((x) => priceLabel(x)).join(", ") : "Price";
  const sortText = SORTS.find((s) => s.id === p.sort)!.label;

  const filters = (
    <div className="fbar" role="group" aria-label="Filters">
      <button type="button" className={`chip ${p.genre !== "all" ? "on" : ""}`} onClick={() => setSheet("food")} aria-haspopup="dialog">
        {genreLabel}
        <Icon name="chevron" size={14} />
      </button>
      <button type="button" className={`chip ${p.whereOn ? "on" : ""}`} onClick={p.openWhere} aria-haspopup="dialog">
        {p.whereOn ? p.whereLabel : "Where"}
        <Icon name="chevron" size={14} />
      </button>
      <button type="button" className={`chip ${p.prices.length ? "on" : ""}`} onClick={() => setSheet("price")} aria-haspopup="dialog">
        {priceText}
        <Icon name="chevron" size={14} />
      </button>
      <button type="button" className={`chip ${p.savedOnly ? "on" : ""}`} aria-pressed={p.savedOnly} onClick={() => p.setSavedOnly(!p.savedOnly)}>
        <Icon name="heart" size={14} fill={p.savedOnly} />
        Want to try
      </button>
      {p.theme && (
        <button type="button" className="chip on" onClick={p.theme.onClear} aria-label={`${p.theme.label}. Remove`}>
          {p.theme.label}
          <Icon name="close" size={13} />
        </button>
      )}
    </div>
  );

  const search = (
    <label className="search">
      <Icon name="search" size={18} />
      <span className="sr-only">Search</span>
      <input ref={p.searchRef} type="search" enterKeyHint="search" value={p.query} onChange={(e) => p.setQuery(e.target.value)} placeholder="Search places, dishes, neighborhoods" />
      {p.query && (
        <button type="button" className="search-x" onClick={() => p.setQuery("")} aria-label="Clear search">
          <Icon name="close" size={16} />
        </button>
      )}
    </label>
  );

  const head = (
    <div className="ex-meta">
      <p className="ex-count">{p.countLine}</p>
      <div className="ex-tools">
        {p.narrowed && (
          <button type="button" className="link-btn" onClick={p.clearFilters}>
            Clear
          </button>
        )}
        <button type="button" className="link-btn sort-btn" onClick={() => setSheet("sort")}>
          {sortText}
          <Icon name="chevron" size={14} />
        </button>
        <button type="button" className="view-toggle" onClick={() => p.setMapMode(!p.mapMode)} aria-pressed={p.mapMode}>
          <Icon name={p.mapMode ? "grid" : "map"} size={16} />
          {p.mapMode ? "Covers" : "Map"}
        </button>
      </div>
    </div>
  );

  const sheets = (
    <>
      <Sheet open={sheet === "food"} onClose={() => setSheet(null)} title="Cuisine">
        <div className="pill-grid">
          <button type="button" className={`pill ${p.genre === "all" ? "on" : ""}`} onClick={() => (p.chooseGenre("all"), setSheet(null))}>
            Everything <span className="n">{p.genreCounts.all ?? 0}</span>
          </button>
          {GENRES.map((g) => (
            <button
              key={g.id}
              type="button"
              className={`pill ${p.genre === g.id ? "on" : ""}`}
              disabled={!p.genreCounts[g.id]}
              onClick={() => {
                p.chooseGenre(g.id);
                if (g.id !== "drinks") setSheet(null);
              }}
            >
              {g.label} <span className="n">{p.genreCounts[g.id] ?? 0}</span>
            </button>
          ))}
        </div>
        {p.genre === "drinks" && (
          <>
            <p className="sh-sub">What kind of bar?</p>
            <div className="pill-grid">
              <button type="button" className={`pill ${p.drink === "all" ? "on" : ""}`} onClick={() => (p.setDrink("all"), setSheet(null))}>
                Any bar
              </button>
              {DRINK_KINDS.map((d) => (
                <button key={d.id} type="button" className={`pill ${p.drink === d.id ? "on" : ""}`} onClick={() => (p.setDrink(d.id), setSheet(null))}>
                  {d.label}
                </button>
              ))}
            </div>
          </>
        )}
      </Sheet>
      <Sheet
        open={sheet === "price"}
        onClose={() => setSheet(null)}
        title="Price"
        foot={
          <button type="button" className="btn btn-ink btn-block" onClick={() => setSheet(null)}>
            Show {p.list.length} places
          </button>
        }
      >
        <div className="price-row">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              className={`price-btn ${p.prices.includes(n) ? "on" : ""}`}
              aria-pressed={p.prices.includes(n)}
              onClick={() => p.setPrices((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n]))}
            >
              <b>{priceLabel(n)}</b>
              <span>{["Cheap", "Moderate", "Pricier", "Splurge"][n - 1]}</span>
            </button>
          ))}
        </div>
      </Sheet>
      <Sheet open={sheet === "sort"} onClose={() => setSheet(null)} title="Sort by">
        <div className="radio-list">
          {SORTS.map((s) => (
            <button key={s.id} type="button" className={`radio ${p.sort === s.id ? "on" : ""}`} aria-pressed={p.sort === s.id} onClick={() => (p.pickSort(s.id), setSheet(null))}>
              <span>{s.label}</span>
              {p.sort === s.id && <Icon name="check" size={18} />}
            </button>
          ))}
        </div>
        <p className="sh-note">Nobody can pay to move up. The order is the sort alone.</p>
      </Sheet>
    </>
  );

  if (p.mapMode && p.isMobile)
    return (
      <div className="ex-mapmode">
        <div className="mm-top">
          {filters}
        </div>
        <div className="mm-map">{p.map}</div>
        <button type="button" className="mm-list" onClick={() => p.setMapMode(false)}>
          <Icon name="grid" size={16} /> Covers
        </button>
        <MapCards list={p.list} focusId={p.focusId} onFocus={p.onFocus} onOpen={p.onOpen} />
        {sheets}
      </div>
    );

  return (
    <div className={`explore ${p.mapMode ? "split" : ""}`}>
      <div className="ex-main">
        <div className="ex-head">
          {search}
          {filters}
        </div>
        {head}
        {p.sponsoredPick && !p.mapMode && (
          <aside className="spons" aria-label="Sponsored">
            <button className="spons-card" onClick={() => p.onOpen(p.sponsoredPick!.id)}>
              <span className="spons-img">
                <Poster spot={p.sponsoredPick} sizes="120px" />
              </span>
              <span className="spons-t">
                <span className="paid">Sponsored</span>
                <b>{p.sponsoredPick.name}</b>
                <span>{p.sponsoredPick.knownFor}</span>
              </span>
            </button>
          </aside>
        )}
        {p.mapMode ? (
          <ol className="rows">
            {p.list.slice(0, shown).map((s, i) => (
              <Row key={s.id} spot={s} n={i + 1} rating={p.ratings[s.id]} hot={p.hoveredId === s.id} onOpen={p.onOpen} onHover={p.onHover} miles={p.milesTo?.(s)} />
            ))}
          </ol>
        ) : (
          <ul className="grid">
            {p.list.slice(0, shown).map((s, i) => (
              <Tile key={s.id} spot={s} rating={p.ratings[s.id]} onOpen={p.onOpen} onHover={p.onHover} eager={i < 4} miles={p.milesTo?.(s)} />
            ))}
          </ul>
        )}
        {p.list.length > shown && <More onMore={() => setShown((n) => n + 24)} left={p.list.length - shown} />}
        {p.list.length === 0 && p.empty}
        {!p.mapMode && p.foot}
      </div>
      {p.mapMode && <div className="ex-map">{p.map}</div>}
      {sheets}
    </div>
  );
}

const Tile = memo(function Tile({
  spot,
  rating,
  onOpen,
  onHover,
  eager,
  miles,
}: {
  spot: Spot;
  rating?: { avg: number; count: number };
  onOpen: (id: string) => void;
  onHover: (id: string | null) => void;
  eager?: boolean;
  miles?: number;
}) {
  const { been, saved } = useApp();
  return (
    <li>
      <button className="tile" onClick={() => onOpen(spot.id)} onMouseEnter={() => onHover(spot.id)} onMouseLeave={() => onHover(null)}>
        <Poster spot={spot} eager={eager}>
          {been[spot.id] ? <span className="mark mark-been" aria-label="Been" /> : saved.includes(spot.id) ? <span className="mark mark-saved" aria-label="Want to try" /> : null}
          {spot.sponsored && <span className="paid on-cover">Sponsored</span>}
        </Poster>
        <span className="tile-name">{spot.name}</span>
        <span className="tile-meta">
          {miles !== undefined ? `${miles < 0.1 ? "0.1" : miles.toFixed(1)} mi · ` : ""}
          {GENRE_BY_ID[spot.genres[0]]?.short} · {priceLabel(spot.price)}
        </span>
        <span className="tile-meta">
          {areaLabelOf(spot).split(" & ")[0]}
          {rating && rating.count >= AVG_MIN ? (
            <span className="tile-score">
              {" "}
              · <Icon name="star" size={11} fill /> {rating.avg.toFixed(1)}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
});

const Row = memo(function Row({
  spot,
  n,
  rating,
  hot,
  onOpen,
  onHover,
  miles,
}: {
  spot: Spot;
  n: number;
  rating?: { avg: number; count: number };
  hot: boolean;
  onOpen: (id: string) => void;
  onHover: (id: string | null) => void;
  miles?: number;
}) {
  return (
    <li className={hot ? "hot" : ""} onMouseEnter={() => onHover(spot.id)} onMouseLeave={() => onHover(null)}>
      <button className="row-btn" onClick={() => onOpen(spot.id)}>
        <span className="row-n">{n}</span>
        <Thumb spot={spot} w={56} />
        <span className="row-t">
          <b>{spot.name}</b>
          <span>
            {miles !== undefined ? `${miles < 0.1 ? "0.1" : miles.toFixed(1)} mi · ` : ""}
            {GENRE_BY_ID[spot.genres[0]]?.short} · {areaLabelOf(spot)} · {priceLabel(spot.price)}
            {rating && rating.count >= AVG_MIN ? ` · ${rating.avg.toFixed(1)}★` : ""}
          </span>
        </span>
      </button>
    </li>
  );
});

/** draws the next covers when it scrolls into view; a button too, for keyboards */
function More({ onMore, left }: { onMore: () => void; left: number }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && onMore(), { rootMargin: "900px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [onMore, left]);
  return (
    <button ref={ref} type="button" className="more-btn" onClick={onMore}>
      Show {left} more
    </button>
  );
}
