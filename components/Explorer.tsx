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
  PINS_EXACT,
  SPOTS,
  TOWNS,
  TOWN_BY_ID,
  areaLabelOf,
  deriveAreas,
  priceLabel,
  type AreaId,
  type DrinkKind,
  type GenreId,
  type Spot,
  type TownId,
} from "@/lib/data";
import type { RatingSummary } from "@/lib/backend";
import { CITY_BY_ID, DEFAULT_CITY, HOME_KEY, HOME_TOWN_KEY, apState, cityPath, stateName, type City } from "@/lib/regions";
import CityPicker from "./CityPicker";
import SubmitSpot from "./SubmitSpot";
import MySubmissions from "./MySubmissions";
import { useApp } from "./Providers";
import SpotDetail from "./SpotDetail";
import Surprise from "./Surprise";
import Circled from "./Circled";
import Profile from "./Profile";
import MapCards from "./MapCards";
import { Thumb } from "./Photo";

type View = "list" | "map" | "me";

function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(max-width: 900px)");
    const on = () => setM(q.matches);
    on();
    q.addEventListener("change", on);
    return () => q.removeEventListener("change", on);
  }, []);
  return m;
}

const MapView = dynamic(() => import("./MapView"), { ssr: false, loading: () => <div className="leaflet-host map-loading" /> });
// start downloading the map engine with the page instead of after it renders
if (typeof window !== "undefined") import("./MapViewGL").catch(() => {});

type Sort = "popular" | "rating" | "az";
const SEEN_KEY = "tl.seenApproved";

export default function Explorer({
  cityId,
  initialSpot,
  initialSpotData,
  initialView = "list",
}: {
  cityId?: string;
  initialSpot?: string;
  initialSpotData?: Spot;
  initialView?: View;
}) {
  const { backend, user, openAuth, requireAuth, saved, toggleSaved, toast } = useApp();
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
  /** phone: the Filters sheet (part of town, price, order) */
  const [sheet, setSheet] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(initialSpot ?? null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [surprise, setSurprise] = useState(false);
  const [moreFilters, setMoreFilters] = useState(false);
  const [ratings, setRatings] = useState<RatingSummary>({});
  const [userMenu, setUserMenu] = useState(false);
  const [view, setView] = useState<View>(initialView);
  const [returnView, setReturnView] = useState<View>("list");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [profileKey, setProfileKey] = useState(0);
  const isMobile = useIsMobile();
  const q = useDeferredValue(query);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const hydrated = useRef(false);

  /* ---------- city ---------- */
  // "/" has no city in the URL: use the member's home city, or ask on first visit
  useEffect(() => {
    let home: string | null = null;
    let town: string | null = null;
    try {
      home = localStorage.getItem(HOME_KEY);
      town = localStorage.getItem(HOME_TOWN_KEY);
    } catch {
      /* ignore */
    }
    // start where they eat most, unless the link says otherwise
    // (a shared link to one place shows it in context, not filtered out by your home town)
    if (town && TOWN_BY_ID[town as TownId] && !initialSpot && !new URLSearchParams(location.search).get("a")) setArea(`t:${town}`);
    if (cityId || initialSpot || initialView !== "list") return;
    if (!home) setPicker({ open: true, first: true });
    else if (home !== DEFAULT_CITY && CITY_BY_ID[home]) router.replace(cityPath(CITY_BY_ID[home]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const pickCity = (c: City, town: TownId | null = null) => {
    try {
      localStorage.setItem(HOME_KEY, c.id);
      if (town) localStorage.setItem(HOME_TOWN_KEY, town);
      else localStorage.removeItem(HOME_TOWN_KEY);
    } catch {
      /* ignore */
    }
    setPicker({ open: false, first: false });
    setArea(town ? `t:${town}` : "all");
    setSelectedId(null);
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
          toast(x.status === "approved" ? `${x.name} checked out. It's on the map now.` : `${x.name} wasn't approved. Your page has the reason.`, x.status === "approved" ? "ok" : undefined)
        );
        if (fresh.length) localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, ...fresh.map((x) => x.id)]));
      })
      .catch(() => {});
  }, [user, backend, toast]);

  // exact pins and closures from Google, once a key is set on the server (see /api/pins)
  const [google, setGoogle] = useState<{ pins: Record<string, [number, number]>; closed: string[] } | null>(null);
  useEffect(() => {
    fetch("/api/pins")
      .then((r) => r.json())
      .then((j) => j.enabled && Object.keys(j.pins ?? {}).length > 0 && setGoogle({ pins: j.pins, closed: j.closed ?? [] }))
      .catch(() => {});
  }, []);

  const allSpots = useMemo(() => {
    const closed = new Set(google?.closed ?? []);
    const seed =
      city.id === DEFAULT_CITY
        ? SPOTS.filter((x) => !closed.has(x.id) || x.id === initialSpot).map((x) => (google?.pins[x.id] ? { ...x, coords: google.pins[x.id] } : x))
        : [];
    const seedIds = new Set(seed.map((x) => x.id));
    return [...seed, ...community.filter((x) => x.city === city.id && !seedIds.has(x.id))];
  }, [city.id, community, google, initialSpot]);
  const spotById = useMemo(() => Object.fromEntries(allSpots.map((x) => [x.id, x])) as Record<string, Spot>, [allSpots]);
  const areas = useMemo(() => deriveAreas(city.id, allSpots), [city.id, allSpots]);
  const areaById = useMemo(() => Object.fromEntries(areas.map((a) => [a.id, a])), [areas]);
  const townOf = useCallback((s: Spot) => areaById[s.area]?.town ?? null, [areaById]);
  /** area filter: "all", a town ("t:homewood") or one neighborhood */
  const inScope = useCallback(
    (s: Spot, a: string = area) => a === "all" || (a.startsWith("t:") ? townOf(s) === a.slice(2) : s.area === a),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [area, townOf]
  );
  const activeTown: TownId | null = area.startsWith("t:") ? (area.slice(2) as TownId) : (areaById[area]?.town ?? null);

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
    if (location.pathname === "/me") setView("me");
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    const p = new URLSearchParams();
    if (genre !== "all") p.set("g", genre);
    if (genre === "drinks" && drink !== "all") p.set("d", drink);
    if (area !== "all") p.set("a", area);
    const sel = selectedId ? spotById[selectedId] : null;
    const path = sel ? `/spot/${sel.id}` : view === "me" ? "/me" : cityPath(city);
    const qs = p.toString();
    history.replaceState(null, "", qs ? `${path}?${qs}` : path);
    document.title = sel ? `${sel.name} · The Local` : `The Local · ${city.name} restaurants, coffee & bars`;
  }, [genre, drink, area, selectedId, spotById, city, view]);

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
    const out = allSpots.filter((s) => matchesBase(s) && inScope(s));
    const r = (s: Spot) => ratings[s.id]?.avg ?? 0;
    out.sort((a, b) => {
      if (!!b.sponsored !== !!a.sponsored) return b.sponsored ? 1 : -1;
      if (sort === "az") return a.name.localeCompare(b.name);
      if (sort === "rating") return r(b) - r(a) || b.pop - a.pop;
      return b.pop - a.pop;
    });
    return out;
  }, [allSpots, matchesBase, inScope, sort, ratings]);

  const visible = useMemo(() => new Set(list.map((s) => s.id)), [list]);

  const genreCounts = useMemo(() => {
    const c: Record<string, number> = { all: 0 };
    for (const s of allSpots) {
      if (!inScope(s)) continue;
      c.all++;
      s.genres.forEach((g) => (c[g] = (c[g] ?? 0) + 1));
    }
    return c;
  }, [allSpots, inScope]);

  const areaCounts = useMemo(() => {
    const c: Record<string, number> = { all: 0 };
    for (const s of allSpots) {
      if (!matchesBase(s)) continue;
      c.all++;
      c[s.area] = (c[s.area] ?? 0) + 1;
      const t = townOf(s);
      if (t) c[`t:${t}`] = (c[`t:${t}`] ?? 0) + 1;
    }
    return c;
  }, [allSpots, matchesBase, townOf]);
  const townCounts = useMemo(() => {
    const c: Record<string, number> = { all: allSpots.length };
    for (const s of allSpots) {
      const t = townOf(s);
      if (t) c[t] = (c[t] ?? 0) + 1;
    }
    return c;
  }, [allSpots, townOf]);

  /* ---------- actions ---------- */
  const select = useCallback(
    (id: string | null) => {
      if (id) {
        // remember where they came from so Back returns there
        if (!selectedId) setReturnView(view);
        setView("list");
      } else if (selectedId) setView(returnView);
      setSelectedId(id);
      setHoveredId(null);
      setFocusId(null);
      scrollRef.current?.scrollTo({ top: 0 });
    },
    [selectedId, view, returnView]
  );
  const goView = (v: View) => {
    if (v === "me") setProfileKey((k) => k + 1);
    setSelectedId(null);
    setFocusId(null);
    setView(v);
    scrollRef.current?.scrollTo({ top: 0 });
  };

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
  const activeArea = area === "all" || area.startsWith("t:") ? null : areaById[area] ?? null;
  const frame = useMemo(() => {
    if (activeArea) return { center: activeArea.center, zoom: activeArea.zoom, maxZoom: activeArea.zoom + 0.4 };
    if (activeTown) return { center: TOWN_BY_ID[activeTown].center, zoom: TOWN_BY_ID[activeTown].zoom, maxZoom: 16 };
    return { center: city.center, zoom: city.zoom, maxZoom: 15 };
  }, [activeArea, activeTown, city]);
  const founding = city.status === "founding";
  const openAdd = () => {
    if (requireAuth(`Sign in to add a place in ${city.name}.`)) setAdding(true);
  };
  const filtersOn = prices.length > 0 || savedOnly || sort !== "popular";

  const numbers = useMemo(() => Object.fromEntries(list.map((s, i) => [s.id, i + 1])) as Record<string, number>, [list]);
  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }));
  }, []);

  const placeName = activeArea ? activeArea.label : activeTown ? TOWN_BY_ID[activeTown].label : city.name;
  const mapTitle = selected ? selected.name : placeName;
  const mapSub = selected
    ? `${areaLabelOf(selected)}. ${selected.address}`
    : `${list.length} ${list.length === 1 ? "place" : "places"}${activeGenre ? `, ${activeGenre.label.toLowerCase()}` : ""}${activeArea || activeTown ? "" : ", all over town"}`;
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
    <div className={`app v-${view}${selected ? " has-sel" : ""}`}>
      <header className="masthead">
        <div className="mast-row">
          <button className="brand" onClick={() => (resetAll(), select(null))} aria-label="The Local, home">
            <span className="brand-script">The Local</span>
            <span className="brand-sub">
              {city.name}, {apState(city.state)}
            </span>
          </button>
          <button className="town-btn" onClick={() => setPicker({ open: true, first: false })} aria-label="Change part of town">
            {activeTown ? TOWN_BY_ID[activeTown].label : `All of ${city.name}`} <span aria-hidden>▾</span>
          </button>
          <nav className="mast-nav">
            <button className="navlink hide-sm" onClick={() => setPicker({ open: true, first: false })}>
              Change town
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
                      <button className="menu-item" onClick={() => (goView("me"), setUserMenu(false))}>
                        Your page
                      </button>
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
              ) : view === "me" ? (
                <motion.div key="me" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {!isMobile && (
                    <div className="detail-bar">
                      <button className="textbtn" onClick={() => goView("list")}>
                        ← Back to the list
                      </button>
                    </div>
                  )}
                  <Profile spotById={spotById} onOpen={(id) => select(id)} onAdd={openAdd} admin={admin} refreshKey={profileKey} />
                </motion.div>
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

                  <PhoneTools
                    query={query}
                    setQuery={setQuery}
                    genre={genre}
                    chooseGenre={chooseGenre}
                    genreCounts={genreCounts}
                    drink={drink}
                    setDrink={setDrink}
                    filters={(activeArea ? 1 : 0) + (prices.length ? 1 : 0) + (sort !== "popular" ? 1 : 0) + (savedOnly ? 1 : 0)}
                    openFilters={() => setSheet(true)}
                  />

                  <section className="menu-sec genre-sec">
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

                  <section className="menu-sec town-sec">
                    <h2 className="menu-head">
                      <span>What part of town?</span>
                    </h2>
                    <p className="hoods towns">
                      {[{ id: "all", label: "Anywhere" }, ...TOWNS.map((t) => ({ id: `t:${t.id}`, label: t.label }))].map((a, i) => (
                        <span key={a.id} className={(areaCounts[a.id] ?? 0) === 0 && a.id !== "all" ? "zero" : ""}>
                          <button className="optbtn" onClick={() => chooseArea(a.id)} aria-pressed={area === a.id || (a.id === `t:${activeTown}` && !!activeArea)}>
                            <Circled on={area === a.id || (a.id === `t:${activeTown}` && !!activeArea)} seed={i}>
                              {a.label}
                            </Circled>
                            <sup>{areaCounts[a.id] ?? 0}</sup>
                          </button>
                        </span>
                      ))}
                    </p>
                    {activeTown && (
                      <p className="hoods hoods-sub">
                        {areas
                          .filter((a) => a.town === activeTown)
                          .map((a, i) => (
                            <span key={a.id} className={(areaCounts[a.id] ?? 0) === 0 ? "zero" : ""}>
                              <button className="optbtn" onClick={() => setArea((cur) => (cur === a.id ? `t:${activeTown}` : a.id))} aria-pressed={area === a.id}>
                                <Circled on={area === a.id} seed={i + 2}>
                                  {a.label}
                                </Circled>
                                <sup>{areaCounts[a.id] ?? 0}</sup>
                              </button>
                            </span>
                          ))}
                      </p>
                    )}
                    {(activeArea?.blurb || (activeTown && TOWN_BY_ID[activeTown].blurb)) && (
                      <p className="hood-blurb">{activeArea?.blurb || TOWN_BY_ID[activeTown!].blurb}</p>
                    )}
                  </section>

                  <section className="menu-sec search-sec">
                    <div className="lookup-row">
                      <label className="lookup">
                        <span className="sr-only">Search</span>
                        <input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Oysters, patio, biscuits…" />
                        {query && (
                          <button className="textbtn" onClick={() => setQuery("")}>
                            clear
                          </button>
                        )}
                      </label>
                      <button className={`textbtn filters-btn ${filtersOn ? "on" : ""}`} onClick={() => setMoreFilters((v) => !v)} aria-expanded={moreFilters}>
                        {filtersOn ? "Price & order ●" : "Price & order"}
                      </button>
                    </div>
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
                    {(genre !== "all" || (area !== "all" && !(isMobile && area.startsWith("t:"))) || query || filtersOn) && (
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
                    <span>Write it in. We check it, then it goes up with your name on it.</span>
                  </button>

                  <Newsletter city={city} />
                  <footer className="side-foot">
                    <p>Locally owned places only. If it has a drive-thru or a corporate HQ out of state, it&apos;s not on here.</p>
                    <p>
                      {google || PINS_EXACT ? "" : "Map pins are close, not exact. "}Something closed or wrong? <Link href="/partners#contact">Let us know</Link>. <Link href="/credits">Photo credits</Link>.
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
              focusId={isMobile && view === "map" ? focusId : null}
              frame={frame}
              topPad={isMobile && view === "map" && !selected ? 92 : undefined}
              area={area}
              onSelect={select}
              onHover={setHoveredId}
              onArea={chooseArea}
            />
            <div className="map-caption" aria-live="polite">
              <span className="cap-kicker">
                {selected
                  ? numbers[selected.id]
                    ? `No. ${numbers[selected.id]}`
                    : areaLabelOf(selected)
                  : activeArea
                    ? activeArea.town
                      ? TOWN_BY_ID[activeArea.town].label
                      : "Neighborhood"
                    : activeTown
                      ? `${city.name} area`
                      : (city.nickname ?? stateName(city.state))}
              </span>
              <h2 className="cap-title">{mapTitle}</h2>
              <span className="cap-sub">{mapSub}</span>
            </div>
            {isMobile && view === "map" && !selected && (
              <MapCards list={list} focusId={focusId} onFocus={setFocusId} onOpen={(id) => select(id)} />
            )}
            {isMobile && selected && (
              <div className="m-float">
                <button className="m-round" onClick={() => select(null)} aria-label="Back to the list">
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                    <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <span className="m-float-r">
                  <button
                    className={`m-round ${saved.includes(selected.id) ? "on" : ""}`}
                    onClick={() => toggleSaved(selected.id)}
                    aria-pressed={saved.includes(selected.id)}
                    aria-label={saved.includes(selected.id) ? "Saved. Tap to remove" : "Save"}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" fill={saved.includes(selected.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    className="m-round"
                    aria-label="Share"
                    onClick={async () => {
                      const url = `${location.origin}/spot/${selected.id}`;
                      try {
                        if (navigator.share) await navigator.share({ title: selected.name, text: `${selected.name}: ${selected.knownFor}`, url });
                        else {
                          await navigator.clipboard.writeText(url);
                          toast("Link copied");
                        }
                      } catch {
                        /* dismissed */
                      }
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                      <path d="M12 15V4M8 8l4-4 4 4M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </span>
              </div>
            )}
            <p className="map-key">
              <i className="k-on" /> numbers match the list <i className="k-off" /> not in your picks
            </p>
          </div>
        </section>
      </main>

      {/* four calm tabs; adding a place lives on your page and at the end of the list */}
      <nav className="tabbar" aria-label="Sections">
        <button className={view === "list" && !selected ? "on" : ""} onClick={() => goView("list")} aria-current={view === "list" && !selected ? "page" : undefined}>
          <TabGlyph k="menu" />
          Explore
        </button>
        <button className={view === "map" && !selected ? "on" : ""} onClick={() => goView("map")} aria-current={view === "map" && !selected ? "page" : undefined}>
          <TabGlyph k="map" />
          Map
        </button>
        <button className="tab-surprise" onClick={surpriseOrAdd}>
          <TabGlyph k="spark" />
          Surprise
        </button>
        <button className={view === "me" && !selected ? "on" : ""} onClick={() => goView("me")} aria-current={view === "me" && !selected ? "page" : undefined}>
          <TabGlyph k="me" />
          {user ? "You" : "Sign in"}
        </button>
      </nav>

      <FilterSheet
        open={sheet}
        onClose={() => setSheet(false)}
        count={list.length}
        towns={[{ id: "all", label: "Anywhere" }, ...TOWNS.map((t) => ({ id: `t:${t.id}`, label: t.label }))]}
        hoods={activeTown ? areas.filter((a) => a.town === activeTown).map((a) => ({ id: a.id, label: a.label })) : []}
        area={area}
        activeTown={activeTown}
        areaCounts={areaCounts}
        chooseArea={(id) => setArea(id)}
        prices={prices}
        setPrices={setPrices}
        sort={sort}
        setSort={setSort}
        savedOnly={savedOnly}
        setSavedOnly={setSavedOnly}
        savedCount={saved.length}
        clear={() => {
          setArea(activeTown ? `t:${activeTown}` : "all");
          setPrices([]);
          setSort("popular");
          setSavedOnly(false);
        }}
      />

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
        currentTown={activeTown}
        townCounts={townCounts}
        onPick={pickCity}
        onClose={() => {
          if (picker.first) pickCity(city, null);
          else setPicker({ open: false, first: false });
        }}
      />
      <SubmitSpot
        open={adding}
        onClose={() => setAdding(false)}
        onDone={() => setProfileKey((k) => k + 1)}
        city={city}
        areas={areas}
        spots={allSpots}
      />
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

/** Small pen-drawn marks for the phone tab bar (no icon set). */
function TabGlyph({ k }: { k: "menu" | "map" | "add" | "me" | "spark" }) {
  const d = {
    menu: "M4 6h16M4 12h11M4 18h14",
    spark: "M12 3.5c.6 3.9 1.9 5.9 5.6 6.6-3.7.8-5 2.8-5.6 6.7-.6-3.9-1.9-5.9-5.6-6.7 3.7-.7 5-2.7 5.6-6.6ZM18.5 15.5c.3 1.6.8 2.4 2.2 2.7-1.4.3-1.9 1.1-2.2 2.7-.3-1.6-.8-2.4-2.2-2.7 1.4-.3 1.9-1.1 2.2-2.7Z",
    map: "M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14",
    add: "M12 4c.3 5 .1 11 0 16M4 12c5-.3 11-.1 16 0",
    me: "M12 12a4 4 0 1 0-.1 0M4.5 20c1.5-4 4.4-5.5 7.5-5.5s6 1.5 7.5 5.5",
  }[k];
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Phones: one search bar and one row of chips, the way people already use food apps.
 * Part of town, price and order live behind Filters, so the list starts near the top.
 */
function PhoneTools({
  query,
  setQuery,
  genre,
  chooseGenre,
  genreCounts,
  drink,
  setDrink,
  filters,
  openFilters,
}: {
  query: string;
  setQuery: (q: string) => void;
  genre: GenreId | "all";
  chooseGenre: (g: GenreId | "all") => void;
  genreCounts: Record<string, number>;
  drink: DrinkKind | "all";
  setDrink: (d: DrinkKind | "all") => void;
  filters: number;
  openFilters: () => void;
}) {
  return (
    <div className="m-tools">
      <label className="m-search">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <path d="M10.5 18a7.5 7.5 0 1 1 5.3-2.2L21 21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span className="sr-only">Search</span>
        <input type="search" enterKeyHint="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search dishes, places, patios" />
        {query && (
          <button type="button" className="m-clear" onClick={() => setQuery("")} aria-label="Clear search">
            ×
          </button>
        )}
      </label>
      <div className="m-chips" role="toolbar" aria-label="Kind of food">
        <button type="button" className={`m-chip m-chip-filter ${filters ? "on" : ""}`} onClick={openFilters} aria-label={filters ? `Filters, ${filters} on` : "Filters"}>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
            <path d="M4 7h10M18 7h2M4 17h4M12 17h8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="16" cy="7" r="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="10" cy="17" r="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
          </svg>
          Filters{filters ? <b>{filters}</b> : null}
        </button>
        <ChipButton on={genre === "all"} onClick={() => chooseGenre("all")}>
          All
        </ChipButton>
        {GENRES.filter((g) => (genreCounts[g.id] ?? 0) > 0 || genre === g.id).map((g) => (
          <ChipButton key={g.id} on={genre === g.id} onClick={() => chooseGenre(g.id)}>
            {g.short}
          </ChipButton>
        ))}
      </div>
      {genre === "drinks" && (
        <div className="m-chips m-sub" role="toolbar" aria-label="Kind of drinks">
          {[{ id: "all" as const, label: "Any" }, ...DRINK_KINDS].map((k) => (
            <ChipButton key={k.id} small on={drink === k.id} onClick={() => setDrink(k.id)}>
              {k.label}
            </ChipButton>
          ))}
        </div>
      )}
    </div>
  );
}

function ChipButton({ on, onClick, small, children }: { on: boolean; onClick: () => void; small?: boolean; children: React.ReactNode }) {
  const ref = useKeepInView(on);
  return (
    <button ref={ref} type="button" className={`m-chip ${small ? "m-chip-sm" : ""} ${on ? "on" : ""}`} aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  );
}

/** Phones: everything that isn't "what kind of food" in one sheet, with a clear way out. */
function FilterSheet(p: {
  open: boolean;
  onClose: () => void;
  count: number;
  towns: { id: string; label: string }[];
  hoods: { id: string; label: string }[];
  area: string;
  activeTown: TownId | null;
  areaCounts: Record<string, number>;
  chooseArea: (id: AreaId | "all") => void;
  prices: number[];
  setPrices: (f: (x: number[]) => number[]) => void;
  sort: Sort;
  setSort: (s: Sort) => void;
  savedOnly: boolean;
  setSavedOnly: (v: boolean) => void;
  savedCount: number;
  clear: () => void;
}) {
  const townOn = (id: string) => p.area === id || (id === `t:${p.activeTown}` && !p.area.startsWith("t:") && p.area !== "all");
  return (
    <AnimatePresence>
      {p.open && (
        <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={p.onClose}>
          <motion.div
            className="modal filter-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="fs-head">
              <h2 className="modal-title">Filters</h2>
              <button className="modal-x" onClick={p.onClose} aria-label="Close">
                ×
              </button>
            </div>
            <div className="fs-body">
              <section>
                <h3>Part of town</h3>
                <div className="fs-chips">
                  {p.towns.map((t) => (
                    <button key={t.id} type="button" className={`m-chip ${townOn(t.id) ? "on" : ""}`} aria-pressed={townOn(t.id)} onClick={() => p.chooseArea(t.id)}>
                      {t.label}
                      {t.id !== "all" && <span className="m-chip-n">{p.areaCounts[t.id] ?? 0}</span>}
                    </button>
                  ))}
                </div>
                {p.hoods.length > 0 && (
                  <div className="fs-chips fs-sub">
                    {p.hoods.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        className={`m-chip m-chip-sm ${p.area === h.id ? "on" : ""}`}
                        aria-pressed={p.area === h.id}
                        onClick={() => p.chooseArea(p.area === h.id ? `t:${p.activeTown}` : h.id)}
                      >
                        {h.label}
                        <span className="m-chip-n">{p.areaCounts[h.id] ?? 0}</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
              <section>
                <h3>Price</h3>
                <div className="fs-chips">
                  {[1, 2, 3, 4].map((n) => {
                    const on = p.prices.includes(n);
                    return (
                      <button key={n} type="button" className={`m-chip ${on ? "on" : ""}`} aria-pressed={on} onClick={() => p.setPrices((x) => (on ? x.filter((y) => y !== n) : [...x, n]))}>
                        {priceLabel(n)}
                      </button>
                    );
                  })}
                </div>
              </section>
              <section>
                <h3>Order by</h3>
                <div className="fs-chips">
                  {(
                    [
                      ["popular", "Most loved"],
                      ["rating", "Member ratings"],
                      ["az", "A to Z"],
                    ] as [Sort, string][]
                  ).map(([k, l]) => (
                    <button key={k} type="button" className={`m-chip ${p.sort === k ? "on" : ""}`} aria-pressed={p.sort === k} onClick={() => p.setSort(k)}>
                      {l}
                    </button>
                  ))}
                </div>
              </section>
              {p.savedCount > 0 && (
                <section>
                  <label className="check fs-saved">
                    <input type="checkbox" checked={p.savedOnly} onChange={(e) => p.setSavedOnly(e.target.checked)} />
                    Only places I&apos;ve saved ({p.savedCount})
                  </label>
                </section>
              )}
            </div>
            <div className="fs-foot">
              <button type="button" className="textbtn" onClick={p.clear}>
                Clear all
              </button>
              <button type="button" className="btn btn-green" onClick={p.onClose}>
                {p.count === 0 ? "No matches" : `Show ${p.count} ${p.count === 1 ? "place" : "places"}`}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** On phones the menu rows scroll sideways; keep the chosen item in view. */
function useKeepInView(on: boolean) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!on || !ref.current || !window.matchMedia("(max-width: 900px)").matches) return;
    const row = ref.current.closest(".board, .hoods, .subline, .m-chips") as HTMLElement | null;
    if (!row) return;
    const b = ref.current;
    row.scrollTo({ left: b.offsetLeft - (row.clientWidth - b.offsetWidth) / 2, behavior: "smooth" });
  }, [on]);
  return ref;
}

function BoardRow({ label, count, on, seed, onClick }: { label: string; count: number; on: boolean; seed: number; onClick: () => void }) {
  const ref = useKeepInView(on);
  return (
    <li className={count === 0 ? "zero" : ""}>
      <button ref={ref} onClick={onClick} aria-pressed={on} className={on ? "on" : ""}>
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
          <Thumb spot={spot} />
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
      <p>Five places in {city.name} to try, in your inbox every Thursday.</p>
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
