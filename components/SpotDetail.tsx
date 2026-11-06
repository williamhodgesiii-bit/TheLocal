"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { track } from "@/lib/analytics";
import { GENRE_BY_ID, areaLabelOf, distanceKm, locationsOf, mapsUrl, priceLabel, type Area, type Spot } from "@/lib/data";
import { BRAND, CHECKED } from "@/lib/brand";
import { HOUSE_PHOTOS, PLACE_PHOTOS, commonsPage, commonsSrc, commonsSrcSet, frontFor, googleSrc, houseSrcSet, type HousePhoto } from "@/lib/photos";
import type { Photo as MemberPhoto, PhotoKind } from "@/lib/backend";
import type { SpinList } from "@/lib/lists";
import { shareLink } from "@/lib/native";
import { useApp, type Verdict } from "./Providers";
import Reviews from "./Reviews";
import Photo from "./Photo";
import Lightbox, { type Slide } from "./Lightbox";
import { Honors } from "./FrontPage";
import GiftSheet from "./GiftSheet";
import { Matchbook } from "./Cover";
import { Icon } from "./Icons";
import LocatorMap from "./LocatorMap";
import { AddToList, ListEditor } from "./ListsView";
import { Shelf } from "./Home";

type GPhoto = { name: string; author: string; authorUri: string | null };
type Places = { enabled: boolean; photos: GPhoto[] };

const NONE: (typeof PLACE_PHOTOS)[string] = [];
const NO_HOUSE: HousePhoto[] = [];
const VERDICTS: [Verdict, string][] = [
  ["loved", "Loved it"],
  ["liked", "It was good"],
  ["meh", "Not for me"],
];

/**
 * A place's page: its cover, the name, four things you can do, what to order, then reviews,
 * photos and how to get there. Nothing is boxed in; the sections are separated by space.
 */
export default function SpotDetail({
  spot,
  pool,
  areas,
  onBack,
  onSelect,
}: {
  spot: Spot;
  pool: Spot[];
  areas: Area[];
  onBack: () => void;
  onSelect: (id: string) => void;
}) {
  const { backend, requireAuth, toast, covers, refreshCovers, google, saved, toggleSaved, been, markBeen, user } = useApp();
  const [photos, setPhotos] = useState<MemberPhoto[]>([]);
  const [places, setPlaces] = useState<Places | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [gifting, setGifting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadKind, setUploadKind] = useState<PhotoKind>("food");
  const [writeSignal, setWriteSignal] = useState(0);
  const [listing, setListing] = useState(false);
  const [newList, setNewList] = useState<SpinList | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    setPhotos([]);
    setPlaces(null);
    backend.listPhotos(spot.id).then((p) => live && setPhotos(p)).catch(() => {});
    // Google's photos, only for places the weekly pins lookup doesn't already cover (and only once
    // a key is set): keeps Google's bill at zero
    if (google && !google.photos[spot.id]) {
      const q = new URLSearchParams({ spot: spot.id, name: spot.name, address: spot.address, city: spot.city });
      fetch(`/api/places?${q}`)
        .then((r) => r.json())
        .then((j) => live && setPlaces(j))
        .catch(() => {});
    }
    track("spot_view", { id: spot.id });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spot.id, backend, !!google]);

  // The cover is the same picture as its card everywhere else (lib/photos → frontFor). Only real
  // photos of this place go in the gallery: no stock pictures of dishes from somewhere else.
  const real = PLACE_PHOTOS[spot.id] ?? NONE;
  const house = HOUSE_PHOTOS[spot.id] ?? NO_HOUSE;
  const hero: Slide = useMemo(() => {
    const b = photos.find((p) => p.kind === "building");
    const f = frontFor(spot, covers[spot.id] ?? (b ? { url: b.url, by: b.userName, featured: false } : null), google?.photos[spot.id]);
    const gp = places?.photos?.[0];
    if (f.kind === "img") {
      const url = f.src(1200);
      return { key: url, kind: "img", url, file: f.file, srcSet: f.file ? undefined : f.srcSet?.([500, 960, 1280]), label: f.label, alt: f.alt, credit: f.credit, link: f.link };
    }
    if (gp) return { key: gp.name, kind: "img", url: googleSrc(gp.name), label: "Photo", alt: `${spot.name}`, credit: `Google · ${gp.author}`, link: gp.authorUri ?? undefined };
    return { key: "svg", kind: "svg", label: "", alt: spot.name };
  }, [photos, places, spot, covers, google]);

  const gallery: Slide[] = useMemo(() => {
    const out: Slide[] = [];
    house
      .filter((h) => h.src !== hero.url)
      .forEach((h) => out.push({ key: h.src, kind: "img", url: h.src, srcSet: houseSrcSet(h), label: h.caption, alt: `${spot.name}: ${h.caption.toLowerCase()}`, credit: `photo from ${h.credit}`, link: h.link }));
    photos
      .filter((p) => p.url !== hero.url)
      .forEach((p) => {
        const label = p.caption || (p.reviewId ? `From ${p.userName}'s review` : p.kind === "food" ? "On the table" : p.kind === "vibe" ? "Inside" : "Out front");
        out.push({ key: p.id, kind: "img", url: p.url, label, alt: `${label} at ${spot.name}`, credit: `photo by ${p.userName}` });
      });
    real
      .filter((r) => r.file !== hero.file)
      .forEach((r) => out.push({ key: r.file, kind: "img", url: commonsSrc(r.file, 960), file: r.file, label: r.caption, alt: `${spot.name}: ${r.caption.toLowerCase()}`, credit: `${r.author}, ${r.license}`, link: commonsPage(r.file) }));
    places?.photos
      ?.filter((p) => googleSrc(p.name) !== hero.url)
      .forEach((p) => out.push({ key: p.name, kind: "img", url: googleSrc(p.name), label: "Photo", alt: `${spot.name}`, credit: `Google · ${p.author}`, link: p.authorUri ?? undefined }));
    return out;
  }, [photos, places, hero, spot, real, house]);
  const slides = useMemo(() => (hero.kind === "svg" ? gallery : [hero, ...gallery]), [hero, gallery]);
  const offset = hero.kind === "svg" ? 0 : 1;

  const nearby = useMemo(
    () =>
      pool
        .filter((s) => s.id !== spot.id)
        .map((s) => ({ s, d: distanceKm(spot.coords, s.coords) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 8)
        .map((x) => x.s),
    [spot, pool]
  );

  const onFile = useCallback(
    async (f: File | undefined) => {
      if (!f) return;
      setUploading(true);
      try {
        const p = await backend.addPhoto(spot.id, f, uploadKind);
        setPhotos((x) => [p, ...x]);
        if (p.kind === "building") refreshCovers();
        toast("Photo added. Thanks.", "ok");
        track("photo_upload", { id: spot.id, kind: uploadKind });
      } catch (e) {
        toast(e instanceof Error ? e.message : "Upload failed", "err");
      } finally {
        setUploading(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [backend, spot.id, toast, uploadKind, refreshCovers]
  );
  function startUpload(kind: PhotoKind) {
    if (!requireAuth(`Sign in to share your photos of ${spot.name}. It takes a few seconds, no password.`, () => startUpload(kind))) return;
    setUploadKind(kind);
    setTimeout(() => fileRef.current?.click(), 0);
  }
  async function share() {
    const how = await shareLink({ title: spot.name, text: `${spot.name}: ${spot.knownFor}`, url: `${location.origin}/spot/${spot.id}` });
    if (how === "copied") toast("Link copied");
    if (how !== "dismissed") track("share", { id: spot.id });
  }
  const openList = () => {
    if (requireAuth("Sign in to make lists. It takes a few seconds, no password.", () => setListing(true))) setListing(true);
  };

  const stamp = been[spot.id];
  const want = saved.includes(spot.id);
  const website = safeUrl(spot.website);
  const locs = locationsOf(spot);

  const info = (
    <div className="pl-info">
      <LocatorMap spot={spot} pool={pool} onSelect={onSelect} />
      {locs.length > 1 ? (
        <ul className="pl-locs">
          {locs.map((l) => (
            <li key={l.address}>
              <span>
                <b>{l.label}</b>
                {l.address}
                {l.note ? ` · ${l.note}` : ""}
              </span>
              <a href={mapsUrl(spot, l)} target="_blank" rel="noreferrer" onClick={() => track("directions", { id: spot.id })} className="link-btn">
                Directions
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="pl-addr">
          <Icon name="pin" size={16} />
          <span>
            {spot.address}
            <small>{areaLabelOf(spot)}</small>
          </span>
        </p>
      )}
      <div className="pl-links">
        <a className="btn btn-ink" href={mapsUrl(spot)} target="_blank" rel="noreferrer" onClick={() => track("directions", { id: spot.id })}>
          <Icon name="directions" size={18} /> Directions &amp; hours
        </a>
        <div className="pl-links-row">
          {spot.phone && (
            <a className="btn btn-line" href={`tel:${spot.phone.replace(/[^0-9+]/g, "")}`}>
              <Icon name="phone" size={16} /> Call
            </a>
          )}
          {website && (
            <a className="btn btn-line" href={website} target="_blank" rel="noreferrer nofollow ugc" onClick={() => track("website", { id: spot.id })}>
              <Icon name="globe" size={16} /> Website
            </a>
          )}
          <button
            className="btn btn-line"
            onClick={() => requireAuth(`Sign in to buy a ${spot.name} gift card. It takes a few seconds, no password.`, () => setGifting(true)) && setGifting(true)}
          >
            <Icon name="gift" size={16} /> Gift card
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <article key={spot.id} className="pl">
      <div className="pl-hero">
        <button type="button" className={`pl-hero-img ${hero.kind === "svg" ? "is-mx" : ""}`} onClick={() => slides.length && setLightbox(0)} aria-label={slides.length ? "See photos" : spot.name}>
          {hero.kind === "svg" ? (
            <span className="pl-poster">
              <Matchbook spot={spot} />
            </span>
          ) : (
            <Photo src={hero.url!} srcSet={hero.file ? commonsSrcSet(hero.file) : hero.srcSet} sizes={hero.file || hero.srcSet ? "(max-width: 900px) 100vw, 720px" : undefined} alt={hero.alt} genre={spot.genres[0]} eager fallback={<Matchbook spot={spot} />} />
          )}
        </button>
        {hero.credit && (
          <span className="pl-credit">
            {hero.link ? (
              <a href={hero.link} target="_blank" rel="noreferrer">
                {hero.credit}
              </a>
            ) : (
              hero.credit
            )}
          </span>
        )}
        <div className="pl-float">
          <button type="button" className="round" onClick={onBack} aria-label="Back">
            <Icon name="back" size={20} />
          </button>
          <button type="button" className="round" onClick={share} aria-label="Share">
            <Icon name="share" size={19} />
          </button>
        </div>
      </div>

      <div className="pl-cols">
        <div className="pl-main">
          <header className="pl-head">
            <h1 className="pl-name">{spot.name}</h1>
            <p className="pl-meta">
              {spot.genres.map((g) => GENRE_BY_ID[g].short).join(" · ")} <i>/</i> {areaLabelOf(spot)} <i>/</i> {priceLabel(spot.price)}
              {spot.sponsored && <span className="paid">Sponsored</span>}
            </p>
            <Honors id={spot.id} />
          </header>

          <div className="pl-actions" role="group" aria-label="Your list">
            <button type="button" className={`act ${want ? "on" : ""}`} aria-pressed={want} onClick={() => toggleSaved(spot.id)}>
              <Icon name="heart" size={22} fill={want} />
              <span>Want to try</span>
            </button>
            <button
              type="button"
              className={`act ${stamp ? "on" : ""}`}
              aria-pressed={!!stamp}
              onClick={() => {
                if (stamp) return;
                markBeen(spot.id, undefined, (n) => toast(n === 1 ? "First stamp in your Plate Passport" : `Stamped. ${n} local places so far`, "ok"));
              }}
            >
              <Icon name="check" size={22} stroke={stamp ? 2.4 : 1.75} />
              <span>{stamp ? "Been" : "I've been"}</span>
            </button>
            <button type="button" className="act" onClick={() => setWriteSignal((n) => n + 1)}>
              <Icon name="pen" size={21} />
              <span>Review</span>
            </button>
            <button type="button" className="act" onClick={openList}>
              <Icon name="lists" size={22} />
              <span>List</span>
            </button>
          </div>
          <AnimatePresence initial={false}>
            {stamp && (
              <motion.div className="verdict" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                <span className="verdict-q">How was it?</span>
                {VERDICTS.map(([v, l]) => (
                  <button key={v} type="button" className={`chip ${stamp.verdict === v ? "on" : ""}`} aria-pressed={stamp.verdict === v} onClick={() => markBeen(spot.id, v)}>
                    {l}
                  </button>
                ))}
                <button type="button" className="link-btn verdict-undo" onClick={() => markBeen(spot.id, null)}>
                  Undo
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <section className="pl-about">
            <p className="pl-order">
              <span className="eyebrow">Order</span>
              {spot.knownFor}
            </p>
            <p className="pl-blurb">{spot.blurb}</p>
            {spot.tags.length > 0 && (
              <p className="pl-tags">
                {spot.tags.slice(0, 6).map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </p>
            )}
          </section>

          <section className="pl-photos" aria-label="Photos">
            <header className="sec-head">
              <h2 className="sec-title">Photos</h2>
              <button type="button" className="link-btn" onClick={() => startUpload(hero.kind === "svg" ? "building" : "food")} disabled={uploading}>
                <Icon name="camera" size={16} /> {uploading ? "Uploading…" : "Add yours"}
              </button>
            </header>
            {gallery.length ? (
              <div className="pl-strip">
                {gallery.slice(0, 12).map((x, i) => (
                  <button key={x.key} type="button" className="pl-shot" onClick={() => setLightbox(i + offset)}>
                    <Photo src={x.url!} srcSet={x.file ? commonsSrcSet(x.file) : x.srcSet} sizes={x.file || x.srcSet ? "200px" : undefined} alt={x.alt} genre={spot.genres[0]} />
                  </button>
                ))}
              </div>
            ) : (
              <button type="button" className="pl-nophotos" onClick={() => startUpload(hero.kind === "svg" ? "building" : "food")}>
                <Icon name="camera" size={22} />
                <span>
                  <b>No photos yet.</b> Been here? Add the first one: the front, the food, the room.
                </span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          </section>

          <Reviews spot={spot} openSignal={writeSignal} />

          <section className="pl-where pl-where-m" aria-label="Location">
            <h2 className="sec-title">Where</h2>
            {info}
          </section>

          <Shelf title="Close by" spots={nearby} onOpen={onSelect} />

          <footer className="pl-foot">
            <p>
              {spot.addedBy ? (
                <>
                  Added by {spot.addedBy}, checked by us
                  {spot.verifiedAt ? ` ${new Date(spot.verifiedAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}` : ""}.
                </>
              ) : (
                <>
                  Picked and checked by {BRAND}, {CHECKED}.
                </>
              )}{" "}
              <Link href="/about">How we pick</Link> · <Link href={`/partners?spot=${spot.id}&fix=1#contact`}>Report a change</Link>
            </p>
            <Link href={`/partners?spot=${spot.id}`} className="claim">
              <span>
                <b>Is this your place?</b> Claim it to add your own photos and menu, answer reviews, and see who&apos;s saving you.
              </span>
              <Icon name="right" size={18} />
            </Link>
          </footer>
        </div>

        <aside className="pl-side" aria-label="Location">
          {info}
          {!user && (
            <p className="pl-side-note">
              Save it, stamp it when you&apos;ve been, and spin your lists with Surprise me. <b>Free, no password.</b>
            </p>
          )}
        </aside>
      </div>

      <GiftSheet open={gifting} onClose={() => setGifting(false)} spots={[spot]} surface="place" />
      <AddToList spot={spot} open={listing} onClose={() => setListing(false)} onNew={setNewList} />
      <ListEditor list={newList} spots={pool} areas={areas} onClose={() => setNewList(null)} onDeleted={() => setNewList(null)} onDelete={async () => {}} />
      <AnimatePresence>{lightbox !== null && slides.length > 0 && <Lightbox slides={slides} index={lightbox} spot={spot} onIndex={setLightbox} onClose={() => setLightbox(null)} />}</AnimatePresence>
    </article>
  );
}

function safeUrl(u?: string) {
  if (!u) return undefined;
  const v = /^https?:\/\//i.test(u) ? u : `https://${u.replace(/^@/, "instagram.com/")}`;
  try {
    const url = new URL(v);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}
