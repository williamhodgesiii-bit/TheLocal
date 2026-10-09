"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { track } from "@vercel/analytics";
import Link from "next/link";
import { createPortal } from "react-dom";
import { GENRE_BY_ID, areaLabelOf, distanceKm, mapsUrl, priceLabel, type Spot } from "@/lib/data";
import { hash } from "@/lib/images";
import { PLACE_PHOTOS, commonsPage, commonsSrc, commonsSrcSet, dishesFor, shortDish } from "@/lib/photos";
import type { Photo as MemberPhoto, PhotoKind } from "@/lib/backend";
import { useApp } from "./Providers";
import Storefront from "./Storefront";
import Reviews from "./Reviews";
import Photo from "./Photo";

type GPhoto = { url: string; author: string; authorUri: string | null };
type Places = { enabled: boolean; photos: GPhoto[]; rating?: number | null; ratingCount?: number | null; website?: string | null };
type Slide = { key: string; kind: "svg" | "img"; url?: string; file?: string; label: string; alt: string; credit?: string; link?: string; stock?: boolean };

const NONE: (typeof PLACE_PHOTOS)[string] = [];
const fromCommons = (file: string, label: string, alt: string, author: string, license: string, stock = false): Slide => ({
  key: file,
  kind: "img",
  url: commonsSrc(file, 960),
  file,
  label,
  alt,
  credit: `${author}, ${license}`,
  link: commonsPage(file),
  stock,
});

export default function SpotDetail({
  spot,
  number,
  pool,
  onBack,
  onSelect,
}: {
  spot: Spot;
  number?: number;
  pool: Spot[];
  onBack: () => void;
  onSelect: (id: string) => void;
}) {
  const { backend, requireAuth, toast, saved, toggleSaved } = useApp();
  const [photos, setPhotos] = useState<MemberPhoto[]>([]);
  const [places, setPlaces] = useState<Places | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadKind, setUploadKind] = useState<PhotoKind>("food");
  const fileRef = useRef<HTMLInputElement>(null);
  const g = GENRE_BY_ID[spot.genres[0]];

  useEffect(() => {
    let live = true;
    setPhotos([]);
    setPlaces(null);
    backend.listPhotos(spot.id).then((p) => live && setPhotos(p)).catch(() => {});
    const q = new URLSearchParams({ spot: spot.id, name: spot.name, address: spot.address, city: spot.city });
    fetch(`/api/places?${q}`)
      .then((r) => r.json())
      .then((j) => live && setPlaces(j))
      .catch(() => {});
    track("spot_view", { id: spot.id });
    return () => {
      live = false;
    };
  }, [spot.id, backend]);

  // Building first, then food, the way you size a place up from the sidewalk.
  // Real pictures of this place always beat stock; stock is labeled as such.
  const real = PLACE_PHOTOS[spot.id] ?? NONE;
  const hero: Slide = useMemo(() => {
    const b = photos.find((p) => p.kind === "building");
    if (b) return { key: b.id, kind: "img", url: b.url, label: "Out front", alt: `${spot.name} from the street`, credit: `photo by ${b.userName}` };
    const r = real[0];
    if (r) return fromCommons(r.file, r.caption, `${spot.name}: ${r.caption.toLowerCase()}`, r.author, r.license);
    const cc = spot.photos?.find((p) => p.kind === "building");
    if (cc) return { key: cc.url, kind: "img", url: cc.url, label: "Out front", alt: `${spot.name} from the street`, credit: cc.credit, link: cc.link };
    const gp = places?.photos?.[0];
    if (gp) return { key: gp.url, kind: "img", url: gp.url, label: "Out front", alt: `${spot.name}`, credit: `via Google, ${gp.author}` };
    return { key: "svg", kind: "svg", label: "Our sketch of the front", alt: `Drawing of ${spot.name}` };
  }, [photos, places, spot, real]);

  const food: Slide[] = useMemo(() => {
    const out: Slide[] = [];
    photos
      .filter((p) => p.url !== hero.url)
      .forEach((p) => {
        const label = p.caption || (p.kind === "food" ? "On the table" : p.kind === "vibe" ? "Inside" : "Out front");
        out.push({ key: p.id, kind: "img", url: p.url, label, alt: `${label} at ${spot.name}`, credit: `photo by ${p.userName}` });
      });
    real
      .filter((r) => r.file !== hero.file)
      .forEach((r) => out.push(fromCommons(r.file, r.caption, `${spot.name}: ${r.caption.toLowerCase()}`, r.author, r.license)));
    places?.photos?.slice(hero.key === places.photos[0]?.url ? 1 : 0).forEach((p) =>
      out.push({ key: p.url, kind: "img", url: p.url, label: "Photo", alt: `${spot.name}`, credit: `via Google, ${p.author}` })
    );
    // the dishes it's known for, in stock photos, until members fill the wall
    if (out.length < 3)
      dishesFor(spot)
        .slice(0, 3 - out.length)
        .forEach((d) => out.push(fromCommons(d.file, shortDish(d), `Stock photo of ${d.dish}, not taken at ${spot.name}`, d.author, d.license, true)));
    return out;
  }, [photos, places, hero, spot, real]);

  const slides = useMemo(() => [hero, ...food], [hero, food]);

  const nearby = useMemo(
    () =>
      pool.filter((s) => s.id !== spot.id)
        .map((s) => ({ s, d: distanceKm(spot.coords, s.coords) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 4),
    [spot, pool]
  );

  const onFile = useCallback(
    async (f: File | undefined) => {
      if (!f) return;
      setUploading(true);
      try {
        const p = await backend.addPhoto(spot.id, f, uploadKind);
        setPhotos((x) => [p, ...x]);
        toast("Photo added. Thanks.", "ok");
        track("photo_upload", { id: spot.id, kind: uploadKind });
      } catch (e) {
        toast(e instanceof Error ? e.message : "Upload failed", "err");
      } finally {
        setUploading(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [backend, spot.id, toast, uploadKind]
  );

  function startUpload(kind: PhotoKind) {
    if (!requireAuth("Sign in to share your photos of " + spot.name + ".")) return;
    setUploadKind(kind);
    setTimeout(() => fileRef.current?.click(), 0);
  }

  async function share() {
    const url = `${location.origin}/spot/${spot.id}`;
    try {
      if (navigator.share) await navigator.share({ title: spot.name, text: `${spot.name}: ${spot.knownFor}`, url });
      else {
        await navigator.clipboard.writeText(url);
        toast("Link copied");
      }
      track("share", { id: spot.id });
    } catch {
      /* dismissed */
    }
  }

  const isSaved = saved.includes(spot.id);

  const checkNo = String(1000 + (hash(spot.id) % 9000));
  const website = places?.website || safeUrl(spot.website);

  return (
    <motion.article
      key={spot.id}
      className="detail"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="detail-bar">
        <button className="textbtn" onClick={onBack}>
          ← Back
        </button>
        <div className="row gap12">
          <button className={`textbtn ${isSaved ? "on" : ""}`} onClick={() => toggleSaved(spot.id)} aria-pressed={isSaved}>
            {isSaved ? "Saved" : "Save"}
          </button>
          <button className="textbtn" onClick={share}>
            Share
          </button>
        </div>
      </div>

      <div className="guest-check">
        <div className="check-top">
          <span className="check-title">Guest Check</span>
          <span className="check-no">No. {checkNo}</span>
        </div>
        <div className="check-row check-name">
          <span className="cl">Place</span>
          <h1>{spot.name}</h1>
        </div>
        <div className="check-grid">
          <div>
            <span className="cl">Part of town</span>
            <span>{areaLabelOf(spot)}</span>
          </div>
          <div>
            <span className="cl">Price</span>
            <span>{priceLabel(spot.price)}</span>
          </div>
          <div>
            <span className="cl">Kind</span>
            <span>{spot.genres.map((x) => GENRE_BY_ID[x].short).join(", ")}</span>
          </div>
          <div>
            <span className="cl">On the map</span>
            <span>{number ? `No. ${number}` : "–"}</span>
          </div>
        </div>
        <div className="check-row">
          <span className="cl">Address</span>
          <span>
            {spot.address}
            {places?.rating ? <span className="g-rate"> · Google {places.rating.toFixed(1)}</span> : null}
          </span>
        </div>
        <div className="check-row check-order">
          <span className="cl">Order</span>
          <span className="pen">{spot.knownFor}</span>
        </div>
        <p className="check-foot">
          {spot.addedBy ? (
            <>
              Written in by <span className="pen-sig">{spot.addedBy}</span>, checked by us
              {spot.verifiedAt ? ` ${new Date(spot.verifiedAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}` : ""}.
            </>
          ) : (
            <>Picked and checked by The Local.</>
          )}
          {spot.sponsored && <span className="paid">Paid listing</span>}
        </p>
      </div>

      {/* building, then food */}
      <div className="snaps">
        <figure className="snap snap-hero" onClick={() => setLightbox(0)}>
          <div className="snap-img">{hero.kind === "svg" ? <Storefront spot={spot} /> : <SlideImg s={hero} spot={spot} sizes="(max-width: 900px) 100vw, 460px" eager />}</div>
          <figcaption>
            {hero.label}
            {hero.credit &&
              (hero.link ? (
                <>
                  {" · "}
                  <a href={hero.link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                    {hero.credit}
                  </a>
                </>
              ) : (
                <span> · {hero.credit}</span>
              ))}
          </figcaption>
        </figure>
        <div className="snap-row" data-count={Math.min(food.length, 6)}>
          {food.slice(0, 6).map((x, i) => (
            <figure key={x.key} className={`snap snap-sm ${x.stock ? "is-stock" : ""}`} onClick={() => setLightbox(i + 1)}>
              <div className="snap-img">
                <SlideImg s={x} spot={spot} sizes="(max-width: 900px) 46vw, 150px" />
                {x.stock && <span className="stock-tag">stock</span>}
              </div>
              <figcaption>{x.label}</figcaption>
            </figure>
          ))}
        </div>
        {food.some((x) => x.stock) && (
          <p className="stock-note">
            Marked <span className="stock-tag">stock</span>: what they&rsquo;re known for, photographed somewhere else. Swapped out as members post the real thing.{" "}
            <Link href="/credits">Photo credits</Link>
          </p>
        )}
        <p className="snap-add">
          Been here? <button className="textbtn" onClick={() => startUpload(hero.kind === "svg" ? "building" : "food")} disabled={uploading}>
            {uploading ? "uploading…" : hero.kind === "svg" ? "Add a real photo of the front" : "Add your photos"}
          </button>
        </p>
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />

      <section className="detail-body">
        <p className="lede">{spot.blurb}</p>
        <p className="tags">{spot.tags.join(" · ")}</p>
        <div className="actions">
          <a className="btn btn-green" href={mapsUrl(spot)} target="_blank" rel="noreferrer" onClick={() => track("directions", { id: spot.id })}>
            Directions
          </a>
          {spot.phone && (
            <a className="btn btn-line" href={`tel:${spot.phone.replace(/[^0-9+]/g, "")}`}>
              Call
            </a>
          )}
          {website && (
            <a className="btn btn-line" href={website} target="_blank" rel="noreferrer nofollow ugc" onClick={() => track("website", { id: spot.id })}>
              Website
            </a>
          )}
          <button className="btn btn-line" onClick={() => startUpload("vibe")}>
            Add a photo
          </button>
        </div>
      </section>

      <Reviews spot={spot} />

      <section className="nearby">
        <h3 className="small-head">Close by</h3>
        <ul>
          {nearby.map(({ s, d }) => (
            <li key={s.id}>
              <button onClick={() => onSelect(s.id)}>
                <span className="nb-name">{s.name}</span>
                <span className="leader" aria-hidden />
                <span className="nb-d">{(d * 0.621).toFixed(1)} mi</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <Link href={`/partners?spot=${spot.id}`} className="claim">
        Is this your place? Claim the listing to add your own photos and menu, and answer reviews.
      </Link>

      <AnimatePresence>
        {lightbox !== null && <Lightbox slides={slides} index={lightbox} spot={spot} onIndex={setLightbox} onClose={() => setLightbox(null)} />}
      </AnimatePresence>
    </motion.article>
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

function SlideImg({ s, spot, sizes, eager }: { s: Slide; spot: Spot; sizes: string; eager?: boolean }) {
  return (
    <Photo
      src={s.url!}
      srcSet={s.file ? commonsSrcSet(s.file) : undefined}
      sizes={s.file ? sizes : undefined}
      alt={s.alt}
      genre={spot.genres[0]}
      eager={eager}
    />
  );
}

function Lightbox({ slides, index, spot, onIndex, onClose }: { slides: Slide[]; index: number; spot: Spot; onIndex: (n: number) => void; onClose: () => void }) {
  const n = slides.length;
  const s = slides[index];
  const touch = useRef<{ x: number; y: number } | null>(null);
  const go = useCallback((d: number) => onIndex((index + d + n) % n), [index, n, onIndex]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [go, onClose]);
  // warm the neighbors so swiping feels instant
  useEffect(() => {
    [slides[(index + 1) % n], slides[(index - 1 + n) % n]].forEach((x) => {
      if (x?.url) new Image().src = x.url;
    });
  }, [index, n, slides]);
  // portaled: the detail panel animates with a transform, which would trap a fixed overlay inside it
  return createPortal(
    <motion.div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Photos of ${spot.name}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        const t = touch.current;
        touch.current = null;
        if (!t) return;
        const dx = e.changedTouches[0].clientX - t.x;
        const dy = e.changedTouches[0].clientY - t.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? 1 : -1);
        else if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.4) onClose();
      }}
    >
      <button className="icon-btn lb-x" aria-label="Close">
        <X size={20} />
      </button>
      {n > 1 && (
        <button className="icon-btn lb-prev" aria-label="Previous" onClick={(e) => (e.stopPropagation(), go(-1))}>
          <ChevronLeft size={22} />
        </button>
      )}
      <motion.figure key={s.key} initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.18 }} onClick={(e) => e.stopPropagation()}>
        <div className="lb-frame">{s.kind === "svg" ? <Storefront spot={spot} /> : <Photo src={s.url!} srcSet={s.file ? commonsSrcSet(s.file) : undefined} sizes="100vw" alt={s.alt} genre={spot.genres[0]} eager />}</div>
        <figcaption>
          <span>
            {s.stock ? "Stock photo: " : ""}
            {s.label}
            {s.credit && (
              <span className="credit">
                {" · "}
                {s.link ? (
                  <a href={s.link} target="_blank" rel="noreferrer">
                    {s.credit}
                  </a>
                ) : (
                  s.credit
                )}
              </span>
            )}
            {s.stock && <span className="credit"> · not taken at {spot.name}</span>}
          </span>
          <span className="lb-count">
            {index + 1} of {n}
          </span>
        </figcaption>
      </motion.figure>
      {n > 1 && (
        <button className="icon-btn lb-next" aria-label="Next" onClick={(e) => (e.stopPropagation(), go(1))}>
          <ChevronRight size={22} />
        </button>
      )}
    </motion.div>,
    document.body
  );
}
