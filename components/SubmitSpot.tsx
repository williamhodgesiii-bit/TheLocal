"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { track } from "@vercel/analytics";
import { DRINK_KINDS, GENRES, distanceKm, slugify, type Area, type DrinkKind, type GenreId, type Spot } from "@/lib/data";
import { looksLikeChain, normalizeName } from "@/lib/chains";
import type { City } from "@/lib/regions";
import { useApp } from "./Providers";

const PinPicker = dynamic(() => import("./PinPicker"), { ssr: false, loading: () => <div className="pin-picker" /> });

type Hit = { name: string; address: string; lat: number; lng: number; source: string; status?: string; website?: string };
const NEW_AREA = "__new";

export default function SubmitSpot({
  open,
  onClose,
  city,
  areas,
  spots,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  city: City;
  areas: Area[];
  spots: Spot[];
  onDone?: () => void;
}) {
  const { backend, toast } = useApp();
  const [name, setName] = useState("");
  const [genres, setGenres] = useState<GenreId[]>([]);
  const [drinks, setDrinks] = useState<DrinkKind[]>([]);
  const [price, setPrice] = useState<1 | 2 | 3 | 4>(2);
  const [address, setAddress] = useState("");
  const [area, setArea] = useState<string>("");
  const [newArea, setNewArea] = useState("");
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [knownFor, setKnownFor] = useState("");
  const [blurb, setBlurb] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [visited, setVisited] = useState(false);
  const [independent, setIndependent] = useState(false);
  const [notChain, setNotChain] = useState(false);
  const [dupOk, setDupOk] = useState(false);
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [looking, setLooking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) return;
    // reset after close animation
    const t = setTimeout(() => {
      setName(""); setGenres([]); setDrinks([]); setPrice(2); setAddress(""); setArea(""); setNewArea(""); setCoords(null);
      setKnownFor(""); setBlurb(""); setWebsite(""); setPhone(""); setNote(""); setPhoto(null); setVisited(false);
      setIndependent(false); setNotChain(false); setDupOk(false); setHits(null); setDone(false); setErr(null);
    }, 300);
    return () => clearTimeout(t);
  }, [open]);

  const chain = useMemo(() => (name.trim().length > 2 ? looksLikeChain(name) : null), [name]);
  const dup = useMemo(() => {
    const n = normalizeName(name);
    if (n.length < 3) return null;
    return (
      spots.find((s) => normalizeName(s.name) === n) ??
      (coords ? spots.find((s) => distanceKm(s.coords, coords) < 0.06 && normalizeName(s.name).split(" ")[0] === n.split(" ")[0]) : undefined) ??
      null
    );
  }, [name, coords, spots]);

  function toggleGenre(g: GenreId) {
    setGenres((x) => (x.includes(g) ? x.filter((y) => y !== g) : x.length >= 3 ? x : [...x, g]));
  }

  async function lookup() {
    const q = [name, address].filter(Boolean).join(", ");
    if (q.length < 3) return setErr("Type the name or address first.");
    setLooking(true);
    setErr(null);
    try {
      const r = await fetch(`/api/geocode?city=${city.id}&q=${encodeURIComponent(q)}`);
      const j = await r.json();
      setHits(j.results ?? []);
      if (j.error) setErr(j.error);
    } catch {
      setHits([]);
    } finally {
      setLooking(false);
    }
  }

  function pick(h: Hit) {
    setCoords([+h.lat.toFixed(6), +h.lng.toFixed(6)]);
    const short = h.address.split(",").slice(0, h.source === "google" ? 1 : 2).join(",").trim();
    if (!address || h.source === "google") setAddress(short || address);
    if (h.website && !website) setWebsite(h.website);
    setHits(null);
  }

  const areaLabel = area === NEW_AREA ? newArea.trim() : areas.find((a) => a.id === area)?.label ?? "";
  const problems = [
    name.trim().length < 2 && "the spot's name",
    genres.length === 0 && "at least one genre",
    address.trim().length < 4 && "an address",
    !coords && "a pin on the map",
    !areaLabel && "the neighborhood",
    knownFor.trim().length < 3 && "what it's known for",
    blurb.trim().length < 20 && "a couple sentences about it",
    !visited && "confirm you've been",
    !independent && "confirm it's locally owned",
    chain && !notChain && "confirm it isn't a chain",
    dup && !dupOk && "confirm it's not a duplicate",
  ].filter(Boolean) as string[];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (problems.length) return setErr(`Still need: ${problems.join(", ")}.`);
    setBusy(true);
    setErr(null);
    try {
      await backend.submitSpot(
        {
          cityId: city.id,
          name: name.trim(),
          address: address.trim(),
          area: area === NEW_AREA ? slugify(newArea) : area,
          areaLabel,
          coords: coords!,
          genres,
          drinks: genres.includes("drinks") ? drinks : [],
          price,
          knownFor: knownFor.trim(),
          blurb: blurb.trim(),
          website: website.trim() || undefined,
          phone: phone.trim() || undefined,
          tags: [],
        },
        [note.trim(), chain ? `Submitter confirmed this is not ${chain}.` : "", dup ? `Submitter says this differs from ${dup.name}.` : ""].filter(Boolean).join(" ") || undefined,
        photo ?? undefined
      );
      track("spot_submitted", { city: city.id });
      setDone(true);
      onDone?.();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That didn't go through. Try again?");
      toast("Submission failed", "err");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div
            className="modal submit"
            role="dialog"
            aria-modal="true"
            aria-label="Add a spot"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button className="modal-x" onClick={onClose} aria-label="Close">
              ×
            </button>

            {done ? (
              <div className="submit-done">
                <motion.p className="done-stamp" initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.25 }}>
                  Received
                </motion.p>
                <h2 className="modal-title">Got it. Thanks.</h2>
                <p className="muted">
                  One of us will make sure <strong>{name}</strong> is real, open and locally owned. That usually takes a day or two. You can check on it under
                  <em> Places you&apos;ve added</em> in your account menu. Once it&apos;s checked, it goes on the {city.name} map with your name on it.
                </p>
                <button className="btn btn-green" onClick={onClose}>
                  Back to the map
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="form submit-form">
                <h2 className="modal-title">Add a place in {city.name}</h2>
                <p className="muted small">Locally owned places only, no chains and no fast food. We check every one before it goes up.</p>

                <fieldset>
                  <legend>
                    <span className="num">1.</span> The place
                  </legend>
                  <label>
                    <span>Name</span>
                    <input value={name} onChange={(e) => (setName(e.target.value), setDupOk(false), setNotChain(false))} placeholder="e.g. Mom's Kitchen" maxLength={80} required />
                  </label>
                  {chain && (
                    <div className="warn">
                      <div>
                        <strong>That name matches a chain.</strong> We only list places that are locally owned.
                        <label className="check">
                          <input type="checkbox" checked={notChain} onChange={(e) => setNotChain(e.target.checked)} /> It&apos;s a different, locally owned place
                        </label>
                      </div>
                    </div>
                  )}
                  {dup && (
                    <div className="warn">
                      <div>
                        <strong>{dup.name} is already on here</strong> ({dup.address}).
                        <label className="check">
                          <input type="checkbox" checked={dupOk} onChange={(e) => setDupOk(e.target.checked)} /> Mine is a different place
                        </label>
                      </div>
                    </div>
                  )}
                  <div className="field-label">Genre (up to 3)</div>
                  <div className="genres compact">
                    {GENRES.map((g) => (
                      <button
                        type="button"
                        key={g.id}
                        className={`chip ${genres.includes(g.id) ? "on" : ""}`}
                        style={{ ["--c" as string]: g.color }}
                        onClick={() => toggleGenre(g.id)}
                        aria-pressed={genres.includes(g.id)}
                      >
                        {g.short}
                      </button>
                    ))}
                  </div>
                  {genres.includes("drinks") && (
                    <div className="subchips">
                      {DRINK_KINDS.map((k) => (
                        <button
                          type="button"
                          key={k.id}
                          className={`subchip ${drinks.includes(k.id) ? "on" : ""}`}
                          onClick={() => setDrinks((x) => (x.includes(k.id) ? x.filter((y) => y !== k.id) : [...x, k.id]))}
                        >
                          {k.label}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="field-label">Price</div>
                  <div className="row gap6">
                    {([1, 2, 3, 4] as const).map((p) => (
                      <button type="button" key={p} className={`subchip ${price === p ? "on" : ""}`} onClick={() => setPrice(p)}>
                        {"$".repeat(p)}
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend>
                    <span className="num">2.</span> Where it is
                  </legend>
                  <div className="row gap8 address-row">
                    <label className="grow">
                      <span>Street address</span>
                      <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St" maxLength={160} required />
                    </label>
                    <button type="button" className="btn btn-line" onClick={lookup} disabled={looking}>
                      {looking ? "Looking…" : "Find it"}
                    </button>
                  </div>
                  {hits && (
                    <div className="hits">
                      {hits.length === 0 ? (
                        <span className="hint">Couldn&apos;t find it. Tap the map to put the pin down yourself.</span>
                      ) : (
                        hits.map((h, i) => (
                          <button type="button" key={i} className="hit" onClick={() => pick(h)}>
                            <span>
                              <strong>{h.name}</strong>
                              <span className="mono-sm">{h.address}</span>
                            </span>
                            {h.status === "CLOSED_PERMANENTLY" && <span className="hit-bad">Closed</span>}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  <div className="pin-wrap-outer">
                    <PinPicker center={city.center} value={coords} onChange={setCoords} />
                    <span className="pin-hint">{coords ? "Drag the pin onto the front door" : "Tap the map where it is"}</span>
                  </div>
                  <label>
                    <span>Neighborhood</span>
                    <select value={area} onChange={(e) => setArea(e.target.value)} required>
                      <option value="" disabled>
                        Choose one
                      </option>
                      {areas.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label}
                        </option>
                      ))}
                      <option value={NEW_AREA}>Not listed</option>
                    </select>
                  </label>
                  {area === NEW_AREA && (
                    <label>
                      <span>Neighborhood name</span>
                      <input value={newArea} onChange={(e) => setNewArea(e.target.value)} placeholder="What locals call that area" maxLength={40} />
                    </label>
                  )}
                </fieldset>

                <fieldset>
                  <legend>
                    <span className="num">3.</span> Why go
                  </legend>
                  <label>
                    <span>Known for</span>
                    <input value={knownFor} onChange={(e) => setKnownFor(e.target.value)} placeholder="What should someone order?" maxLength={80} />
                  </label>
                  <label>
                    <span>Tell us about it</span>
                    <textarea value={blurb} onChange={(e) => setBlurb(e.target.value)} rows={3} maxLength={600} placeholder="A few sentences, like you'd tell a friend." />
                  </label>
                </fieldset>

                <fieldset>
                  <legend>
                    <span className="num">4.</span> Help us check it <span className="opt">(optional)</span>
                  </legend>
                  <div className="form-grid">
                    <label>
                      <span>Website or Instagram</span>
                      <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" maxLength={200} />
                    </label>
                    <label>
                      <span>Phone</span>
                      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(205) 555-0123" maxLength={30} inputMode="tel" />
                    </label>
                  </div>
                  <label className="photo-drop">
                    <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
                    <span>{photo ? `Photo: ${photo.name}` : "+ Add a photo of the front"}</span>
                  </label>
                  <label>
                    <span>Note for our team</span>
                    <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Hours, owner's name, anything that helps us check" maxLength={300} />
                  </label>
                </fieldset>

                <div className="certify">
                  <label className="check">
                    <input type="checkbox" checked={visited} onChange={(e) => setVisited(e.target.checked)} /> I&apos;ve been here myself
                  </label>
                  <label className="check">
                    <input type="checkbox" checked={independent} onChange={(e) => setIndependent(e.target.checked)} /> It&apos;s locally owned, not a chain or fast food
                  </label>
                </div>

                {err && <p className="form-err">{err}</p>}
                <div className="submit-bar">
                  <span className="hint">{problems.length ? `${problems.length} thing${problems.length > 1 ? "s" : ""} left` : "Ready"}</span>
                  <button className="btn btn-green" disabled={busy}>
                    {busy ? "Sending…" : "Send it in"}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
