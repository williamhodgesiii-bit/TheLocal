"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  DRINK_KINDS,
  GENRES,
  GENRE_BY_ID,
  SPOTS,
  areaLabelOf,
  deriveAreas,
  priceLabel,
  type AreaId,
  type DrinkKind,
  type GenreId,
  type Spot,
} from "@/lib/data";
import type { RatingSummary } from "@/lib/backend";
import { CITY_BY_ID, DEFAULT_CITY, HOME_KEY, apState, cityPath, stateName, type City } from "@/lib/regions";
import CityPicker from "./CityPicker";
import SubmitSpot from "./SubmitSpot";
import MySubmissions from "./MySubmissions";
import { useApp } from "./Providers";
import SpotDetail from "./SpotDetail";
import Surprise from "./Surprise";
import Circled from "./Circled";

const MapView = dynamic(() => import("./MapView"), { ssr: false, loading: () => <div className="leaflet-host map-loading" /> });

type Sort = "popular" | "rating" | "az";
const SEEN_KEY = "tl.seenApproved";

export default function Explorer({ cityId, initialSpot, initialSpotData }: { cityId?: string; initialSpot?: string; initialSpotData?: Spot }) {
  const { backend, user, openAuth, requireAuth, saved, toast } = useApp();
  const router = useRouter();
  const [city, setCity] = useState<City>(CITY_BY_ID[cityId ?? initialSpotData?.city ?? DEFAULT_CITY] ?? CITY_BY_ID[DEFAULT_CITY]);
  const [community, setCommunity] = useState<Spot[]>(initialSpotData ? [initialSpotData] : []);
  const [picker, setPicker] = useState<{ open: boolean; first: boolean }>({ open: false, first: false });
  const [adding, setAdding] = useState(false);
  const [mine, setMine] = useState(false);
  const [admin, setAdmin] = useState(false);
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

  /* ---------- city ---------- */
  // "/" has no city in the URL: use the member's home city, or ask on first visit
  useEffect(() => {
    if (cityId || initialSpot) return;
    let home: string | null = null;
    try {
      home = localStorage.getItem(HOME_KEY);
    } catch {
      /* ignore */
    }
    if (!home) setPicker({ open: true, first: true });
    else if (home !== DEFAULT_CITY && CITY_BY_ID[home]) router.replace(cityPath(CITY_BY_ID[home]));
  }, [cityId, initialSpot, router]);

  // back/forward between city routes
  useEffect(() => {
    if (cityId && CITY_BY_ID[cityId] && cityId !== city.id) {
      setCity(CITY_BY_ID[cityId]);
      setArea("all");
      setSelectedId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityId]);

  const pickCity = (c: City) => {
    try {
      localStorage.setItem(HOME_KEY, c.id);
    } catch {
      /* ignore */
    }
    setPicker({ open: false, first: false });
    if (c.id !== city.id) {
      setCity(c);
      setArea("all");
      setSelectedId(null);
      router.push(cityPath(c));
    }
  };

  const loadCommunity = useCallback(() => {
    backend
      .listSpots(city.id)
      .then((list) => setCommunity(initialSpotData && !list.some((l) => l.id === initialSpotData.id) ? [...list, initialSpotData] : list))
      .catch(() => {});
  }, [backend, city.id, initialSpotData]);
  useEffect(loadCommunity, [loadCommunity]);

  useEffect(() => {
    if (!user) return setAdmin(false);
    backend.isAdmin().then(setAdmin).catch(() => setAdmin(false));
    // let members know when a spot they added has been verified
    backend
      .mySubmissions()
      .then((subs) => {
        let seen: string[] = [];
        try {
          seen = JSON.parse(localStorage.getItem(SEEN_KEY) || "[]");
        } catch {
          /* ignore */
        }
        const fresh = subs.filter((x) => x.status !== "pending" && !seen.includes(x.id));
        fresh.forEach((x) =>
          toast(x.status === "approved" ? `${x.name} checked out. It's on the map now.` : `${x.name} wasn't approved. Your spots has the reason.`, x.status === "approved" ? "ok" : undefined)
        );
        if (fresh.length) localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, ...fresh.map((x) => x.id)]));
      })
      .catch(() => {});
  }, [user, backend, toast]);

  const allSpots = useMemo(() => {
    const seed = city.id === DEFAULT_CITY ? SPOTS : [];
    const seedIds = new Set(seed.map((x) => x.id));
    return [...seed, ...community.filter((x) => x.city === city.id && !seedIds.has(x.id))];
  }, [city.id, community]);
  const spotById = useMemo(() => Object.fromEntries(allSpots.map((x) => [x.id, x])) as Record<string, Spot>, [allSpots]);
  const areas = useMemo(() => deriveAreas(city.id, allSpots), [city.id, allSpots]);
  const areaById = useMemo(() => Object.fromEntries(areas.map((a) => [a.id, a])), [areas]);

  /* ---------- URL <-> state ---------- */
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const g = p.get("g") as GenreId | null;
    const a = p.get("a") as AreaId | null;
    const d = p.get("d") as DrinkKind | null;
    const s = p.get("s");
    if (g && GENRE_BY_ID[g]) setGenre(g);
    if (a) setArea(a);
    if (d && DRINK_KINDS.some((k) => k.id === d)) setDrink(d);
    if (s) setSelectedId(s);
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    const p = new URLSearchParams();
    if (genre !== "all") p.set("g", genre);
    if (genre === "drinks" && drink !== "all") p.set("d", drink);
    if (area !== "all") p.set("a", area);
    const sel = selectedId ? spotById[selectedId] : null;
    const path = sel ? `/spot/${sel.id}` : cityPath(city);
    const qs = p.toString();
    history.replaceState(null, "", qs ? `${path}?${qs}` : path);
    document.title = sel ? `${sel.name} · The Local` : `The Local · ${city.name} restaurants, coffee & bars`;
  }, [genre, drink, area, selectedId, spotById, city]);

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
        const hay = `${s.name} ${s.knownFor} ${s.tags.join(" ")} ${s.genres.map((g) => GENRE_BY_ID[g].label).join(" ")} ${areaLabelOf(s)}`.toLowerCase();
        if (!hay.includes(t)) return false;
      }
      return true;
    },
    [genre, drink, prices, savedOnly, saved, q]
  );

  const list = useMemo(() => {
    const out = allSpots.filter((s) => matchesBase(s) && (area === "all" || s.area === area));
    const r = (s: Spot) => ratings[s.id]?.avg ?? 0;
    out.sort((a, b) => {
      if (!!b.sponsored !== !!a.sponsored) return b.sponsored ? 1 : -1;
      if (sort === "az") return a.name.localeCompare(b.name);
      if (sort === "rating") return r(b) - r(a) || b.pop - a.pop;
      return b.pop - a.pop;
    });
    return out;
  }, [allSpots, matchesBase, area, sort, ratings]);

  const visible = useMemo(() => new Set(list.map((s) => s.id)), [list]);

  const genreCounts = useMemo(() => {
    const c: Record<string, number> = { all: 0 };
    for (const s of allSpots) {
      if (area !== "all" && s.area !== area) continue;
      c.all++;
      s.genres.forEach((g) => (c[g] = (c[g] ?? 0) + 1));
    }
    return c;
  }, [allSpots, area]);

  const areaCounts = useMemo(() => {
    const c: Record<string, number> = { all: 0 };
    for (const s of allSpots) {
      if (!matchesBase(s)) continue;
      c.all++;
      c[s.area] = (c[s.area] ?? 0) + 1;
    }
    return c;
  }, [allSpots, matchesBase]);

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

  const selected = selectedId ? spotById[selectedId] ?? null : null;
  const activeGenre = genre === "all" ? null : GENRE_BY_ID[genre];
  const activeArea = area === "all" ? null : areaById[area] ?? null;
  const founding = city.status === "founding";
  const openAdd = () => {
    if (requireAuth(`Sign in to add a place in ${city.name}. We check every one before it goes up.`)) setAdding(true);
  };
  const filtersOn = prices.length > 0 || savedOnly || sort !== "popular";

  const numbers = useMemo(() => Object.fromEntries(list.map((s, i) => [s.id, i + 1])) as Record<string, number>, [list]);
  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }));
  }, []);

  const mapTitle = selected ? selected.name : activeArea ? activeArea.label : city.name;
  const mapSub = selected
    ? `${areaLabelOf(selected)}. ${selected.address}`
    : `${list.length} ${list.length === 1 ? "place" : "places"}${activeGenre ? `, ${activeGenre.label.toLowerCase()}` : ""}${activeArea ? "" : ", all over town"}`;
  const resetAll = () => {
    setGenre("all");
    setArea("all");
    setDrink("all");
    setQuery("");
    setPrices([]);
    setSavedOnly(false);
    setSort("popular");
  };
  const surpriseOrAdd = () => (allSpots.length ? setSurprise(true) : openAdd());

  return (
    <div className="app">
      <header className="masthead">
        <div className="mast-row">
          <button className="brand" onClick={() => (resetAll(), select(null))} aria-label="The Local, home">
            <span className="brand-script">The Local</span>
            <span className="brand-sub">
              {city.name}, {apState(city.state)}
            </span>
          </button>
          <nav className="mast-nav">
            <button className="navlink hide-sm" onClick={() => setPicker({ open: true, first: false })}>
              Change city
            </button>
            <button className="navlink hide-sm" onClick={openAdd}>
              Add a place
            </button>
            <Link className="navlink hide-md" href="/partners">
              For restaurants
            </Link>
            <button className={`navlink ${savedOnly ? "on" : ""}`} onClick={() => (setSavedOnly((v) => !v), select(null))} aria-pressed={savedOnly}>
              Saved{saved.length ? ` (${saved.length})` : ""}
            </button>
            {user ? (
              <div className="user-wrap">
                <button className="navlink" onClick={() => setUserMenu((v) => !v)} aria-expanded={userMenu}>
                  {user.name.split(" ")[0]} ▾
                </button>
                <AnimatePresence>
                  {userMenu && (
                    <motion.div className="user-menu" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                      <span className="um-name">{user.name}</span>
                      <span className="um-mail">{user.email}</span>
                      <button className="menu-item" onClick={() => (setMine(true), setUserMenu(false))}>
                        Places you&apos;ve added
                      </button>
                      {admin && (
                        <Link className="menu-item" href="/admin">
                          Verification desk
                        </Link>
                      )}
                      <button
                        className="menu-item"
                        onClick={() => {
                          backend.signOut();
                          setUserMenu(false);
                          toast("Signed out.");
                        }}
                      >
                        Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button className="navlink" onClick={() => openAuth()}>
                Sign in
              </button>
            )}
            <button className="btn-surprise" onClick={surpriseOrAdd}>
              Surprise me
            </button>
          </nav>
        </div>
        <div className="dateline">
          <span>{today}</span>
          <span className="dl-mid">
            Independent restaurants, coffee &amp; bars of {city.name}, {stateName(city.state)}
          </span>
          <span>No chains. No fast food.</span>
        </div>
      </header>

      <main className="main">
        <aside className="sidebar">
          <div className="sidebar-scroll" ref={scrollRef}>
            <AnimatePresence mode="wait" initial={false}>
              {selected ? (
                <SpotDetail key={selected.id} spot={selected} number={numbers[selected.id]} pool={allSpots} onBack={() => select(null)} onSelect={select} />
              ) : (
                <motion.div key="browse" className="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                  <div className="city-bar">
                    <button onClick={() => setPicker({ open: true, first: false })}>
                      {city.name}, {apState(city.state)} <u>change</u>
                    </button>
                    <button className="textbtn" onClick={openAdd}>
                      + Add a place
                    </button>
                  </div>

                  {founding && (
                    <section className="notice">
                      <h3>{allSpots.length === 0 ? `Nothing in ${city.name} yet.` : `${allSpots.length} place${allSpots.length === 1 ? "" : "s"} in ${city.name} so far.`}</h3>
                      <p>
                        We&apos;re building this one with the people who live here. Add the places you actually go. Somebody on our end checks each one is real, open and
                        locally owned, then it goes up with your name on it.
                      </p>
                      <button className="btn btn-green" onClick={openAdd}>
                        Add a place in {city.name}
                      </button>
                    </section>
                  )}

                  <section className="menu-sec">
                    <h2 className="menu-head">
                      <span>What sounds good?</span>
                    </h2>
                    <ul className="board">
                      <BoardRow label="A little of everything" count={genreCounts.all} on={genre === "all"} seed={0} onClick={() => chooseGenre("all")} />
                      {GENRES.map((g, i) => (
                        <BoardRow key={g.id} label={g.label} count={genreCounts[g.id] ?? 0} on={genre === g.id} seed={i + 1} onClick={() => chooseGenre(g.id)} />
                      ))}
                    </ul>
                    {genre === "drinks" && (
                      <p className="subline">
                        {[{ id: "all" as const, label: "Any" }, ...DRINK_KINDS].map((k, i) => (
                          <span key={k.id}>
                            {i > 0 && <span className="sep">/</span>}
                            <button className="optbtn" onClick={() => setDrink(k.id)}>
                              <Circled on={drink === k.id} seed={i}>
                                {k.label}
                              </Circled>
                            </button>
                          </span>
                        ))}
                      </p>
                    )}
                  </section>

                  <section className="menu-sec">
                    <h2 className="menu-head">
                      <span>What part of town?</span>
                    </h2>
                    <p className="hoods">
                      {[{ id: "all", label: `Anywhere in ${city.name}` }, ...areas].map((a, i) => (
                        <span key={a.id} className={(areaCounts[a.id] ?? 0) === 0 && a.id !== "all" ? "zero" : ""}>
                          <button className="optbtn" onClick={() => chooseArea(a.id)}>
                            <Circled on={area === a.id} seed={i}>
                              {a.label}
                            </Circled>
                            <sup>{a.id === "all" ? areaCounts.all : areaCounts[a.id] ?? 0}</sup>
                          </button>
                        </span>
                      ))}
                    </p>
                    {activeArea?.blurb && <p className="hood-blurb">{activeArea.blurb}</p>}
                  </section>

                  <section className="menu-sec search-sec">
                    <label className="lookup">
                      <span className="sr-only">Search</span>
                      <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Looking for something? Oysters, patio, biscuits" />
                      {query && (
                        <button className="textbtn" onClick={() => setQuery("")}>
                          clear
                        </button>
                      )}
                    </label>
                    <button className="textbtn" onClick={() => setMoreFilters((v) => !v)} aria-expanded={moreFilters}>
                      {moreFilters ? "Fewer options" : filtersOn ? "Options (on)" : "More options"}
                    </button>
                    {moreFilters && (
                      <div className="more">
                        <p>
                          <span className="more-label">Price</span>
                          {[1, 2, 3, 4].map((p, i) => (
                            <button key={p} className="optbtn" onClick={() => setPrices((x) => (x.includes(p) ? x.filter((y) => y !== p) : [...x, p]))}>
                              <Circled on={prices.includes(p)} seed={i}>
                                {priceLabel(p)}
                              </Circled>
                            </button>
                          ))}
                        </p>
                        <p>
                          <span className="more-label">Order by</span>
                          {(
                            [
                              ["popular", "most loved"],
                              ["rating", "member ratings"],
                              ["az", "A to Z"],
                            ] as [Sort, string][]
                          ).map(([k, l], i) => (
                            <button key={k} className="optbtn" onClick={() => setSort(k)}>
                              <Circled on={sort === k} seed={i + 1}>
                                {l}
                              </Circled>
                            </button>
                          ))}
                        </p>
                      </div>
                    )}
                  </section>

                  <div className="list-head">
                    <span>
                      {list.length} {list.length === 1 ? "place" : "places"}
                      {savedOnly ? ", saved by you" : ""}
                    </span>
                    {(genre !== "all" || area !== "all" || query || filtersOn) && (
                      <button className="textbtn" onClick={resetAll}>
                        Start over
                      </button>
                    )}
                  </div>

                  <ol className="bill">
                    {list.map((s, i) => (
                      <SpotRow
                        key={s.id}
                        spot={s}
                        n={i + 1}
                        rating={ratings[s.id]}
                        hot={hoveredId === s.id}
                        saved={saved.includes(s.id)}
                        onHover={setHoveredId}
                        onClick={() => select(s.id)}
                        ad={i === 4 && list.length > 6}
                      />
                    ))}
                  </ol>

                  {list.length === 0 && !(founding && allSpots.length === 0) && (
                    <div className="empty">
                      <p>Nothing matches that.</p>
                      <button className="textbtn" onClick={resetAll}>
                        Start over
                      </button>
                    </div>
                  )}

                  <button className="write-in" onClick={openAdd}>
                    <span className="wi-title">Missing a place?</span>
                    <span>Write it in. We check every one before it goes up, and you get the credit.</span>
                  </button>

                  <Newsletter city={city} />
                  <footer className="side-foot">
                    <p>Locally owned places only. If it has a drive-thru or a corporate HQ out of state, it&apos;s not on here.</p>
                    <p>
                      Map pins are close, not exact. Something closed or wrong? <Link href="/partners#contact">Let us know</Link>.
                    </p>
                    <p>
                      © {new Date().getFullYear()} The Local, {city.name}, {apState(city.state)}
                    </p>
                  </footer>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </aside>

        <section className="mapwrap">
          <div className="map-plate">
            <MapView
              key={city.id}
              city={city}
              areas={areas}
              spots={allSpots}
              numbers={numbers}
              visible={visible}
              selectedId={selectedId}
              hoveredId={hoveredId}
              area={area}
              onSelect={select}
              onHover={setHoveredId}
              onArea={chooseArea}
            />
            <div className="map-caption" aria-live="polite">
              <span className="cap-kicker">{selected ? `No. ${numbers[selected.id] ?? ""}` : activeArea ? "Neighborhood" : city.nickname ?? stateName(city.state)}</span>
              <h2 className="cap-title">{mapTitle}</h2>
              <span className="cap-sub">{mapSub}</span>
            </div>
            <p className="map-key">
              <i className="k-on" /> numbers match the list <i className="k-off" /> not in your picks
            </p>
          </div>
        </section>
      </main>

      <button className="fab" onClick={surpriseOrAdd}>
        Surprise me
      </button>

      <Surprise
        open={surprise && allSpots.length > 0}
        onClose={() => setSurprise(false)}
        all={allSpots}
        filtered={list}
        onGo={(id) => {
          setSurprise(false);
          const s = spotById[id];
          if (s && area !== "all" && s.area !== area) setArea("all");
          select(id);
        }}
      />

      <CityPicker
        open={picker.open}
        firstRun={picker.first}
        current={city}
        liveCounts={{ [DEFAULT_CITY]: SPOTS.length, ...(city.id !== DEFAULT_CITY ? { [city.id]: allSpots.length } : {}) }}
        onPick={pickCity}
        onClose={() => {
          if (picker.first) pickCity(city);
          else setPicker({ open: false, first: false });
        }}
      />
      <SubmitSpot open={adding} onClose={() => setAdding(false)} city={city} areas={areas} spots={allSpots} />
      <MySubmissions
        open={mine}
        onClose={() => setMine(false)}
        onAdd={() => (setMine(false), openAdd())}
        onOpenSpot={(sub) => {
          setMine(false);
          if (sub.cityId !== city.id) router.push(`/spot/${sub.spotId}`);
          else {
            loadCommunity();
            select(sub.spotId!);
          }
        }}
      />
    </div>
  );
}

function BoardRow({ label, count, on, seed, onClick }: { label: string; count: number; on: boolean; seed: number; onClick: () => void }) {
  return (
    <li className={count === 0 ? "zero" : ""}>
      <button onClick={onClick} aria-pressed={on} className={on ? "on" : ""}>
        <Circled on={on} seed={seed}>
          {label}
        </Circled>
        <span className="leader" aria-hidden />
        <span className="board-n">{count}</span>
      </button>
    </li>
  );
}

function SpotRow({
  spot,
  n,
  rating,
  hot,
  saved,
  onHover,
  onClick,
  ad,
}: {
  spot: Spot;
  n: number;
  rating?: { avg: number; count: number };
  hot: boolean;
  saved: boolean;
  onHover: (id: string | null) => void;
  onClick: () => void;
  ad: boolean;
}) {
  return (
    <>
      <li className={`item ${hot ? "hot" : ""}`} onMouseEnter={() => onHover(spot.id)} onMouseLeave={() => onHover(null)}>
        <button onClick={onClick} className="item-btn">
          <span className="item-no">{n}</span>
          <span className="item-body">
            <span className="item-line">
              <span className="item-name">{spot.name}</span>
              <span className="leader" aria-hidden />
              <span className="item-price">{priceLabel(spot.price)}</span>
            </span>
            <span className="item-known">{spot.knownFor}</span>
            <span className="item-meta">
              {spot.genres.map((g) => GENRE_BY_ID[g].short).join(", ")} · {areaLabelOf(spot)}
              {rating ? ` · ${rating.avg.toFixed(1)} from ${rating.count} ${rating.count === 1 ? "member" : "members"}` : ""}
              {saved ? " · saved" : ""}
              {spot.sponsored && <span className="paid">Paid listing</span>}
            </span>
          </span>
        </button>
      </li>
      {ad && (
        <li className="classified">
          <Link href="/partners">
            <span className="cl-label">Restaurants</span>
            <strong>Own a place like these?</strong>
            <span>Claim your listing for free, or pay to be featured in your neighborhood. Rates inside.</span>
          </Link>
        </li>
      )}
    </>
  );
}

function Newsletter({ city }: { city: City }) {
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
        } catch {
          toast("That didn't go through. Try again?", "err");
        }
      }}
    >
      <h3>The Thursday List</h3>
      <p>Five places in {city.name} worth your time, one email a week. That&apos;s it.</p>
      {done ? (
        <p className="nl-done">You&apos;re on it. See you Thursday.</p>
      ) : (
        <div className="nl-row">
          <input type="email" required placeholder="your email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
          <button className="btn btn-green">Sign up</button>
        </div>
      )}
    </form>
  );
}
