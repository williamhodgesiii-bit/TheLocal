"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Camera, ChevronLeft, ChevronRight, Heart, Navigation, Share2, Store, X } from "lucide-react";
import { track } from "@vercel/analytics";
import Link from "next/link";
import { AREA_BY_ID, GENRE_BY_ID, SPOTS, distanceKm, mapsUrl, priceLabel, type Spot } from "@/lib/data";
import { representativePhotos } from "@/lib/images";
import type { Photo, PhotoKind } from "@/lib/backend";
import { useApp } from "./Providers";
import Storefront from "./Storefront";
import Reviews from "./Reviews";

type GPhoto = { url: string; author: string; authorUri: string | null };
type Places = { enabled: boolean; photos: GPhoto[]; rating?: number | null; ratingCount?: number | null; website?: string | null };
type Slide = { key: string; kind: "svg" | "img"; url?: string; label: string; credit?: string };

export default function SpotDetail({ spot, onBack, onSelect }: { spot: Spot; onBack: () => void; onSelect: (id: string) => void }) {
  const { backend, requireAuth, toast, saved, toggleSaved } = useApp();
  const [photos, setPhotos] = useState<Photo[]>([]);
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
    fetch(`/api/places?spot=${spot.id}`)
      .then((r) => r.json())
      .then((j) => live && setPlaces(j))
      .catch(() => {});
    track("spot_view", { id: spot.id });
    return () => {
      live = false;
    };
  }, [spot.id, backend]);

  // Building first, then food — exactly as diners scan a place.
  const hero: Slide = useMemo(() => {
    const b = photos.find((p) => p.kind === "building");
    if (b) return { key: b.id, kind: "img", url: b.url, label: "Storefront", credit: `📷 ${b.userName}` };
    const gp = places?.photos?.[0];
    if (gp) return { key: gp.url, kind: "img", url: gp.url, label: "Storefront", credit: `Google · ${gp.author}` };
    return { key: "svg", kind: "svg", label: "Illustrated storefront" };
  }, [photos, places]);

  const food: Slide[] = useMemo(() => {
    const out: Slide[] = [];
    photos
      .filter((p) => p.url !== hero.url)
      .forEach((p) => out.push({ key: p.id, kind: "img", url: p.url, label: p.caption || (p.kind === "food" ? "From the kitchen" : p.kind === "vibe" ? "The vibe" : "Storefront"), credit: `📷 ${p.userName}` }));
    places?.photos?.slice(hero.key === places.photos[0]?.url ? 1 : 0).forEach((p) =>
      out.push({ key: p.url, kind: "img", url: p.url, label: "Photo", credit: `Google · ${p.author}` })
    );
    if (out.length < 3)
      representativePhotos(spot, 3 - out.length).forEach((u, i) => out.push({ key: u + i, kind: "img", url: u, label: "Representative", credit: "Unsplash" }));
    return out;
  }, [photos, places, hero, spot]);

  const slides = useMemo(() => [hero, ...food], [hero, food]);

  const nearby = useMemo(
    () =>
      SPOTS.filter((s) => s.id !== spot.id)
        .map((s) => ({ s, d: distanceKm(spot.coords, s.coords) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 4),
    [spot]
  );

  const onFile = useCallback(
    async (f: File | undefined) => {
      if (!f) return;
      setUploading(true);
      try {
        const p = await backend.addPhoto(spot.id, f, uploadKind);
        setPhotos((x) => [p, ...x]);
        toast("Photo added — thanks for sharing!", "ok");
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
      if (navigator.share) await navigator.share({ title: spot.name, text: `${spot.name} — ${spot.knownFor}`, url });
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

  return (
    <motion.article
      key={spot.id}
      className="detail"
      initial={{ x: 40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
      style={{ ["--c" as string]: g.color }}
    >
      <div className="detail-bar">
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          <ArrowLeft size={15} /> All spots
        </button>
        <div className="row gap6">
          <button className={`icon-btn ${isSaved ? "saved" : ""}`} onClick={() => toggleSaved(spot.id)} aria-label={isSaved ? "Unsave" : "Save"} aria-pressed={isSaved}>
            <Heart size={17} fill={isSaved ? "currentColor" : "none"} />
          </button>
          <button className="icon-btn" onClick={share} aria-label="Share">
            <Share2 size={17} />
          </button>
        </div>
      </div>

      <header className="detail-head">
        <div className="meta">
          <span className="genre-dot" /> {spot.genres.map((x) => GENRE_BY_ID[x].short).join(" · ")} — {AREA_BY_ID[spot.area].label}
          {spot.sponsored && <span className="sponsored">Sponsored</span>}
        </div>
        <h1 className="display detail-title">{spot.name}</h1>
        <div className="detail-sub">
          <span className="price">{priceLabel(spot.price)}</span>
          <span className="dot-sep" />
          <span>{spot.address}</span>
          {places?.rating ? (
            <>
              <span className="dot-sep" />
              <span title="Google rating">G ★ {places.rating.toFixed(1)}{places.ratingCount ? ` (${places.ratingCount.toLocaleString()})` : ""}</span>
            </>
          ) : null}
        </div>
      </header>

      {/* building */}
      <figure className="hero-photo" onClick={() => setLightbox(0)}>
        {hero.kind === "svg" ? <Storefront spot={spot} /> : <Img src={hero.url!} alt={`${spot.name} storefront`} spot={spot} />}
        <figcaption>
          <span className="chip-sm">{hero.label}</span>
          {hero.credit && <span className="credit">{hero.credit}</span>}
        </figcaption>
        {hero.kind === "svg" && (
          <button
            className="hero-cta"
            onClick={(e) => {
              e.stopPropagation();
              startUpload("building");
            }}
          >
            <Camera size={14} /> Have a real photo? Add it
          </button>
        )}
      </figure>

      {/* food strip */}
      <div className="food-strip">
        {food.slice(0, 5).map((s, i) => (
          <button key={s.key} className="food-tile" onClick={() => setLightbox(i + 1)}>
            <Img src={s.url!} alt={s.label} spot={spot} />
            <span className="food-label">{s.label}</span>
          </button>
        ))}
        <button className="food-tile add" onClick={() => startUpload("food")} disabled={uploading}>
          <Camera size={20} />
          <span>{uploading ? "Uploading…" : "Add photo"}</span>
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />

      <section className="detail-body">
        <div className="known-stamp">
          <span>Known for</span>
          <strong>{spot.knownFor}</strong>
        </div>
        <p className="lede">{spot.blurb}</p>
        <div className="tags">
          {spot.tags.map((t) => (
            <span key={t} className="tag">
              #{t.replace(/\s+/g, "")}
            </span>
          ))}
        </div>
        <div className="row gap8 wrap">
          <a className="btn btn-rust" href={mapsUrl(spot)} target="_blank" rel="noreferrer" onClick={() => track("directions", { id: spot.id })}>
            <Navigation size={15} /> Directions
          </a>
          {places?.website && (
            <a className="btn btn-ghost" href={places.website} target="_blank" rel="noreferrer" onClick={() => track("website", { id: spot.id })}>
              Website
            </a>
          )}
          <button className="btn btn-ghost" onClick={() => startUpload("vibe")}>
            <Camera size={15} /> Share a photo
          </button>
        </div>
      </section>

      <Reviews spot={spot} />

      <section className="nearby">
        <h3 className="eyebrow">Also nearby</h3>
        <div className="nearby-row">
          {nearby.map(({ s, d }) => (
            <button key={s.id} className="nearby-card" onClick={() => onSelect(s.id)} style={{ ["--c" as string]: GENRE_BY_ID[s.genres[0]].color }}>
              <span className="nearby-art">
                <Storefront spot={s} mini />
              </span>
              <span className="nearby-name">{s.name}</span>
              <span className="mono-sm">
                {GENRE_BY_ID[s.genres[0]].short} · {(d * 0.621).toFixed(1)} mi
              </span>
            </button>
          ))}
        </div>
      </section>

      <Link href={`/partners?spot=${spot.id}`} className="claim">
        <Store size={16} />
        <span>
          <strong>Own {spot.name}?</strong> Claim this listing to add your photos, menu links and respond to reviews.
        </span>
        <ChevronRight size={16} />
      </Link>

      <AnimatePresence>
        {lightbox !== null && (
          <Lightbox slides={slides} index={lightbox} spot={spot} onIndex={setLightbox} onClose={() => setLightbox(null)} />
        )}
      </AnimatePresence>
    </motion.article>
  );
}

function Img({ src, alt, spot }: { src: string; alt: string; spot: Spot }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    const g = GENRE_BY_ID[spot.genres[0]];
    return (
      <span className="img-fallback" style={{ ["--c" as string]: g.color }}>
        <span>{g.short}</span>
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}

function Lightbox({ slides, index, spot, onIndex, onClose }: { slides: Slide[]; index: number; spot: Spot; onIndex: (n: number) => void; onClose: () => void }) {
  const n = slides.length;
  const s = slides[index];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndex((index + 1) % n);
      if (e.key === "ArrowLeft") onIndex((index - 1 + n) % n);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, n, onIndex, onClose]);
  return (
    <motion.div className="lightbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <button className="icon-btn lb-x" aria-label="Close">
        <X size={20} />
      </button>
      <button className="icon-btn lb-prev" aria-label="Previous" onClick={(e) => (e.stopPropagation(), onIndex((index - 1 + n) % n))}>
        <ChevronLeft size={22} />
      </button>
      <motion.figure key={s.key} initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={(e) => e.stopPropagation()}>
        {s.kind === "svg" ? <Storefront spot={spot} /> : <Img src={s.url!} alt={s.label} spot={spot} />}
        <figcaption>
          {s.label} {s.credit && <span className="credit">· {s.credit}</span>} <span className="mono-sm">{index + 1}/{n}</span>
        </figcaption>
      </motion.figure>
      <button className="icon-btn lb-next" aria-label="Next" onClick={(e) => (e.stopPropagation(), onIndex((index + 1) % n))}>
        <ChevronRight size={22} />
      </button>
    </motion.div>
  );
}
