"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Dices, Heart, LogOut, Search, SlidersHorizontal, X } from "lucide-react";
import {
  AREAS,
  AREA_BY_ID,
  DRINK_KINDS,
  GENRES,
  GENRE_BY_ID,
  SPOTS,
  SPOT_BY_ID,
  priceLabel,
  type AreaId,
  type DrinkKind,
  type GenreId,
  type Spot,
} from "@/lib/data";
import type { RatingSummary } from "@/lib/backend";
import { useApp } from "./Providers";
import { GenreIcon } from "./Icon";
import Storefront from "./Storefront";
import SpotDetail from "./SpotDetail";
import Surprise from "./Surprise";
import { Stars } from "./Stars";

const MapView = dynamic(() => import("./MapView"), { ssr: false, loading: () => <div className="leaflet-host map-loading" /> });

type Sort = "popular" | "rating" | "az";

const TICKER = [
  "No drive-thrus. No chains. Just Birmingham.",
  "White sauce is a food group",
  "Market at Pepper Place — Saturdays, get there early",
  "Over the mountain or under the furnace, we've got you",
  "The Magic City, est. 1871",
  "Reviews by locals, for locals",
  "Tip your bartender",
];

export default function Explorer({ initialSpot }: { initialSpot?: string }) {
  const { backend, user, openAuth, saved, toast } = useApp();
  const [genre, setGenre] = useState<GenreId | "all">("all");
  const [drink, setDrink] = useState<DrinkKind | "all">("all");
  const [area, setArea] = useState<AreaId | "all">("all");
  const [query, setQuery] = useState("");
  const [prices, setPrices] = useState<number[]>([]);
  const [sort, setSort] = useState<Sort>("popular");
  const [savedOnly, setSavedOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(initialSpot ?? null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [surprise, setSurprise] = useState(false);
  const [moreFilters, setMoreFilters] = useState(false);
  const [ratings, setRatings] = useState<RatingSummary>({});
  const [userMenu, setUserMenu] = useState(false);
  const q = useDeferredValue(query);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const hydrated = useRef(false);

  /* ---------- URL <-> state ---------- */
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const g = p.get("g") as GenreId | null;
    const a = p.get("a") as AreaId | null;
    const d = p.get("d") as DrinkKind | null;
    const s = p.get("s");
    if (g && GENRE_BY_ID[g]) setGenre(g);
    if (a && AREA_BY_ID[a]) setArea(a);
    if (d && DRINK_KINDS.some((k) => k.id === d)) setDrink(d);
    if (s && SPOT_BY_ID[s]) setSelectedId(s);
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    const p = new URLSearchParams();
    if (genre !== "all") p.set("g", genre);
    if (genre === "drinks" && drink !== "all") p.set("d", drink);
    if (area !== "all") p.set("a", area);
    const path = selectedId ? `/spot/${selectedId}` : "/";
    const qs = p.toString();
    history.replaceState(null, "", qs ? `${path}?${qs}` : path);
    document.title = selectedId ? `${SPOT_BY_ID[selectedId].name} · The Local` : "The Local — Birmingham's independent food & drink map";
  }, [genre, drink, area, selectedId]);

  useEffect(() => {
    backend.ratings().then(setRatings).catch(() => {});
  }, [backend, selectedId]);

  /* ---------- filtering ---------- */
  const matchesBase = useCallback(
    (s: Spot) => {
      if (genre !== "all" && !s.genres.includes(genre)) return false;
      if (genre === "drinks" && drink !== "all" && !s.drinks?.includes(drink)) return false;
      if (prices.length && !prices.includes(s.price)) return false;
      if (savedOnly && !saved.includes(s.id)) return false;
      if (q.trim()) {
        const t = q.trim().toLowerCase();
        const hay = `${s.name} ${s.knownFor} ${s.tags.join(" ")} ${s.genres.map((g) => GENRE_BY_ID[g].label).join(" ")} ${AREA_BY_ID[s.area].label}`.toLowerCase();
        if (!hay.includes(t)) return false;
      }
      return true;
    },
    [genre, drink, prices, savedOnly, saved, q]
  );

  const list = useMemo(() => {
    const out = SPOTS.filter((s) => matchesBase(s) && (area === "all" || s.area === area));
    const r = (s: Spot) => ratings[s.id]?.avg ?? 0;
    out.sort((a, b) => {
      if (!!b.sponsored !== !!a.sponsored) return b.sponsored ? 1 : -1;
      if (sort === "az") return a.name.localeCompare(b.name);
      if (sort === "rating") return r(b) - r(a) || b.pop - a.pop;
      return b.pop - a.pop;
    });
    return out;
  }, [matchesBase, area, sort, ratings]);

  const visible = useMemo(() => new Set(list.map((s) => s.id)), [list]);

  const genreCounts = useMemo(() => {
    const c: Record<string, number> = { all: 0 };
    for (const s of SPOTS) {
      if (area !== "all" && s.area !== area) continue;
      c.all++;
      s.genres.forEach((g) => (c[g] = (c[g] ?? 0) + 1));
    }
    return c;
  }, [area]);

  const areaCounts = useMemo(() => {
    const c: Record<string, number> = { all: 0 };
    for (const s of SPOTS) {
      if (!matchesBase(s)) continue;
      c.all++;
      c[s.area] = (c[s.area] ?? 0) + 1;
    }
    return c;
  }, [matchesBase]);

  /* ---------- actions ---------- */
  const select = useCallback((id: string | null) => {
    setSelectedId(id);
    setHoveredId(null);
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    if (window.innerWidth < 900) window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const chooseGenre = (g: GenreId | "all") => {
    setGenre((cur) => (cur === g && g !== "all" ? "all" : g));
    setDrink("all");
    select(null);
  };
  const chooseArea = useCallback(
    (a: AreaId | "all") => {
      setArea((cur) => (cur === a && a !== "all" ? "all" : a));
      select(null);
    },
    [select]
  );

  // keyboard: "/" search, "s" surprise, arrows browse, Esc back
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || surprise) return;
      if (e.key === "/") {
        e.preventDefault();
        select(null);
        setTimeout(() => searchRef.current?.focus(), 50);
      } else if (e.key.toLowerCase() === "s" && !e.metaKey && !e.ctrlKey) {
        setSurprise(true);
      } else if (e.key === "Escape" && selectedId) {
        select(null);
      } else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && list.length) {
        e.preventDefault();
        const i = list.findIndex((s) => s.id === (selectedId ?? hoveredId));
        const n = e.key === "ArrowDown" ? Math.min(list.length - 1, i + 1) : Math.max(0, i - 1);
        select(list[n].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [list, selectedId, hoveredId, surprise, select]);

  const selected = selectedId ? SPOT_BY_ID[selectedId] : null;
  const activeGenre = genre === "all" ? null : GENRE_BY_ID[genre];
  const activeArea = area === "all" ? null : AREA_BY_ID[area];
  const filtersOn = prices.length > 0 || savedOnly || sort !== "popular";

  const mapTitle = selected ? selected.name : activeArea ? activeArea.label : "Birmingham";
  const mapSub = selected
    ? `${AREA_BY_ID[selected.area].label} · ${selected.knownFor}`
    : `${list.length} ${list.length === 1 ? "spot" : "spots"}${activeGenre ? ` · ${activeGenre.label}` : ""}${activeArea ? "" : " · all neighborhoods"}`;

  return (
    <div className="app">
      {/* ================= TOP BAR ================= */}
      <header className="topbar">
        <button className="brand" onClick={() => (chooseGenre("all"), chooseArea("all"))} aria-label="The Local — home">
          <Logo />
          <span className="brand-words">
            <span className="brand-the">the</span>
            <span className="brand-local">LOCAL</span>
          </span>
          <span className="brand-tag">Birmingham, AL · independent eats &amp; drinks</span>
        </button>
        <nav className="top-actions">
          <Link href="/partners" className="top-link">
            For restaurants <ArrowUpRight size={14} />
          </Link>
          <button className={`icon-btn on-dark ${savedOnly ? "saved" : ""}`} onClick={() => (setSavedOnly((v) => !v), select(null))} aria-pressed={savedOnly} title="Your saved spots">
            <Heart size={17} fill={savedOnly ? "currentColor" : "none"} />
            {saved.length > 0 && <span className="badge">{saved.length}</span>}
          </button>
          <motion.button className="btn btn-ember surprise-btn" onClick={() => setSurprise(true)} whileTap={{ scale: 0.94, rotate: -2 }}>
            <Dices size={17} className="dice" /> <span>Surprise me</span>
          </motion.button>
          {user ? (
            <div className="user-wrap">
              <button className="avatar avatar-btn" onClick={() => setUserMenu((v) => !v)} aria-label="Account">
                {user.name.slice(0, 1).toUpperCase()}
              </button>
              <AnimatePresence>
                {userMenu && (
                  <motion.div className="user-menu" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                    <strong>{user.name}</strong>
                    <span className="mono-sm">{user.email}</span>
                    <button
                      className="link-btn"
                      onClick={() => {
                        backend.signOut();
                        setUserMenu(false);
                        toast("Signed out. See you around.");
                      }}
                    >
                      <LogOut size={13} /> Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <button className="btn btn-outline-light btn-sm" onClick={() => openAuth()}>
              Sign in
            </button>
          )}
        </nav>
      </header>

      <div className="ticker" aria-hidden>
        <div className="ticker-track">
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i}>
              {t} <b>✦</b>
            </span>
          ))}
        </div>
      </div>

      <main className="main">
        {/* ================= SIDEBAR (30%) ================= */}
        <aside className="sidebar">
          <div className="sidebar-scroll" ref={scrollRef}>
            <AnimatePresence mode="wait" initial={false}>
              {selected ? (
                <SpotDetail key={selected.id} spot={selected} onBack={() => select(null)} onSelect={select} />
              ) : (
                <motion.div key="browse" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }}>
                  <section className="panel">
                    <div className="eyebrow-row">
                      <h2 className="eyebrow">
                        <span className="num">01</span> What are you craving?
                      </h2>
                    </div>
                    
                      <div className="genres">
                        <GenreChip active={genre === "all"} label="Everything" icon="all" color="#1C1714" count={genreCounts.all} onClick={() => chooseGenre("all")} />
                        {GENRES.map((g) => (
                          <GenreChip
                            key={g.id}
                            active={genre === g.id}
                            label={g.label}
                            icon={g.icon}
                            color={g.color}
                            count={genreCounts[g.id] ?? 0}
                            onClick={() => chooseGenre(g.id)}
                          />
                        ))}
                      </div>
                    
                    <AnimatePresence>
                      {genre === "drinks" && (
                        <motion.div className="subchips" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                          {[{ id: "all" as const, label: "All drinks" }, ...DRINK_KINDS].map((k) => (
                            <button key={k.id} className={`subchip ${drink === k.id ? "on" : ""}`} onClick={() => setDrink(k.id)}>
                              {k.label}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {activeGenre && (
                      <motion.p key={activeGenre.id} className="genre-tagline" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                        “{activeGenre.tagline}”
                      </motion.p>
                    )}
                  </section>

                  <section className="panel">
                    <h2 className="eyebrow">
                      <span className="num">02</span> Pick a part of town
                    </h2>
                    <div className="areas">
                      <AreaPill active={area === "all"} label="All of Birmingham" count={areaCounts.all} onClick={() => chooseArea("all")} />
                      {AREAS.map((a) => (
                        <AreaPill key={a.id} active={area === a.id} label={a.label} count={areaCounts[a.id] ?? 0} onClick={() => chooseArea(a.id)} />
                      ))}
                    </div>
                    {activeArea && <p className="area-blurb">{activeArea.blurb}</p>}
                  </section>

                  <section className="panel tight">
                    <div className="search-row">
                      <label className="search">
                        <Search size={16} />
                        <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search oysters, patio, brunch…" aria-label="Search" />
                        {query && (
                          <button onClick={() => setQuery("")} aria-label="Clear search">
                            <X size={14} />
                          </button>
                        )}
                        <kbd>/</kbd>
                      </label>
                      <button className={`icon-btn square ${moreFilters || filtersOn ? "active" : ""}`} onClick={() => setMoreFilters((v) => !v)} aria-label="More filters" aria-expanded={moreFilters}>
                        <SlidersHorizontal size={16} />
                      </button>
                    </div>
                    <AnimatePresence>
                      {moreFilters && (
                        <motion.div className="more-filters" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                          <div className="filter-group">
                            <span className="mono-sm">Price</span>
                            {[1, 2, 3, 4].map((p) => (
                              <button key={p} className={`subchip ${prices.includes(p) ? "on" : ""}`} onClick={() => setPrices((x) => (x.includes(p) ? x.filter((y) => y !== p) : [...x, p]))}>
                                {priceLabel(p)}
                              </button>
                            ))}
                          </div>
                          <div className="filter-group">
                            <span className="mono-sm">Sort</span>
                            {(
                              [
                                ["popular", "Local favorites"],
                                ["rating", "Top rated"],
                                ["az", "A–Z"],
                              ] as [Sort, string][]
                            ).map(([k, l]) => (
                              <button key={k} className={`subchip ${sort === k ? "on" : ""}`} onClick={() => setSort(k)}>
                                {l}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>

                  <div className="results-head">
                    <span className="mono-sm">
                      {list.length} {list.length === 1 ? "spot" : "spots"}
                      {savedOnly && " · saved"}
                    </span>
                    {(genre !== "all" || area !== "all" || query || filtersOn) && (
                      <button
                        className="link-btn"
                        onClick={() => {
                          setGenre("all");
                          setArea("all");
                          setDrink("all");
                          setQuery("");
                          setPrices([]);
                          setSavedOnly(false);
                          setSort("popular");
                        }}
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <ol className="spot-list">
                    <AnimatePresence initial={false}>
                      {list.map((s, i) => (
                        <SpotRow
                          key={s.id}
                          spot={s}
                          index={i}
                          rating={ratings[s.id]}
                          hot={hoveredId === s.id}
                          saved={saved.includes(s.id)}
                          onHover={setHoveredId}
                          onClick={() => select(s.id)}
                          injectAd={i === 4 && list.length > 6}
                        />
                      ))}
                    </AnimatePresence>
                  </ol>

                  {list.length === 0 && (
                    <div className="empty">
                      <p className="display">Nothing on this block — yet.</p>
                      <p className="muted small">Try another neighborhood, or let us pick for you.</p>
                      <button className="btn btn-rust btn-sm" onClick={() => setSurprise(true)}>
                        <Dices size={14} /> Surprise me
                      </button>
                    </div>
                  )}

                  <Newsletter />
                  <footer className="side-foot">
                    <span>Independent spots only — no fast food, no national chains.</span>
                    <span>
                      Pins are approximate. Spot closed or missing? <Link href="/partners#contact">Tell us</Link>.
                    </span>
                    <span>© {new Date().getFullYear()} The Local · Made in the Magic City</span>
                  </footer>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </aside>

        {/* ================= MAP (70%) ================= */}
        <section className="mapwrap" style={{ ["--c" as string]: selected ? GENRE_BY_ID[selected.genres[0]].color : activeGenre?.color ?? "#E2793A" }}>
          <MapView spots={SPOTS} visible={visible} selectedId={selectedId} hoveredId={hoveredId} area={area} onSelect={select} onHover={setHoveredId} onArea={chooseArea} />
          <div className="map-vignette" aria-hidden />
          <div className="map-frame" aria-hidden />
          <div className="map-title" aria-live="polite">
            <AnimatePresence mode="wait">
              <motion.div key={mapTitle} initial={{ opacity: 0, y: 18, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }}>
                <span className="map-kicker">{selected ? "Now showing" : activeArea ? "Neighborhood" : "The Magic City"}</span>
                <h2 className="map-h">{mapTitle}</h2>
                <span className="map-sub">{mapSub}</span>
              </motion.div>
            </AnimatePresence>
          </div>
          <Compass spin={(selectedId ?? "") + area + genre} />
          <div className="map-legend">
            {(activeGenre ? [activeGenre] : GENRES.slice(0, 12)).map((g) => (
              <button key={g.id} onClick={() => chooseGenre(g.id)} style={{ ["--c" as string]: g.color }}>
                <i /> {g.short}
              </button>
            ))}
          </div>
        </section>
      </main>

      <button className="fab" onClick={() => setSurprise(true)} aria-label="Surprise me">
        <Dices size={22} />
      </button>

      <Surprise
        open={surprise}
        onClose={() => setSurprise(false)}
        all={SPOTS}
        filtered={list}
        onGo={(id) => {
          setSurprise(false);
          const s = SPOT_BY_ID[id];
          if (area !== "all" && s.area !== area) setArea("all");
          select(id);
        }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- */

function GenreChip({ active, label, icon, color, count, onClick }: { active: boolean; label: string; icon: string; color: string; count: number; onClick: () => void }) {
  return (
    <motion.button
      className={`chip ${active ? "on" : ""} ${count === 0 ? "empty" : ""}`}
      style={{ ["--c" as string]: color }}
      onClick={onClick}
      whileTap={{ scale: 0.93 }}
      aria-pressed={active}
    >
      <GenreIcon name={icon} size={15} strokeWidth={2.2} />
      <span>{label}</span>
      <span className="chip-count">{count}</span>
    </motion.button>
  );
}

function AreaPill({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button className={`area ${active ? "on" : ""} ${count === 0 ? "empty" : ""}`} onClick={onClick} aria-pressed={active}>
      {label}
      <span>{count}</span>
    </button>
  );
}

function SpotRow({
  spot,
  index,
  rating,
  hot,
  saved,
  onHover,
  onClick,
  injectAd,
}: {
  spot: Spot;
  index: number;
  rating?: { avg: number; count: number };
  hot: boolean;
  saved: boolean;
  onHover: (id: string | null) => void;
  onClick: () => void;
  injectAd: boolean;
}) {
  const g = GENRE_BY_ID[spot.genres[0]];
  return (
    <>
      <motion.li
        layout="position"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index, 12) * 0.03 } }}
        exit={{ opacity: 0, x: -16, transition: { duration: 0.15 } }}
        className={`spot ${hot ? "hot" : ""}`}
        style={{ ["--c" as string]: g.color }}
        onMouseEnter={() => onHover(spot.id)}
        onMouseLeave={() => onHover(null)}
      >
        <button onClick={onClick} className="spot-btn">
          <span className="spot-num">{String(index + 1).padStart(2, "0")}</span>
          <span className="spot-art">
            <Storefront spot={spot} mini />
          </span>
          <span className="spot-main">
            <span className="spot-name">
              {spot.name}
              {saved && <Heart size={12} fill="currentColor" className="saved-heart" />}
            </span>
            <span className="spot-meta">
              {g.short} · {AREA_BY_ID[spot.area].label} · {priceLabel(spot.price)}
              {spot.sponsored && <span className="sponsored">Sponsored</span>}
            </span>
            <span className="spot-known">{spot.knownFor}</span>
          </span>
          <span className="spot-side">
            {rating ? (
              <>
                <span className="spot-score">{rating.avg.toFixed(1)}</span>
                <Stars value={rating.avg} size={10} />
              </>
            ) : (
              <span className="spot-new">Be first</span>
            )}
            <ArrowUpRight size={16} className="spot-arrow" />
          </span>
        </button>
      </motion.li>
      {injectAd && (
        <motion.li layout="position" className="ad-slot" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Link href="/partners">
            <span className="stamp light">Your spot here</span>
            <strong className="display">Run a local spot?</strong>
            <span>Get featured where Birmingham decides where to eat tonight.</span>
            <span className="ad-cta">
              See partner plans <ArrowUpRight size={14} />
            </span>
          </Link>
        </motion.li>
      )}
    </>
  );
}

function Newsletter() {
  const { backend, toast } = useApp();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  return (
    <form
      className="newsletter"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await backend.subscribe(email.trim());
          setDone(true);
          toast("You're on the list ✦", "ok");
        } catch {
          toast("Couldn't subscribe — try again", "err");
        }
      }}
    >
      <span className="stamp light">The Weekly Plate</span>
      <p className="display">Five local spots in your inbox every Thursday.</p>
      {done ? (
        <p className="mono-sm">Thanks — see you Thursday.</p>
      ) : (
        <div className="row gap6">
          <input type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
          <button className="btn btn-ember btn-sm">Subscribe</button>
        </div>
      )}
    </form>
  );
}

function Logo() {
  return (
    <svg viewBox="0 0 40 40" width="38" height="38" aria-hidden className="logo">
      <rect x="1" y="1" width="38" height="38" rx="9" fill="#B4502A" />
      <rect x="1" y="1" width="38" height="38" rx="9" fill="none" stroke="#F4ECDD" strokeOpacity=".25" />
      <path d="M20 7c-5.5 0-9.5 4.1-9.5 9.3 0 6.6 9.5 16.7 9.5 16.7s9.5-10.1 9.5-16.7C29.5 11.1 25.5 7 20 7Z" fill="#F4ECDD" />
      <path d="M17 11.5v5.2c0 1 .6 1.7 1.6 1.9V25h2.8v-6.4c1-.2 1.6-.9 1.6-1.9v-5.2h-1.4v4.4h-.9v-4.4h-1.4v4.4h-.9v-4.4H17Z" fill="#1C1714" />
    </svg>
  );
}

function Compass({ spin }: { spin: string }) {
  const [rot, setRot] = useState(0);
  useEffect(() => {
    setRot((r) => r + 40 + Math.random() * 60);
    const t = setTimeout(() => setRot((r) => Math.round(r / 360) * 360), 700);
    return () => clearTimeout(t);
  }, [spin]);
  return (
    <div className="compass" aria-hidden>
      <svg viewBox="0 0 100 100" style={{ transform: `rotate(${rot}deg)` }}>
        <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeOpacity=".35" />
        <circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" strokeOpacity=".2" strokeDasharray="1 4" />
        <path d="M50 8 58 50 50 92 42 50Z" fill="currentColor" fillOpacity=".25" />
        <path d="M50 8 58 50H42Z" fill="var(--c)" />
        <path d="M8 50 50 44 92 50 50 56Z" fill="currentColor" fillOpacity=".18" />
        <text x="50" y="6" textAnchor="middle" fontSize="9" fill="currentColor" fontFamily="'Big Shoulders Display'" fontWeight="800" transform="translate(0 0)">
          N
        </text>
      </svg>
    </div>
  );
}
