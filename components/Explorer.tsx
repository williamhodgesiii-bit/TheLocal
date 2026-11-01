"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { track } from "@/lib/analytics";
import {
  DRINK_KINDS,
  GENRE_BY_ID,
  SPOTS,
  SPOT_BY_ID,
  TOWN_BY_ID,
  areaLabelOf,
  atLocation,
  canonicalSpotId,
  deriveAreas,
  distanceKm,
  locationsOf,
  type AreaId,
  type DrinkKind,
  type GenreId,
  type Spot,
  type TownId,
} from "@/lib/data";
import type { LetterWeek, RatingSummary } from "@/lib/backend";
import { BRAND, NEWSLETTER, SIGNOFF } from "@/lib/brand";
import { COLLECTION_BY_ID, collectionsFor, greeting } from "@/lib/collections";
import { letterFor, thursdayOf } from "@/lib/letter";
import { rankScore, siteAverage } from "@/lib/reviews";
import { TRAILS } from "@/lib/trails";
import { cleanList, newListId, type SpinList } from "@/lib/lists";
import { CITY_BY_ID, DEFAULT_CITY, HERE_KEY, HOME_KEY, HOME_TOWN_KEY, apState, cityPath, type City } from "@/lib/regions";
import { canLocate, currentPosition } from "@/lib/native";
import { hash } from "@/lib/images";
import WherePicker from "./WherePicker";
import CityPicker from "./CityPicker";
import SubmitSpot from "./SubmitSpot";
import MySubmissions from "./MySubmissions";
import { useApp } from "./Providers";
import SpotDetail from "./SpotDetail";
import Surprise from "./Surprise";
import { PlateMark } from "./Brand";
import StampPicker from "./StampPicker";
import type { FriendsTab, Pins } from "./Friends";
import MemberPage from "./MemberPage";
import Home, { Shelf } from "./Home";
import ExploreView, { type Sort } from "./ExploreView";
import ListsView, { ListEditor } from "./ListsView";
import You from "./You";
import { Icon, type IconName } from "./Icons";
import { Avatar } from "./People";

type View = "home" | "friends" | "explore" | "lists" | "me" | "member";
/** what a history entry remembers about the screen */
type Screen = { view: View; selectedId: string | null; handle: string | null; friendsTab: FriendsTab; returnView: View; mapMode: boolean; depth: number };

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

/* exploring is open to everyone; these belong to an account (stamps and saves are gated in Providers) */
const SURPRISE_WHY = "Sign in to spin Surprise me. It takes a few seconds, no password.";
const STAMP_WHY = "Sign in to stamp your Plate Passport. It takes a few seconds, no password.";
/** an occasion collection or a trail, picked from the front page; filters the list and frames the map */
type Theme = { kind: "collection" | "trail"; id: string } | null;
const SEEN_KEY = "tl.seenApproved";
const writeHere = (id: string) => {
  try {
    sessionStorage.setItem(HERE_KEY, id);
  } catch {
    /* ignore */
  }
};
const explorePath = (c: City) => (c.id === DEFAULT_CITY ? "/explore" : cityPath(c));
/** which screen an address shows */
function viewOfPath(path: string): View {
  if (path === "/") return "home";
  if (path === "/me") return "me";
  if (path === "/friends") return "friends";
  if (path === "/lists") return "lists";
  if (path.startsWith("/u/")) return "member";
  return "explore";
}

export default function Explorer({
  cityId,
  initialSpot,
  initialSpotData,
  initialView,
  initialHandle,
}: {
  cityId?: string;
  initialSpot?: string;
  initialSpotData?: Spot;
  initialView?: View;
  /** /u/[handle]: whose page */
  initialHandle?: string;
}) {
  const { backend, user, openAuth, requireAuth, toast, saved, home, unread, registerNav, me, google } = useApp();
  const router = useRouter();
  const [city, setCity] = useState<City>(CITY_BY_ID[cityId ?? initialSpotData?.city ?? DEFAULT_CITY] ?? CITY_BY_ID[DEFAULT_CITY]);
  const [community, setCommunity] = useState<Spot[]>(initialSpotData ? [initialSpotData] : []);
  const [picker, setPicker] = useState<{ open: boolean; first: boolean }>({ open: false, first: false });
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
  const [here, setHere] = useState<[number, number] | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  const [selectedId, setSelectedId] = useState<string | null>(initialSpot ? canonicalSpotId(initialSpot) : null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [surprise, setSurprise] = useState<{ open: boolean; from: string | null }>({ open: false, from: null });
  const [newList, setNewList] = useState<SpinList | null>(null);
  const [ratings, setRatings] = useState<RatingSummary>({});
  const [userMenu, setUserMenu] = useState(false);
  const [view, setView] = useState<View>(initialView ?? (cityId ? "explore" : "home"));
  const [returnView, setReturnView] = useState<View>("home");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [profileKey, setProfileKey] = useState(0);
  const [handle, setHandle] = useState<string | null>(initialHandle ?? null);
  const [friendsTab, setFriendsTab] = useState<FriendsTab>("following");
  const [pins, setPins] = useState<Pins>(null);
  const [mapMode, setMapMode] = useState(false);
  const isMobile = useIsMobile();
  const q = useDeferredValue(query);
  const searchRef = useRef<HTMLInputElement>(null);
  const hydrated = useRef(false);
  /** opening a place, a tab or someone's page is a new history entry; filters update the one you're on */
  const push = useRef(false);

  /* ---------- city ---------- */
  // Home is where the map opens; "Where are you?" (this tab only) can point somewhere else.
  useEffect(() => {
    let saved: string | null = null;
    let town: string | null = null;
    let hereCity: string | null = null;
    try {
      saved = localStorage.getItem(HOME_KEY);
      town = localStorage.getItem(HOME_TOWN_KEY);
      hereCity = sessionStorage.getItem(HERE_KEY);
    } catch {
      /* ignore */
    }
    if ((saved ?? DEFAULT_CITY) === city.id && town && TOWN_BY_ID[town as TownId] && !initialSpot && !new URLSearchParams(location.search).get("a")) setArea(`t:${town}`);
    if (cityId || initialSpot) return;
    const start = hereCity ?? saved;
    if (start && start !== city.id && CITY_BY_ID[start]) setCity(CITY_BY_ID[start]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityId, initialSpot]);
  useEffect(() => {
    if (cityId && CITY_BY_ID[cityId]) writeHere(cityId);
  }, [cityId]);
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
  const inArea = useCallback(
    (locArea: AreaId, a: string) => a === "all" || (a.startsWith("t:") ? areaById[locArea]?.town === a.slice(2) : locArea === a),
    [areaById]
  );
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
    if (p.get("view") === "map") setMapMode(true);
    // an old link to the list with filters on it lands on Explore
    if (!initialView && !cityId && !initialSpot && (g || a || c || t || p.get("view"))) setView("explore");
    if (location.pathname === "/friends") {
      const tab = p.get("tab");
      if (tab === "everyone" || tab === "activity") setFriendsTab(tab);
    }
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    const p = new URLSearchParams();
    const sel = selectedId ? spotById[selectedId] : null;
    if (!sel && view === "explore") {
      if (genre !== "all") p.set("g", genre);
      if (genre === "drinks" && drink !== "all") p.set("d", drink);
      if (area !== "all") p.set("a", area);
      if (theme) p.set(theme.kind === "collection" ? "c" : "t", theme.id);
      if (mapMode) p.set("view", "map");
    }
    if (!sel && view === "friends" && friendsTab !== "following") p.set("tab", friendsTab);
    const path = sel
      ? `/spot/${sel.id}`
      : view === "me"
        ? "/me"
        : view === "friends"
          ? "/friends"
          : view === "lists"
            ? "/lists"
            : view === "member" && handle
              ? `/u/${handle}`
              : view === "explore"
                ? explorePath(city)
                : "/";
    const qs = p.toString();
    const url = qs ? `${path}?${qs}` : path;
    const cur: Screen | undefined = history.state?.tl;
    const screen: Screen = { view, selectedId, handle, friendsTab, returnView, mapMode, depth: cur?.depth ?? 0 };
    const dead = !!history.state?.tlDead;
    if (push.current && dead) history.replaceState({ tl: { ...screen, depth: screen.depth + 1 } }, "", url);
    else if (push.current && url !== location.pathname + location.search) history.pushState({ tl: { ...screen, depth: screen.depth + 1 } }, "", url);
    else history.replaceState({ tl: screen, ...(history.state?.tlSheet ? { tlSheet: 1 } : {}) }, "", url);
    push.current = false;
    document.title = sel
      ? `${sel.name} · ${BRAND}`
      : view === "friends"
        ? `Friends · ${BRAND}`
        : view === "lists"
          ? `Lists · ${BRAND}`
          : view === "me"
            ? `You · ${BRAND}`
            : view === "member" && handle
              ? `@${handle} · ${BRAND}`
              : view === "explore"
                ? `Explore ${city.name} · ${BRAND}`
                : `${BRAND} · ${city.name}'s locally owned restaurants, coffee & bars`;
  }, [genre, drink, area, selectedId, spotById, city, view, theme, friendsTab, handle, returnView, mapMode]);

  // Back and Forward: put the screen back the way it was
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const tl: Screen | undefined = e.state?.tl;
      const path = location.pathname;
      const m = path.match(/^\/(spot|u)\/([^/]+)/);
      const next: Omit<Screen, "depth"> = tl ?? {
        view: m?.[1] === "spot" ? "home" : viewOfPath(path),
        selectedId: m?.[1] === "spot" ? canonicalSpotId(decodeURIComponent(m[2])) : null,
        handle: m?.[1] === "u" ? decodeURIComponent(m[2]) : null,
        friendsTab: "following",
        returnView: "home",
        mapMode: new URLSearchParams(location.search).get("view") === "map",
      };
      setView(next.view);
      setSelectedId(next.selectedId);
      setHandle(next.handle);
      setFriendsTab(next.friendsTab);
      setReturnView(next.returnView);
      setMapMode(!!next.mapMode);
      setHoveredId(null);
      setFocusId(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    backend.ratings().then(setRatings).catch(() => {});
  }, [backend, selectedId]);

  /* ---------- filtering ---------- */
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
    const mean = siteAverage(ratings);
    const r = (s: Spot) => rankScore(ratings[s.id], mean);
    // nobody can pay to move up this list: order is by the sort alone
    out.sort((a, b) => {
      if (sort === "near" && here) return distanceKm(here, a.coords) - distanceKm(here, b.coords);
      if (sort === "az") return a.name.localeCompare(b.name);
      if (sort === "rating") return r(b) - r(a) || b.pop - a.pop;
      return b.pop - a.pop;
    });
    return out;
  }, [placed, matchesBase, inScope, sort, ratings, here]);

  const pinsOn = !!pins && (view === "friends" || view === "member");
  const visible = useMemo(() => new Set(pinsOn ? pins!.ids : list.map((s) => s.id)), [list, pins, pinsOn]);
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

  /* ---------- moving around ---------- */
  const top = () => window.scrollTo({ top: 0 });
  const select = useCallback(
    (id: string | null, opts?: { replace?: boolean }) => {
      if (!opts?.replace && id !== selectedId) push.current = true;
      if (id && !selectedId) setReturnView(view);
      setSelectedId(id);
      setHoveredId(null);
      setFocusId(null);
      top();
    },
    [selectedId, view]
  );
  const goView = useCallback((v: View) => {
    push.current = true;
    if (v === "me") setProfileKey((k) => k + 1);
    setSelectedId(null);
    setFocusId(null);
    setView(v);
    top();
  }, []);
  const openFriends = useCallback(
    (tab?: FriendsTab) => {
      if (tab) setFriendsTab(tab);
      goView("friends");
    },
    [goView]
  );
  const openMember = useCallback(
    (h: string) => {
      push.current = true;
      setReturnView(selectedId ? view : view === "member" ? returnView : view);
      setHandle(h);
      setSelectedId(null);
      setFocusId(null);
      setView("member");
      top();
    },
    [selectedId, view, returnView]
  );
  /** Back: one step through the app's own history when there is one, else somewhere sensible */
  const goBack = useCallback((fallback: () => void) => {
    if ((history.state?.tl?.depth ?? 0) > 0) history.back();
    else {
      fallback();
      push.current = false;
    }
  }, []);
  useEffect(() => {
    registerNav({ member: openMember, spot: (id) => select(id), friends: openFriends });
    return () => registerNav(null);
  }, [registerNav, openMember, select, openFriends]);

  const toExplore = useCallback(() => {
    if (view !== "explore" || selectedId) goView("explore");
  }, [view, selectedId, goView]);
  const chooseGenre = (g: GenreId | "all") => {
    setGenre((cur) => (cur === g && g !== "all" ? "all" : g));
    setDrink("all");
  };
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
  const goCity = useCallback(
    (c: City) => {
      writeHere(c.id);
      setCityPicker(false);
      if (c.id === city.id) return;
      router.push(explorePath(c));
    },
    [city.id, router]
  );
  const pickArea = (a: string) => {
    remember(a);
    setArea(a);
  };
  const closePicker = () => {
    if (picker.first) remember(area);
    setPicker({ open: false, first: false });
  };
  const chooseArea = useCallback(
    (a: AreaId | "all") => {
      setArea((cur) => (cur === a && a !== "all" ? (areaById[a]?.town ? `t:${areaById[a].town}` : "all") : a));
    },
    [areaById]
  );
  const openSurprise = useCallback(
    (from: string | null = null) => {
      if (!allSpots.length) return setAdding(true);
      if (requireAuth(SURPRISE_WHY, () => setSurprise({ open: true, from }))) setSurprise({ open: true, from });
    },
    [allSpots.length, requireAuth]
  );

  // keyboard: "/" search, "s" surprise, Esc back
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || surprise.open) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      if (e.key === "/") {
        e.preventDefault();
        toExplore();
        setTimeout(() => searchRef.current?.focus(), 60);
      } else if (e.key.toLowerCase() === "s" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        openSurprise();
      } else if (e.key === "Escape" && selectedId) {
        goBack(() => select(null));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, surprise.open, select, goBack, toExplore, openSurprise]);

  const selected = selectedId ? placedById[selectedId] ?? null : null;

  // the map engine is the heaviest thing on the page: it loads only for Explore's map
  const showMap = view === "explore" && mapMode && !selected;
  const [mapOn, setMapOn] = useState(false);
  useEffect(() => {
    if (showMap) return setMapOn(true);
    if (mapOn || view !== "explore") return;
    const idle = (cb: () => void, wait: number) => (typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(cb, { timeout: wait }) : setTimeout(cb, wait));
    const t = window.setTimeout(() => idle(() => import("./MapViewGL").catch(() => {}), 6000), 3000);
    return () => window.clearTimeout(t);
  }, [showMap, mapOn, view]);

  const activeArea = area === "all" || area.startsWith("t:") ? null : areaById[area] ?? null;
  const frame = useMemo(() => {
    if (activeArea) return { center: activeArea.center, zoom: activeArea.zoom, maxZoom: activeArea.zoom + 0.4 };
    if (activeTown) return { center: TOWN_BY_ID[activeTown].center, zoom: TOWN_BY_ID[activeTown].zoom, maxZoom: 16 };
    return { center: city.center, zoom: city.zoom, maxZoom: 15 };
  }, [activeArea, activeTown, city]);
  const openAdd = () => {
    if (requireAuth(`Sign in to add a place in ${city.name}. It takes a few seconds, no password.`, () => setAdding(true))) setAdding(true);
  };
  const narrowed = genre !== "all" || !!query || prices.length > 0 || savedOnly || sort !== "popular" || !!activeArea || !!theme;
  const themeLabel = theme ? (theme.kind === "collection" ? COLLECTION_BY_ID[theme.id]?.title : TRAILS.find((t) => t.id === theme.id)?.title) ?? null : null;
  const sponsoredPick = (genre !== "all" || area !== "all") && !selectedId ? list.find((s) => s.sponsored) ?? null : null;
  const scoped = useMemo(() => allSpots.filter((s) => inScope(s)), [allSpots, inScope]);
  const clock = useMemo(() => now ?? new Date(Number(process.env.NEXT_PUBLIC_BUILT_AT) || 0), [now]);
  // three shelves for the front page, fresh each day: well-loved places lead, nobody shows up on
  // two shelves at once, and the order shifts a little every morning
  const rows = useMemo(() => {
    const day = clock.toISOString().slice(0, 10);
    const jitter = (id: string) => 0.65 + ((hash(`${day}:${id}`) % 1000) / 1000) * 0.7;
    const seen = new Set<string>();
    return collectionsFor(clock, scoped.length >= 20 ? scoped : allSpots, 4, !!now)
      .slice(0, 3)
      .map((r) => {
        const order = [...r.spots].sort((a, b) => b.pop * jitter(b.id) - a.pop * jitter(a.id));
        const fresh = order.filter((s) => !seen.has(s.id));
        const spots = [...fresh, ...order.filter((s) => seen.has(s.id))];
        spots.slice(0, 6).forEach((s) => seen.add(s.id));
        return { ...r, spots };
      });
  }, [clock, scoped, allSpots, now]);
  const week = thursdayOf(clock);
  const [letterRow, setLetterRow] = useState<LetterWeek | null>(null);
  useEffect(() => {
    if (city.id !== DEFAULT_CITY) return setLetterRow(null);
    let live = true;
    backend.letterWeek(week).then((r) => live && setLetterRow(r)).catch(() => {});
    return () => {
      live = false;
    };
  }, [backend, city.id, week]);
  const letterPool = useMemo(() => (city.id === DEFAULT_CITY ? [...SPOTS, ...community.filter((x) => x.city === city.id && !SPOT_BY_ID[x.id])] : allSpots), [city.id, community, allSpots]);
  const letter = useMemo(() => letterFor(week, letterPool, letterRow), [week, letterPool, letterRow]);
  const fresh = useMemo(() => community.filter((s) => s.verifiedAt).sort((a, b) => (b.verifiedAt ?? "").localeCompare(a.verifiedAt ?? "")).slice(0, 10), [community]);
  const toLetter = useCallback(() => {
    const f = document.getElementById("letter-signup");
    f?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => f?.querySelector("input")?.focus({ preventScroll: true }), 500);
  }, []);
  const pickTheme = useCallback(
    (t: Theme) => {
      setTheme(t);
      setGenre("all");
      goView("explore");
    },
    [goView]
  );
  const seeCollection = useCallback((id: string) => pickTheme({ kind: "collection", id }), [pickTheme]);
  const openStamps = useCallback(() => {
    if (requireAuth(STAMP_WHY, () => setStampPicker(true))) setStampPicker(true);
  }, [requireAuth]);
  const pickSort = (v: Sort) => {
    if (v !== "near" || here) return setSort(v);
    if (!canLocate()) return toast("This browser can't share your location.", "err");
    currentPosition(8000).then(
      (p) => {
        setHere(p);
        setSort("near");
      },
      () => {
        toast("No location, so sorted by most loved instead.");
        setSort("popular");
      }
    );
  };
  const numbers = useMemo(() => Object.fromEntries((pinsOn ? pins!.ids : list.map((s) => s.id)).map((id, i) => [id, i + 1])) as Record<string, number>, [list, pins, pinsOn]);
  const whereLabel = activeArea ? activeArea.label : activeTown ? TOWN_BY_ID[activeTown].label : "Anywhere";
  const whereText = activeArea ? `in ${activeArea.label}` : activeTown ? `in ${TOWN_BY_ID[activeTown].label}` : `around ${city.name}`;
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
  const elsewhere = useMemo(() => allSpots.filter(matchesBase).length, [allSpots, matchesBase]);
  const changeMapMode = (v: boolean) => {
    setMapMode(v);
    setFocusId(null);
    top();
  };

  const map =
    mapOn && showMap ? (
      <MapView
        key={city.id}
        city={city}
        areas={areas}
        spots={placed}
        numbers={numbers}
        visible={visible}
        selectedId={selectedId}
        hoveredId={hoveredId}
        focusId={isMobile ? focusId : null}
        frame={frame}
        area={area}
        onSelect={select}
        onHover={setHoveredId}
        onArea={chooseArea}
      />
    ) : (
      <div className="leaflet-host map-loading" />
    );

  const foot = (
    <footer className="site-foot">
      <Newsletter city={city} />
      <button type="button" className="write-in" onClick={openAdd}>
        <b>Know a place we&apos;re missing?</b>
        <span>Add it. We check it&apos;s real and locally owned, then it goes up with your name on it.</span>
      </button>
      <nav className="foot-links" aria-label="About">
        <Link href="/about">How we pick</Link>
        <Link href="/partners">For restaurants</Link>
        <Link href="/best">Guides</Link>
        <Link href="/credits">Credits</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <a href="mailto:emails@theplatenextdoor.com">Contact</a>
      </nav>
      <p className="foot-sign">
        <PlateMark size={20} /> {SIGNOFF} Locally owned places only. © {new Date().getFullYear()} {BRAND}, {city.name}, {apState(city.state)}
      </p>
    </footer>
  );

  const tabs: { id: View | "surprise"; label: string; icon: IconName; on: boolean; go: () => void }[] = [
    { id: "home", label: "Home", icon: "home", on: (view === "home" || view === "friends") && !selected, go: () => (view === "home" && !selected ? window.scrollTo({ top: 0, behavior: "smooth" }) : goView("home")) },
    { id: "explore", label: "Explore", icon: "search", on: view === "explore" && !selected, go: () => (view === "explore" && !selected ? window.scrollTo({ top: 0, behavior: "smooth" }) : goView("explore")) },
    { id: "surprise", label: "Surprise", icon: "spark", on: false, go: () => openSurprise() },
    { id: "lists", label: "Lists", icon: "lists", on: view === "lists" && !selected, go: () => goView("lists") },
    { id: "me", label: "You", icon: "user", on: (view === "me" || (view === "member" && !!me && handle === me.handle)) && !selected, go: () => goView("me") },
  ];

  let body: React.ReactNode;
  if (selected) body = <SpotDetail key={selected.id} spot={selected} pool={allSpots} areas={areas} onBack={() => goBack(() => select(null))} onSelect={select} />;
  else if (view === "home" || view === "friends")
    body = (
      <div className="with-rail">
        <div className="col-main">
          <Home
            tab={view === "friends" ? "friends" : "foryou"}
            onTab={(t) => {
              if (t === "friends") setFriendsTab((x) => x);
              setView(t === "friends" ? "friends" : "home");
            }}
            friendsTab={friendsTab}
            onFriendsTab={setFriendsTab}
            spotById={spotById}
            letter={letter}
            rows={rows}
            fresh={fresh}
            onOpen={select}
            onSeeAll={seeCollection}
            onPins={setPins}
            onSignup={toLetter}
          />
        </div>
        <aside className="rail" aria-label="More">
          <div className="d-only">
            <SpinCard onSpin={openSurprise} onLists={() => goView("lists")} />
            <Shelf title="Award winners" spots={allSpots.filter((s) => COLLECTION_BY_ID.honors?.match(s)).slice(0, 6)} onOpen={select} onSeeAll={() => seeCollection("honors")} />
          </div>
          {foot}
        </aside>
      </div>
    );
  else if (view === "explore")
    body = (
      <ExploreView
        searchRef={searchRef}
        list={list}
        ratings={ratings}
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
        sort={sort}
        pickSort={pickSort}
        theme={themeLabel ? { label: themeLabel, onClear: () => setTheme(null) } : null}
        narrowed={narrowed}
        clearFilters={clearFilters}
        countLine={`${list.length} ${savedOnly ? "want-to-try " : ""}${list.length === 1 ? "place" : "places"} ${whereText}`}
        mapMode={mapMode}
        setMapMode={changeMapMode}
        isMobile={isMobile}
        map={map}
        sponsoredPick={sponsoredPick}
        onOpen={select}
        onHover={setHoveredId}
        hoveredId={hoveredId}
        focusId={focusId}
        onFocus={setFocusId}
        milesTo={sort === "near" && here ? (s) => distanceKm(here, s.coords) * 0.621 : undefined}
        empty={
          <div className="empty">
            <p className="empty-title">Nothing for that.</p>
            <p>{area !== "all" && elsewhere > 0 ? `${elsewhere} ${elsewhere === 1 ? "place matches" : "places match"} somewhere else around ${city.name}.` : "Try fewer filters."}</p>
            <div className="row gap8">
              {area !== "all" && elsewhere > 0 && (
                <button className="btn btn-ink" onClick={() => pickArea("all")}>
                  Look anywhere
                </button>
              )}
              <button className="btn btn-line" onClick={clearFilters}>
                Clear filters
              </button>
            </div>
          </div>
        }
        foot={foot}
      />
    );
  else if (view === "lists") body = <ListsView spots={allSpots} areas={areas} onOpen={select} onSpin={(from) => openSurprise(from)} />;
  else if (view === "member" && handle)
    body = (
      <div className="col-narrow">
        <MemberPage
          key={handle}
          handle={handle}
          spotById={spotById}
          onOpen={select}
          onPins={setPins}
          onBack={() => goBack(() => goView(returnView === "member" ? "home" : returnView))}
          onHandle={setHandle}
        />
      </div>
    );
  else
    body = (
      <div className="col-narrow">
        <You
          spots={allSpots}
          spotById={spotById}
          areas={areas}
          city={city.name}
          admin={admin}
          refreshKey={profileKey}
          onOpen={select}
          onAdd={openAdd}
          onStampMany={openStamps}
          onMember={openMember}
          onLists={() => goView("lists")}
        />
      </div>
    );

  return (
    <div className={`app v-${view}${selected ? " has-sel" : ""}${showMap ? " map-on" : ""}`}>
      <header className="topbar">
        <div className="topbar-in">
          <button className="brand" onClick={() => goView("home")} aria-label={`${BRAND}, home`}>
            <PlateMark size={30} />
            <span className="brand-name">{BRAND}</span>
          </button>
          <nav className="tnav" aria-label="Sections">
            {tabs
              .filter((t) => t.id !== "surprise")
              .map((t) => (
                <button key={t.id} className={t.on ? "on" : ""} onClick={t.go} aria-current={t.on ? "page" : undefined}>
                  {t.label}
                </button>
              ))}
          </nav>
          <div className="tright">
            <button className="icon-btn search-jump" onClick={() => (toExplore(), setTimeout(() => searchRef.current?.focus(), 80))} aria-label="Search">
              <Icon name="search" size={20} />
            </button>
            {user && (
              <button className="icon-btn bell" onClick={() => openFriends("activity")} aria-label={unread ? `${unread} new notifications` : "Notifications"}>
                <Icon name="bell" size={20} />
                {unread > 0 && <span className="bell-n">{unread > 9 ? "9+" : unread}</span>}
              </button>
            )}
            <button className="btn btn-red btn-surprise" onClick={() => openSurprise()}>
              <Icon name="spark" size={17} /> Surprise me
            </button>
            {user ? (
              <div className="user-wrap">
                <button className="av-btn" onClick={() => setUserMenu((v) => !v)} aria-expanded={userMenu} aria-label="Your account">
                  <Avatar m={{ id: user.id, name: user.name }} size={32} />
                </button>
                <AnimatePresence>
                  {userMenu && (
                    <motion.div className="user-menu" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} onMouseLeave={() => setUserMenu(false)}>
                      <span className="um-name">{user.name}</span>
                      <span className="um-mail">{user.email}</span>
                      <button className="menu-item" onClick={() => (goView("me"), setUserMenu(false))}>
                        You &amp; your passport
                      </button>
                      {me && (
                        <button className="menu-item" onClick={() => (openMember(me.handle), setUserMenu(false))}>
                          Your page (@{me.handle})
                        </button>
                      )}
                      <button className="menu-item" onClick={() => (openAdd(), setUserMenu(false))}>
                        Add a place
                      </button>
                      <button className="menu-item" onClick={() => (setMine(true), setUserMenu(false))}>
                        Places you&apos;ve added
                      </button>
                      <Link className="menu-item" href="/partners">
                        For restaurants
                      </Link>
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
              <button className="btn btn-line btn-sm signin" onClick={() => openAuth()}>
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="page" id="main">
        {body}
      </main>

      <nav className="tabbar" aria-label="Sections">
        {tabs.map((t) => (
          <button key={t.id} className={`${t.on ? "on" : ""} ${t.id === "surprise" ? "tab-spin" : ""}`} onClick={t.go} aria-current={t.on ? "page" : undefined}>
            <span className="tab-ico">
              <Icon name={t.icon} size={t.id === "surprise" ? 22 : 23} fill={false} stroke={t.on ? 2.1 : 1.7} />
              {t.id === "home" && user && unread > 0 && <span className="tab-dot" aria-label={`${unread} new`} />}
            </span>
            <span className="tab-l">{t.label}</span>
          </button>
        ))}
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
        open={surprise.open && allSpots.length > 0}
        from={surprise.from}
        narrowed={narrowed && view === "explore"}
        onClose={() => setSurprise({ open: false, from: null })}
        all={allSpots}
        filtered={list}
        onGo={(id) => {
          setSurprise({ open: false, from: null });
          const s = spotById[id];
          if (s && !inScope(s)) setArea("all");
          select(id);
        }}
        onNewList={() => {
          setSurprise({ open: false, from: null });
          setNewList(cleanList({ id: newListId(), title: "", rules: {}, spotIds: [], isPublic: true }));
        }}
      />
      <ListEditor list={newList} spots={allSpots} areas={areas} onClose={() => setNewList(null)} onDeleted={() => setNewList(null)} onDelete={async () => {}} />
      <SubmitSpot open={adding} onClose={() => setAdding(false)} onDone={() => setProfileKey((k) => k + 1)} city={city} areas={areas} spots={allSpots} />
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

/** the desktop rail: Surprise me and your lists, always a click away */
function SpinCard({ onSpin, onLists }: { onSpin: (from?: string | null) => void; onLists: () => void }) {
  const { lists, user } = useApp();
  const [hi, setHi] = useState("");
  useEffect(() => setHi(greeting(new Date())), []);
  return (
    <section className="spin-card">
      <p className="eyebrow">{hi || " "}</p>
      <h2 className="spin-h">Can&apos;t decide?</h2>
      <p className="spin-p">Let us pick. Spin from everywhere, or from one of your lists.</p>
      <button type="button" className="btn btn-red btn-block" onClick={() => onSpin()}>
        <Icon name="spark" size={18} /> Surprise me
      </button>
      {user && lists.length > 0 && (
        <div className="spin-lists">
          {lists.slice(0, 5).map((l) => (
            <button key={l.id} type="button" className="chip" onClick={() => onSpin(l.id)}>
              {l.title}
            </button>
          ))}
        </div>
      )}
      <button type="button" className="link-btn" onClick={onLists}>
        {user && lists.length ? "Your lists" : "Make a list to spin from"} <Icon name="right" size={14} />
      </button>
    </section>
  );
}

function Newsletter({ city }: { city: City }) {
  const { backend, toast } = useApp();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  return (
    <form
      id="letter-signup"
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
      <h2 className="nl-h">{NEWSLETTER}</h2>
      <p>Three places every Thursday morning: one fine dining, one casual, one wildcard.</p>
      {done ? (
        <p className="nl-done">You&apos;re on the list. See you Thursday.</p>
      ) : (
        <div className="nl-row">
          <input type="email" required placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
          <button className="btn btn-ink">Sign up</button>
        </div>
      )}
    </form>
  );
}
