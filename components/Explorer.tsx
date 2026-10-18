"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { track } from "@/lib/analytics";
import {
  DRINK_KINDS,
  GENRE_BY_ID,
  PINS_EXACT,
  SPOTS,
  TOWN_BY_ID,
  areaLabelOf,
  atLocation,
  canonicalSpotId,
  deriveAreas,
  distanceKm,
  locationsOf,
  priceLabel,
  type AreaId,
  type DrinkKind,
  type GenreId,
  type Spot,
  type TownId,
} from "@/lib/data";
import type { RatingSummary } from "@/lib/backend";
import { BRAND, MANTRA, NEWSLETTER, SIGNOFF } from "@/lib/brand";
import { COLLECTION_BY_ID, collectionsFor, greeting, plateOfTheWeek, weekStart } from "@/lib/collections";
import { TRAILS, trailProgress } from "@/lib/trails";
import { CITY_BY_ID, DEFAULT_CITY, HERE_KEY, HOME_KEY, HOME_TOWN_KEY, apState, cityPath, stateName, type City } from "@/lib/regions";
import BrowseBar from "./BrowseBar";
import WherePicker from "./WherePicker";
import CityPicker, { WhereBar } from "./CityPicker";
import SubmitSpot from "./SubmitSpot";
import MySubmissions from "./MySubmissions";
import { useApp } from "./Providers";
import SpotDetail from "./SpotDetail";
import Surprise from "./Surprise";
import Profile from "./Profile";
import MapCards from "./MapCards";
import { Thumb } from "./Photo";
import { Logo, PlateMark } from "./Brand";
import { CollectionRow, PassportCard, PlaceCard, TrailCard, WeekPlate } from "./FrontPage";
import Passport from "./Passport";
import StampPicker from "./StampPicker";

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

type Sort = "popular" | "rating" | "az" | "near";
/* exploring is open to everyone; these belong to an account (stamps and saves are gated in Providers) */
const SURPRISE_WHY = "Sign in to spin Surprise me. It takes a few seconds, no password.";
const PASSPORT_WHY = "Sign in to open your Plate Passport. It takes a few seconds, no password.";
const STAMP_WHY = "Sign in to stamp your Plate Passport. It takes a few seconds, no password.";
/** an occasion collection or a trail, picked from the front page; filters the list and frames the map */
type Theme = { kind: "collection" | "trail"; id: string } | null;
const SEEN_KEY = "tl.seenApproved";
/** set once the first page of this visit has drawn; after that, "/" means Birmingham, not "take me home" */
let booted = false;
const writeHere = (id: string) => {
  try {
    sessionStorage.setItem(HERE_KEY, id);
  } catch {
    /* ignore */
  }
};

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
  const { backend, user, openAuth, requireAuth, saved, toggleSaved, toast, been, home } = useApp();
  const router = useRouter();
  const [city, setCity] = useState<City>(CITY_BY_ID[cityId ?? initialSpotData?.city ?? DEFAULT_CITY] ?? CITY_BY_ID[DEFAULT_CITY]);
  const [community, setCommunity] = useState<Spot[]>(initialSpotData ? [initialSpotData] : []);
  const [picker, setPicker] = useState<{ open: boolean; first: boolean }>({ open: false, first: false });
  /** "Where are you?": which city's map you're looking at */
  const [cityPicker, setCityPicker] = useState(false);
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
  const [theme, setTheme] = useState<Theme>(null);
  const [stampPicker, setStampPicker] = useState(false);
  /** where you are, only once you ask for "Nearest" */
  const [here, setHere] = useState<[number, number] | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  /** phones: the browse bar slides away while you scroll down the list, back when you scroll up */
  const [tucked, setTucked] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(initialSpot ? canonicalSpotId(initialSpot) : null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [surprise, setSurprise] = useState(false);
  const [ratings, setRatings] = useState<RatingSummary>({});
  const [userMenu, setUserMenu] = useState(false);
  const [view, setView] = useState<View>(initialView);
  const [returnView, setReturnView] = useState<View>("list");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [profileKey, setProfileKey] = useState(0);
  const isMobile = useIsMobile();
  // The map engine is the heaviest thing on the page. Computers show the map right away; phones
  // start on the list, so there it loads when the Map tab or a place opens (and quietly in the
  // background once the list is up, so it's ready by then).
  const [mapOn, setMapOn] = useState(false);
  // rows drawn so far: the first screenful right away, the rest as you scroll (big lists are slow to lay out on phones)
  const [shown, setShown] = useState(24);
  const moreRows = useCallback(() => setShown((n) => n + 30), []);
  const q = useDeferredValue(query);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const hydrated = useRef(false);
  /** on the way to another city's page: don't write this page's address over the move */
  const leaving = useRef(false);

  /* ---------- city ---------- */
  // Home is where the map opens each visit; "Where are you?" (this tab only) can point somewhere else.
  // "/" has no city in the URL, so on arrival it goes to where you said you are, else home.
  useEffect(() => {
    const arriving = !booted;
    booted = true;
    let saved: string | null = null;
    let town: string | null = null;
    let here: string | null = null;
    try {
      saved = localStorage.getItem(HOME_KEY);
      town = localStorage.getItem(HOME_TOWN_KEY);
      here = sessionStorage.getItem(HERE_KEY);
    } catch {
      /* ignore */
    }
    // in your home city, start in the town you eat in most, unless the link says otherwise
    // (a shared link to one place shows it in context, not filtered out by your home town)
    if ((saved ?? DEFAULT_CITY) === city.id && town && TOWN_BY_ID[town as TownId] && !initialSpot && !new URLSearchParams(location.search).get("a")) setArea(`t:${town}`);
    if (cityId || initialSpot || initialView !== "list") return;
    if (!arriving) return writeHere(DEFAULT_CITY); // came back to "/" from inside the site
    // first visit: no question up front; show the guide, and let "Where" be asked when wanted
    const start = here ?? saved;
    if (start && start !== DEFAULT_CITY && CITY_BY_ID[start]) {
      leaving.current = true;
      router.replace(cityPath(CITY_BY_ID[start]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityId, initialSpot, router]);

  // a city's own page means you're looking there
  useEffect(() => {
    if (cityId && CITY_BY_ID[cityId]) writeHere(cityId);
  }, [cityId]);

  // back/forward between city routes
  useEffect(() => {
    if (cityId && CITY_BY_ID[cityId] && cityId !== city.id) {
      setCity(CITY_BY_ID[cityId]);
      setArea("all");
      setSelectedId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityId]);

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
  // stamps for places still on the list (a place that closed drops out of the count)
  const stampedCount = useMemo(() => allSpots.filter((s) => been[s.id]).length, [allSpots, been]);
  const areaById = useMemo(() => Object.fromEntries(areas.map((a) => [a.id, a])), [areas]);
  /** is this location in the picked area: "all", a town ("t:homewood") or one neighborhood */
  const inArea = useCallback(
    (locArea: AreaId, a: string) => a === "all" || (a.startsWith("t:") ? areaById[locArea]?.town === a.slice(2) : locArea === a),
    [areaById]
  );
  /** area filter; a place with more than one location counts wherever any of them is */
  const inScope = useCallback(
    (s: Spot, a: string = area) => a === "all" || (s.also?.length ? locationsOf(s).some((l) => inArea(l.area, a)) : inArea(s.area, a)),
    [area, inArea]
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
    if (s) setSelectedId(canonicalSpotId(s));
    const c = p.get("c");
    const t = p.get("t");
    if (c && COLLECTION_BY_ID[c]) setTheme({ kind: "collection", id: c });
    else if (t && TRAILS.some((x) => x.id === t)) setTheme({ kind: "trail", id: t });
    if (location.pathname === "/me") setView("me");
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current || leaving.current) return;
    const p = new URLSearchParams();
    if (genre !== "all") p.set("g", genre);
    if (genre === "drinks" && drink !== "all") p.set("d", drink);
    if (area !== "all") p.set("a", area);
    if (theme) p.set(theme.kind === "collection" ? "c" : "t", theme.id);
    const sel = selectedId ? spotById[selectedId] : null;
    const path = sel ? `/spot/${sel.id}` : view === "me" ? "/me" : cityPath(city);
    const qs = p.toString();
    history.replaceState(null, "", qs ? `${path}?${qs}` : path);
    document.title = sel ? `${sel.name} · ${BRAND}` : `${BRAND} · ${city.name} restaurants, coffee & bars`;
  }, [genre, drink, area, selectedId, spotById, city, view, theme]);

  useEffect(() => {
    backend.ratings().then(setRatings).catch(() => {});
  }, [backend, selectedId]);

  /* ---------- filtering ---------- */
  /** price, saved and search: everything but the kind of food */
  const matchesRest = useCallback(
    (s: Spot) => {
      if (prices.length && !prices.includes(s.price)) return false;
      if (savedOnly && !saved.includes(s.id)) return false;
      if (q.trim()) {
        const t = q.trim().toLowerCase();
        const hay = `${s.name} ${s.knownFor} ${s.tags.join(" ")} ${s.genres.map((g) => GENRE_BY_ID[g].label).join(" ")} ${areaLabelOf(s)}`.toLowerCase();
        if (!hay.includes(t)) return false;
      }
      return true;
    },
    [prices, savedOnly, saved, q]
  );
  // the places in the picked collection or trail
  const themeIds = useMemo(() => {
    if (!theme) return null;
    if (theme.kind === "collection") return new Set(allSpots.filter(COLLECTION_BY_ID[theme.id].match).map((s) => s.id));
    const t = TRAILS.find((x) => x.id === theme.id);
    return t ? new Set(t.pick(allSpots, areas).map((s) => s.id)) : null;
  }, [theme, allSpots, areas]);
  const matchesBase = useCallback(
    (s: Spot) => {
      if (themeIds && !themeIds.has(s.id)) return false;
      if (genre !== "all" && !s.genres.includes(genre)) return false;
      if (genre === "drinks" && drink !== "all" && !s.drinks?.includes(drink)) return false;
      return matchesRest(s);
    },
    [genre, drink, matchesRest, themeIds]
  );

  /** a place with more than one location shows the one in the part of town you picked, or the nearest one */
  const placeOf = useCallback(
    (s: Spot): Spot => {
      if (!s.also?.length) return s;
      const locs = locationsOf(s);
      let i = 0;
      if (area !== "all") i = Math.max(0, locs.findIndex((l) => inArea(l.area, area)));
      else if (sort === "near" && here) i = locs.reduce((b, l, j) => (distanceKm(here, l.coords) < distanceKm(here, locs[b].coords) ? j : b), 0);
      return atLocation(s, i);
    },
    [area, inArea, sort, here]
  );
  const placed = useMemo(() => allSpots.map(placeOf), [allSpots, placeOf]);
  const placedById = useMemo(() => Object.fromEntries(placed.map((x) => [x.id, x])) as Record<string, Spot>, [placed]);

  const list = useMemo(() => {
    const out = placed.filter((s) => matchesBase(s) && inScope(s));
    const r = (s: Spot) => ratings[s.id]?.avg ?? 0;
    // nobody can pay to move up this list: order is by the sort alone
    out.sort((a, b) => {
      if (sort === "near" && here) return distanceKm(here, a.coords) - distanceKm(here, b.coords);
      if (sort === "az") return a.name.localeCompare(b.name);
      if (sort === "rating") return r(b) - r(a) || b.pop - a.pop;
      return b.pop - a.pop;
    });
    return out;
  }, [placed, matchesBase, inScope, sort, ratings, here]);

  const visible = useMemo(() => new Set(list.map((s) => s.id)), [list]);

  // what each plate would show right now (same place, price and search)
  const genreCounts = useMemo(() => {
    const c: Record<string, number> = { all: 0 };
    for (const s of allSpots) {
      if (!inScope(s) || !matchesRest(s)) continue;
      c.all++;
      s.genres.forEach((g) => (c[g] = (c[g] ?? 0) + 1));
    }
    return c;
  }, [allSpots, inScope, matchesRest]);

  const areaCounts = useMemo(() => {
    const c: Record<string, number> = { all: 0 };
    for (const s of allSpots) {
      if (!matchesBase(s)) continue;
      c.all++;
      // each neighborhood and town once, however many locations it has there
      const keys = new Set<string>();
      for (const l of locationsOf(s)) {
        keys.add(l.area);
        const t = areaById[l.area]?.town;
        if (t) keys.add(`t:${t}`);
      }
      keys.forEach((k) => (c[k] = (c[k] ?? 0) + 1));
    }
    return c;
  }, [allSpots, matchesBase, areaById]);

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
  const goView = useCallback((v: View) => {
    if (v === "me") setProfileKey((k) => k + 1);
    setSelectedId(null);
    setFocusId(null);
    setView(v);
    scrollRef.current?.scrollTo({ top: 0 });
  }, []);
  const openPassport = useCallback(() => {
    if (requireAuth(PASSPORT_WHY, () => goView("me"))) goView("me");
  }, [goView, requireAuth]);

  const chooseGenre = (g: GenreId | "all") => {
    setGenre((cur) => (cur === g && g !== "all" ? "all" : g));
    setDrink("all");
    select(null);
  };
  /** remember the town they eat in at home, so the next visit starts there (not while visiting elsewhere) */
  const remember = useCallback(
    (a: string) => {
      if ((home ?? DEFAULT_CITY) !== city.id) return;
      const town = a === "all" ? null : a.startsWith("t:") ? a.slice(2) : (areaById[a]?.town ?? null);
      try {
        if (town) localStorage.setItem(HOME_TOWN_KEY, town);
        else localStorage.removeItem(HOME_TOWN_KEY);
      } catch {
        /* ignore */
      }
    },
    [areaById, city.id, home]
  );
  /** "Where are you?": look at another city's food for this visit; home stays put */
  const goCity = useCallback(
    (c: City) => {
      writeHere(c.id);
      setCityPicker(false);
      if (c.id === city.id) {
        if (selectedId || view !== "list") router.push(cityPath(c));
        return;
      }
      router.push(cityPath(c));
    },
    [city.id, selectedId, view, router]
  );
  const pickArea = (a: string) => {
    remember(a);
    setArea(a);
    select(null);
  };
  const closePicker = () => {
    if (picker.first) remember(area);
    setPicker({ open: false, first: false });
  };
  // a neighborhood name tapped on the map; tapping the one you're in steps back out to its town
  const chooseArea = useCallback(
    (a: AreaId | "all") => {
      setArea((cur) => (cur === a && a !== "all" ? (areaById[a]?.town ? `t:${areaById[a].town}` : "all") : a));
      select(null);
    },
    [select, areaById]
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
        if (requireAuth(SURPRISE_WHY, () => setSurprise(true))) setSurprise(true);
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
  }, [list, selectedId, hoveredId, surprise, select, requireAuth]);

  const selected = selectedId ? placedById[selectedId] ?? null : null;
  useEffect(() => {
    if (mapOn) return;
    const phone = window.matchMedia("(max-width: 900px)").matches;
    const idle = (cb: () => void, wait: number) => (typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(cb, { timeout: wait }) : setTimeout(cb, wait)); // Safari has no requestIdleCallback
    if (!phone || view === "map") return setMapOn(true);
    // a place opened on a phone: its name, photos and buttons first, the little map right after
    if (selectedId) return void idle(() => setMapOn(true), 1200);
    const t = window.setTimeout(() => idle(() => import("./MapViewGL").catch(() => {}), 6000), 2500);
    return () => window.clearTimeout(t);
  }, [mapOn, view, selectedId]);
  const activeGenre = genre === "all" ? null : GENRE_BY_ID[genre];
  const activeArea = area === "all" || area.startsWith("t:") ? null : areaById[area] ?? null;
  const frame = useMemo(() => {
    if (activeArea) return { center: activeArea.center, zoom: activeArea.zoom, maxZoom: activeArea.zoom + 0.4 };
    if (activeTown) return { center: TOWN_BY_ID[activeTown].center, zoom: TOWN_BY_ID[activeTown].zoom, maxZoom: 16 };
    return { center: city.center, zoom: city.zoom, maxZoom: 15 };
  }, [activeArea, activeTown, city]);
  const founding = city.status === "founding";
  const openAdd = () => {
    if (requireAuth(`Sign in to add a place in ${city.name}. It takes a few seconds, no password.`, () => setAdding(true))) setAdding(true);
  };
  // anything narrowing the list beyond the town you're in
  const narrowed = genre !== "all" || !!query || prices.length > 0 || savedOnly || sort !== "popular" || !!activeArea || !!theme;
  const themeLabel = theme ? (theme.kind === "collection" ? COLLECTION_BY_ID[theme.id]?.title : TRAILS.find((t) => t.id === theme.id)?.title) ?? null : null;
  // the front page (this week's plate, your passport, trails, occasions) shows until you narrow things down
  const showFront = !narrowed && !founding && allSpots.length > 0;
  // at most one sponsored card, and only once you've picked a kind of food or a part of town
  const sponsoredPick = (genre !== "all" || area !== "all") && !selectedId ? list.find((s) => s.sponsored) ?? null : null;
  const scoped = useMemo(() => allSpots.filter((s) => inScope(s)), [allSpots, inScope]);
  // server and first paint use the build time; the visitor's clock takes over right after
  const clock = useMemo(() => now ?? new Date(Number(process.env.NEXT_PUBLIC_BUILT_AT) || 0), [now]);
  const rows = useMemo(() => collectionsFor(clock, scoped, 3, !!now).slice(0, 3), [clock, scoped, now]);
  const week = useMemo(() => plateOfTheWeek(clock, allSpots.filter((s) => !s.addedBy)), [clock, allSpots]);
  const weekSince = useMemo(() => weekStart(clock), [clock]);
  const trail = useMemo(() => {
    for (const t of TRAILS) {
      const p = trailProgress(t, allSpots, areas, (id) => !!been[id], clock);
      if (p.open && p.list.length && !p.finished) return { t, p };
    }
    return null;
  }, [clock, allSpots, areas, been]);
  const pickTheme = useCallback(
    (t: Theme) => {
      setTheme(t);
      select(null);
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    },
    [select]
  );
  const seeCollection = useCallback((id: string) => pickTheme({ kind: "collection", id }), [pickTheme]);
  const seeTrail = useCallback((id: string) => pickTheme({ kind: "trail", id }), [pickTheme]);
  const openStamps = useCallback(() => {
    if (requireAuth(STAMP_WHY, () => setStampPicker(true))) setStampPicker(true);
  }, [requireAuth]);
  const askNear = () => {
    if (!navigator.geolocation) return toast("This browser can't share your location.", "err");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setHere([pos.coords.latitude, pos.coords.longitude]);
        setSort("near");
      },
      () => {
        toast("No location, so sorted by most loved instead.");
        setSort("popular");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  };

  const numbers = useMemo(() => Object.fromEntries(list.map((s, i) => [s.id, i + 1])) as Record<string, number>, [list]);
  const [today, setToday] = useState("");
  useEffect(() => {
    setToday(new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }));
  }, []);

  const placeName = activeArea ? activeArea.label : activeTown ? TOWN_BY_ID[activeTown].label : city.name;
  const whereLabel = activeArea ? activeArea.label : activeTown ? TOWN_BY_ID[activeTown].label : "Anywhere";
  const whereText = activeArea ? `in ${activeArea.label}` : activeTown ? `in ${TOWN_BY_ID[activeTown].label}` : `around ${city.name}`;
  const mapTitle = selected ? selected.name : placeName;
  const mapSub = selected
    ? `${areaLabelOf(selected)}. ${selected.address}`
    : `${list.length} ${list.length === 1 ? "place" : "places"}${themeLabel ? `: ${themeLabel.toLowerCase()}` : ""}${activeGenre ? `, ${activeGenre.label.toLowerCase()}` : ""}${activeArea || activeTown || themeLabel ? "" : ", all over town"}`;
  /** back to everything in your town (a neighborhood steps out to its town) */
  const clearFilters = () => {
    setGenre("all");
    setDrink("all");
    setQuery("");
    setPrices([]);
    setSavedOnly(false);
    setSort("popular");
    setTheme(null);
    if (activeArea) setArea(activeArea.town ? `t:${activeArea.town}` : "all");
  };
  // the same picks anywhere, for the empty state
  const elsewhere = useMemo(() => allSpots.filter(matchesBase).length, [allSpots, matchesBase]);
  const surpriseOrAdd = () => {
    if (!allSpots.length) return openAdd();
    if (requireAuth(SURPRISE_WHY, () => setSurprise(true))) setSurprise(true);
  };

  // phones: tuck the browse bar away while scrolling down the list, bring it back on the way up
  useEffect(() => {
    const el = scrollRef.current;
    setTucked(false);
    if (!el || !isMobile || selectedId || view !== "list") return;
    let last = el.scrollTop;
    const onScroll = () => {
      const y = el.scrollTop;
      // where the bar sits before it sticks (a stuck bar reports its stuck position, so measure what's above it)
      const bar = el.querySelector<HTMLElement>(".browse");
      const above = bar?.previousElementSibling as HTMLElement | null;
      const home = (above ? above.offsetTop + above.offsetHeight : 0) + (bar?.offsetHeight ?? 0);
      if (y < home) setTucked(false);
      else if (y > last + 8) setTucked(true);
      else if (y < last - 8) setTucked(false);
      last = y;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [isMobile, selectedId, view]);

  const goHome = () => {
    clearFilters();
    goView("list");
  };

  return (
    <div className={`app v-${view}${selected ? " has-sel" : ""}`}>
      <header className="masthead">
        <div className="mast-row">
          <button className="brand" onClick={goHome} title="Home">
            <Logo sub={`${city.name}, ${apState(city.state)}`} />
          </button>
          <nav className="mast-nav">
            <button className="navlink" onClick={openAdd}>
              Add a place
            </button>
            <Link className="navlink hide-md" href="/about">
              How we pick
            </Link>
            <Link className="navlink hide-md" href="/partners">
              For restaurants
            </Link>
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
          <span className="dl-mid">{city.id === DEFAULT_CITY ? "Birmingham · Homewood · Mountain Brook · Vestavia Hills" : `${city.name}, ${stateName(city.state)}`}</span>
          <span>{SIGNOFF}</span>
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
                  {/* the passport is members-only; signed out, Profile below shows the way in */}
                  {user && <Passport spots={allSpots} areas={areas} city={city.name} onOpen={(id) => select(id)} onStampMany={openStamps} />}
                  <Profile spotById={spotById} onOpen={(id) => select(id)} onAdd={openAdd} admin={admin} refreshKey={profileKey} />
                </motion.div>
              ) : (
                <motion.div key="browse" className="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                  <WhereBar city={city} onOpen={() => setCityPicker(true)} onGoHome={goCity} />
                  <section className="hello">
                    <p className="hello-hi">{now ? greeting(now) : "\u00a0"}</p>
                    {/* each sentence stays whole when the line has to break */}
                    <h1>
                      {MANTRA.split(". ").map((t, i, all) => (
                        <span key={t}>
                          {i > 0 && " "}
                          <span>{i < all.length - 1 ? `${t}.` : t}</span>
                        </span>
                      ))}
                    </h1>
                    {allSpots.length > 0 && <p>{allSpots.length} locally owned restaurants, coffee shops and bars. No chains, no fast food.</p>}
                    <p className="trust-line">
                      <span>Every place checked by a person</span>
                      <span>Nobody pays to rank</span>
                      <Link href="/about">How we pick</Link>
                    </p>
                  </section>

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

                  <BrowseBar
                    searchRef={searchRef}
                    query={query}
                    setQuery={setQuery}
                    genre={genre}
                    chooseGenre={chooseGenre}
                    genreCounts={genreCounts}
                    drink={drink}
                    setDrink={setDrink}
                    whereLabel={whereLabel}
                    whereOn={area !== "all"}
                    openWhere={() => setPicker({ open: true, first: false })}
                    prices={prices}
                    setPrices={setPrices}
                    savedOnly={savedOnly}
                    setSavedOnly={setSavedOnly}
                    savedCount={saved.length}
                    tucked={tucked}
                    theme={themeLabel ? { label: themeLabel, onClear: () => setTheme(null) } : null}
                  />

                  {showFront && (
                    <div className="front">
                      {week && <WeekPlate spot={week} since={weekSince} onOpen={select} />}
                      <PassportCard total={allSpots.length} count={stampedCount} onStampMany={openStamps} onOpen={openPassport} />
                      {rows.map((r, i) => (
                        <CollectionRow
                          key={r.id}
                          id={r.id}
                          title={r.title}
                          line={r.line}
                          spots={r.spots}
                          now={r.now && i === 0}
                          onOpen={select}
                          onHover={setHoveredId}
                          onSeeAll={seeCollection}
                        />
                      ))}
                      {trail && (
                        <TrailCard
                          id={trail.t.id}
                          title={trail.t.title}
                          line={trail.t.line}
                          spots={trail.p.list}
                          have={trail.p.have}
                          goal={trail.p.goal}
                          daysLeft={trail.p.daysLeft}
                          onSee={seeTrail}
                        />
                      )}
                      <h2 className="front-all">Every place</h2>
                    </div>
                  )}

                  <div className="results-head">
                    <p className="rh-count">
                      <strong>{list.length}</strong> {savedOnly ? "want-to-try " : ""}
                      {list.length === 1 ? "place" : "places"} {whereText}
                    </p>
                    {narrowed && (
                      <button className="textbtn rh-clear" onClick={clearFilters}>
                        Clear all
                      </button>
                    )}
                    <label className="sort">
                      <span>Sort</span>
                      <select
                        value={sort}
                        onChange={(e) => {
                          const v = e.target.value as Sort;
                          if (v === "near" && !here) askNear();
                          else setSort(v);
                        }}
                        aria-label="Sort by"
                      >
                        <option value="popular">Most loved</option>
                        <option value="near">Nearest to me</option>
                        <option value="rating">Top rated</option>
                        <option value="az">A to Z</option>
                      </select>
                    </label>
                  </div>

                  {/* a paid spot is one labeled card for a kind of food or a part of town, kept apart
                      from the list; it never changes anyone's place in the list itself */}
                  {sponsoredPick && (
                    <aside className="sponsored-slot" aria-label="Sponsored">
                      <span className="paid">Sponsored</span>
                      <PlaceCard spot={sponsoredPick} onOpen={select} onHover={setHoveredId} sizes="(max-width: 900px) 90vw, 360px" />
                    </aside>
                  )}

                  <ol className="bill">
                    {list.slice(0, shown).map((s, i) => (
                      <SpotRow
                        key={s.id}
                        spot={s}
                        n={i + 1}
                        rating={ratings[s.id]}
                        hot={hoveredId === s.id}
                        saved={saved.includes(s.id)}
                        onHover={setHoveredId}
                        onOpen={select}
                        ad={i === 4 && list.length > 6}
                        miles={sort === "near" && here ? distanceKm(here, s.coords) * 0.621 : undefined}
                        been={!!been[s.id]}
                      />
                    ))}
                  </ol>
                  {list.length > shown && <MoreRows onMore={moreRows} left={list.length - shown} root={scrollRef} />}

                  {list.length === 0 && !(founding && allSpots.length === 0) && (
                    <div className="empty">
                      <p className="empty-title">Nothing on the plate for that.</p>
                      <p>{area !== "all" && elsewhere > 0 ? `${elsewhere} ${elsewhere === 1 ? "place matches" : "places match"} somewhere else around ${city.name}.` : "Try fewer filters."}</p>
                      <div className="empty-btns">
                        {area !== "all" && elsewhere > 0 && (
                          <button className="btn btn-green" onClick={() => pickArea("all")}>
                            Look anywhere
                          </button>
                        )}
                        <button className="btn btn-line" onClick={clearFilters}>
                          Clear all
                        </button>
                      </div>
                    </div>
                  )}

                  <button className="write-in" onClick={openAdd}>
                    <span className="wi-title">Know a plate we&apos;re missing?</span>
                    <span>Write it in. We check that it&apos;s real and locally owned, then it goes up with your name on it.</span>
                  </button>

                  <Newsletter city={city} />
                  <footer className="side-foot">
                    <p className="foot-sign">
                      <PlateMark size={22} /> {SIGNOFF}
                    </p>
                    <p>Locally owned places only. If it has a drive-thru or a corporate office out of state, it isn&apos;t on here.</p>
                    <p>
                      {google || PINS_EXACT ? "" : "Map pins are close, not exact. "}Something closed or wrong? <Link href="/partners#contact">Let us know</Link>.{" "}
                      <Link href="/about">How we pick</Link>. <Link href="/partners">For restaurants</Link>. <Link href="/credits">Photo credits</Link>.
                    </p>
                    <p>
                      © {new Date().getFullYear()} {BRAND}, {city.name}, {apState(city.state)}
                    </p>
                  </footer>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </aside>

        <section className="mapwrap">
          <div className="map-plate">
            {mapOn ? (
              <MapView
                key={city.id}
                city={city}
                areas={areas}
                spots={placed}
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
            ) : (
              <div className="leaflet-host map-loading" />
            )}
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
                    aria-label={saved.includes(selected.id) ? "On your want-to-try list. Tap to remove" : "Want to try"}
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
                        if (navigator.share) await navigator.share({ title: selected.name, text: `${selected.name}: ${selected.knownFor}. Found on ${BRAND}.`, url });
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
        <button
          className={view === "list" && !selected ? "on" : ""}
          onClick={() => {
            // already here: back to the top, browse bar showing
            if (view === "list" && !selected) scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
            goView("list");
          }}
          aria-current={view === "list" && !selected ? "page" : undefined}
        >
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
        <button className={view === "me" && !selected ? "on" : ""} onClick={openPassport} aria-current={view === "me" && !selected ? "page" : undefined}>
          <TabGlyph k="stamp" />
          Passport
        </button>
      </nav>

      <WherePicker
        open={picker.open}
        firstRun={picker.first}
        city={city}
        area={area}
        areas={areas}
        counts={areaCounts}
        total={list.length}
        onArea={pickArea}
        onDone={closePicker}
        onChangeCity={() => {
          closePicker();
          setCityPicker(true);
        }}
      />
      <CityPicker open={cityPicker} city={city} onPick={goCity} onClose={() => setCityPicker(false)} />

      <StampPicker open={stampPicker} onClose={() => setStampPicker(false)} spots={allSpots} areas={areas} />

      <Surprise
        open={surprise && allSpots.length > 0}
        defaultScoped={narrowed && list.length > 0}
        onClose={() => setSurprise(false)}
        all={allSpots}
        filtered={list}
        onGo={(id) => {
          setSurprise(false);
          const s = spotById[id];
          if (s && !inScope(s)) setArea("all");
          select(id);
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
function TabGlyph({ k }: { k: "menu" | "map" | "me" | "spark" | "stamp" }) {
  const d = {
    menu: "M4 6h16M4 12h11M4 18h14",
    spark: "M12 3.5c.6 3.9 1.9 5.9 5.6 6.6-3.7.8-5 2.8-5.6 6.7-.6-3.9-1.9-5.9-5.6-6.7 3.7-.7 5-2.7 5.6-6.6ZM18.5 15.5c.3 1.6.8 2.4 2.2 2.7-1.4.3-1.9 1.1-2.2 2.7-.3-1.6-.8-2.4-2.2-2.7 1.4-.3 1.9-1.1 2.2-2.7Z",
    map: "M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14",
    me: "M12 12a4 4 0 1 0-.1 0M4.5 20c1.5-4 4.4-5.5 7.5-5.5s6 1.5 7.5 5.5",
    stamp: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM9.8 12.1l1.5 1.5 3-3.2",
  }[k];
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// a row only redraws when its own props change (hovering one row shouldn't redraw every row)
const SpotRow = memo(function SpotRow({
  spot,
  n,
  rating,
  hot,
  saved,
  onHover,
  onOpen,
  ad,
  miles,
  been,
}: {
  spot: Spot;
  n: number;
  rating?: { avg: number; count: number };
  hot: boolean;
  saved: boolean;
  onHover: (id: string | null) => void;
  onOpen: (id: string) => void;
  ad: boolean;
  miles?: number;
  been?: boolean;
}) {
  return (
    <>
      <li className={`item ${hot ? "hot" : ""}`} onMouseEnter={() => onHover(spot.id)} onMouseLeave={() => onHover(null)}>
        <button onClick={() => onOpen(spot.id)} className="item-btn">
          <span className="item-no">{n}</span>
          <span className="item-body">
            <span className="item-line">
              <span className="item-name">{spot.name}</span>
              <span className="leader" aria-hidden />
              <span className="item-price">{priceLabel(spot.price)}</span>
            </span>
            <span className="item-known">{spot.knownFor}</span>
            <span className="item-meta">
              {miles !== undefined ? `${miles < 0.1 ? "0.1" : miles.toFixed(1)} mi · ` : ""}
              {spot.genres.map((g) => GENRE_BY_ID[g].short).join(", ")} · {areaLabelOf(spot)}
              {rating ? ` · ${rating.avg.toFixed(1)} from ${rating.count} ${rating.count === 1 ? "member" : "members"}` : ""}
              {been ? " · been" : saved ? " · want to try" : ""}
              {spot.sponsored && <span className="paid">Sponsored</span>}
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
            <span>Your listing is free. Claim it to add photos, specials and your side of the story.</span>
          </Link>
        </li>
      )}
    </>
  );
});

/** Draws the next rows when it scrolls into view; a button too, for keyboards and old browsers. */
function MoreRows({ onMore, left, root }: { onMore: () => void; left: number; root: React.RefObject<HTMLElement> }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && onMore(), { root: root.current, rootMargin: "800px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [onMore, root, left]);
  return (
    <button ref={ref} className="textbtn more-rows" onClick={onMore}>
      Show {left} more
    </button>
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
          track("newsletter_signup", { city: city.id });
        } catch {
          toast("That didn't go through. Try again?", "err");
        }
      }}
    >
      <h2>{NEWSLETTER}</h2>
      <p>This week&apos;s plate, what opened and closed around {city.name}, and a few places worth the drive. Every Thursday, short.</p>
      {done ? (
        <p className="nl-done">You&apos;re on the list. See you Thursday.</p>
      ) : (
        <div className="nl-row">
          <input type="email" required placeholder="your email" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
          <button className="btn btn-green">Sign up</button>
        </div>
      )}
    </form>
  );
}
