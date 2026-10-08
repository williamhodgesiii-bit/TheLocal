"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { track } from "@vercel/analytics";
import Link from "next/link";
import { GENRE_BY_ID, areaLabelOf, distanceKm, mapsUrl, priceLabel, type Spot } from "@/lib/data";
import { hash } from "@/lib/images";
import { representativePhotos } from "@/lib/images";
import type { Photo, PhotoKind } from "@/lib/backend";
import { useApp } from "./Providers";
import Storefront from "./Storefront";
import Reviews from "./Reviews";

type GPhoto = { url: string; author: string; authorUri: string | null };
type Places = { enabled: boolean; photos: GPhoto[]; rating?: number | null; ratingCount?: number | null; website?: string | null };
type Slide = { key: string; kind: "svg" | "img"; url?: string; label: string; credit?: string };

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
  const hero: Slide = useMemo(() => {
    const b = photos.find((p) => p.kind === "building");
    if (b) return { key: b.id, kind: "img", url: b.url, label: "Out front", credit: `photo by ${b.userName}` };
    const gp = places?.photos?.[0];
    if (gp) return { key: gp.url, kind: "img", url: gp.url, label: "Out front", credit: `via Google, ${gp.author}` };
    return { key: "svg", kind: "svg", label: "Our sketch of the front" };
  }, [photos, places]);

  const food: Slide[] = useMemo(() => {
    const out: Slide[] = [];
    photos
      .filter((p) => p.url !== hero.url)
      .forEach((p) => out.push({ key: p.id, kind: "img", url: p.url, label: p.caption || (p.kind === "food" ? "On the table" : p.kind === "vibe" ? "Inside" : "Out front"), credit: `photo by ${p.userName}` }));
    places?.photos?.slice(hero.key === places.photos[0]?.url ? 1 : 0).forEach((p) =>
      out.push({ key: p.url, kind: "img", url: p.url, label: "Photo", credit: `via Google, ${p.author}` })
    );
    if (out.length < 3)
      representativePhotos(spot, 3 - out.length).forEach((u, i) => out.push({ key: u + i, kind: "img", url: u, label: "Stock photo", credit: "Unsplash, not taken here" }));
    return out;
  }, [photos, places, hero, spot]);

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
          ← Back to the list
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
          <div className="snap-img">{hero.kind === "svg" ? <Storefront spot={spot} /> : <Img src={hero.url!} alt={`${spot.name} from the street`} spot={spot} />}</div>
          <figcaption>
            {hero.label}
            {hero.credit && <span> · {hero.credit}</span>}
          </figcaption>
        </figure>
        <div className="snap-row">
          {food.slice(0, 4).map((x, i) => (
            <figure key={x.key} className="snap snap-sm" onClick={() => setLightbox(i + 1)}>
              <div className="snap-img">
                <Img src={x.url!} alt={x.label} spot={spot} />
              </div>
              <figcaption>{x.label}</figcaption>
            </figure>
          ))}
        </div>
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

function Img({ src, alt, spot }: { src: string; alt: string; spot: Spot }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    const g = GENRE_BY_ID[spot.genres[0]];
    return (
      <span className="img-fallback" style={{ ["--c" as string]: g.color }}>
        <span>{g.label}</span>
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
          {s.label} {s.credit && <span className="credit">· {s.credit}</span>} <span className="lb-count">{index + 1} of {n}</span>
        </figcaption>
      </motion.figure>
      <button className="icon-btn lb-next" aria-label="Next" onClick={(e) => (e.stopPropagation(), onIndex((index + 1) % n))}>
        <ChevronRight size={22} />
      </button>
    </motion.div>
  );
}
