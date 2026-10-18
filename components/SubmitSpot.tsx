"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { track } from "@/lib/analytics";
import { DRINK_KINDS, GENRES, distanceKm, slugify, type Area, type DrinkKind, type GenreId, type Spot } from "@/lib/data";
import { looksLikeChain, normalizeName } from "@/lib/chains";
import type { City } from "@/lib/regions";
import { useApp } from "./Providers";

// only loaded if an address can't be found and someone places it by hand
const PinPicker = dynamic(() => import("./PinPicker"), { ssr: false, loading: () => <div className="pin-picker" /> });

type Hit = { name: string; address: string; lat: number; lng: number; source: string; status?: string; website?: string };
/** idle: not looked up yet · looking · found: on the map · missing: no match · pinned: placed by hand */
type Where = "idle" | "looking" | "found" | "missing" | "pinned";
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
  /** they picked a neighborhood themselves, so a lookup won't change it (a ref: read inside lookups in flight) */
  const areaTouched = useRef(false);
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
  const [where, setWhere] = useState<Where>("idle");
  const [found, setFound] = useState<Hit | null>(null);
  const [alts, setAlts] = useState<Hit[]>([]);
  const [choosing, setChoosing] = useState(false);
  const [manual, setManual] = useState(false);
  /** the last lookup: leaving the box twice, or sending while it's still looking, reuses it */
  const look = useRef<{ address: string; result: Promise<Hit | null> } | null>(null);
  const seq = useRef(0);
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
      setName(""); setGenres([]); setDrinks([]); setPrice(2); setAddress(""); setArea(""); areaTouched.current = false; setNewArea(""); setCoords(null);
      setKnownFor(""); setBlurb(""); setWebsite(""); setPhone(""); setNote(""); setPhoto(null); setVisited(false);
      setIndependent(false); setNotChain(false); setDupOk(false); setDone(false); setErr(null);
      setWhere("idle"); setFound(null); setAlts([]); setChoosing(false); setManual(false); look.current = null;
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

  /** the neighborhood of the nearest place already on the map, when one is close by */
  function guessArea(at: [number, number]): string | null {
    const known = new Set(areas.map((a) => a.id));
    let best: { id: string; d: number } | null = null;
    for (const s of spots) {
      if (!known.has(s.area)) continue;
      const d = distanceKm(s.coords, at);
      if (d < 1.2 && (!best || d < best.d)) best = { id: s.area, d };
    }
    return best?.id ?? null;
  }

  function use(h: Hit, rest: Hit[]): Hit {
    const at: [number, number] = [+h.lat.toFixed(6), +h.lng.toFixed(6)];
    setCoords(at);
    setFound(h);
    setAlts(rest);
    setWhere("found");
    setChoosing(false);
    setManual(false);
    // tidy the street to how the lookup spells it ("2220 highland avenue south" → "2220 Highland Ave S")
    if (h.source !== "osm") {
      const street = h.address.split(",")[0].trim();
      if (street) {
        setAddress(street);
        look.current = { address: street, result: Promise.resolve(h) };
      }
    }
    if (h.website) setWebsite((w) => w || h.website!);
    if (!areaTouched.current) {
      const g = guessArea(at);
      if (g) setArea(g);
    }
    return h;
  }

  // Typing the address is all it takes: it's looked up when you leave the box (or press
  // Enter), and again on send if it changed. A map only appears if we can't find it.
  function locate(): Promise<Hit | null> {
    const a = address.trim();
    if (a.length < 4) return Promise.resolve(null);
    if (look.current?.address === a) return look.current.result;
    const mine = ++seq.current;
    setWhere("looking");
    setChoosing(false);
    const result = (async () => {
      try {
        const r = await fetch(`/api/geocode?${new URLSearchParams({ city: city.id, address: a, name: name.trim() })}`);
        const j = await r.json();
        if (mine !== seq.current) return null; // a newer address replaced this one
        const list: Hit[] = j.results ?? [];
        if (list.length) return use(list[0], list.slice(1));
        if (j.error) setErr(j.error);
      } catch {
        if (mine !== seq.current) return null;
        look.current = null; // a network hiccup: try again next time
      }
      setFound(null);
      setAlts([]);
      setCoords(null);
      setWhere("missing");
      return null;
    })();
    look.current = { address: a, result };
    return result;
  }

  const labelOf = (id: string) => (id === NEW_AREA ? newArea.trim() : areas.find((a) => a.id === id)?.label ?? "");
  const problemsAt = (at: [number, number] | null, areaLabel: string) => [
    name.trim().length < 2 && "the spot's name",
    genres.length === 0 && "at least one genre",
    address.trim().length < 4 ? "an address" : !at && "an address we can find",
    !areaLabel && "the neighborhood",
    knownFor.trim().length < 3 && "what it's known for",
    blurb.trim().length < 20 && "a couple sentences about it",
    !visited && "confirm you've been",
    !independent && "confirm it's locally owned",
    chain && !notChain && "confirm it isn't a chain",
    dup && !dupOk && "confirm it's not a duplicate",
  ].filter(Boolean) as string[];
  const problems = problemsAt(coords, labelOf(area));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    // Placed by hand wins; otherwise use the lookup, waiting for it if it's still going. What
    // it found reaches the form's state after this, so the answer itself is read here.
    const pinned = where === "pinned";
    const hit = pinned ? null : await locate();
    const at: [number, number] | null = pinned ? coords : hit ? [+hit.lat.toFixed(6), +hit.lng.toFixed(6)] : null;
    const street = hit && hit.source !== "osm" ? hit.address.split(",")[0].trim() : address.trim();
    const hood = area || (at && !areaTouched.current ? (guessArea(at) ?? "") : "");
    const areaLabel = labelOf(hood);
    const left = problemsAt(at, areaLabel);
    if (left.length) {
      setBusy(false);
      return setErr(`Still need: ${left.join(", ")}.`);
    }
    try {
      await backend.submitSpot(
        {
          cityId: city.id,
          name: name.trim(),
          address: street,
          area: hood === NEW_AREA ? slugify(newArea) : hood,
          areaLabel,
          coords: at!,
          genres,
          drinks: genres.includes("drinks") ? drinks : [],
          price,
          knownFor: knownFor.trim(),
          blurb: blurb.trim(),
          website: website.trim() || hit?.website || undefined,
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
      toast("That didn't go through. Try again?", "err");
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
                  One of us will make sure <strong>{name}</strong> is real, open and locally owned. That usually takes a day or two. You can check on it on your page, under
                  <em> Added</em>. Once it&apos;s checked, it goes on the map with your name on it.
                </p>
                <button className="btn btn-green" onClick={onClose}>
                  Back to the map
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="form submit-form" noValidate>
                <h2 className="modal-title">Add a place</h2>
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
                  <label>
                    <span>Street address</span>
                    <input
                      value={address}
                      onChange={(e) => {
                        setAddress(e.target.value);
                        if (e.target.value.trim() !== look.current?.address && where !== "pinned") {
                          setWhere("idle");
                          setChoosing(false);
                        }
                      }}
                      onBlur={() => void locate()}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void locate();
                        }
                      }}
                      placeholder="2220 Highland Ave S"
                      maxLength={160}
                      autoComplete="off"
                      required
                    />
                  </label>
                  <p className={`where-line ${where}`} aria-live="polite">
                    {where === "idle" && "Just the street address. We'll put it on the map."}
                    {where === "looking" && "Finding it…"}
                    {where === "found" && found && (
                      <>
                        <span className="where-ok">On the map:</span> {found.source === "google" && found.name !== found.address.split(",")[0] ? `${found.name}, ` : ""}
                        {found.address}{" "}
                        <button type="button" className="textbtn" onClick={() => (alts.length ? setChoosing((x) => !x) : setManual(true))}>
                          Not it?
                        </button>
                        {found.status === "CLOSED_PERMANENTLY" && <span className="hit-bad">Google says closed</span>}
                      </>
                    )}
                    {where === "missing" && (
                      <>
                        Couldn&apos;t find that address. Check the number and street
                        {!manual && (
                          <>
                            , or{" "}
                            <button type="button" className="textbtn" onClick={() => setManual(true)}>
                              place it on a map
                            </button>
                          </>
                        )}
                        .
                      </>
                    )}
                    {where === "pinned" && "Placed on the map by you. We'll double-check it."}
                  </p>
                  {choosing && (
                    <div className="hits">
                      {alts.map((h, i) => (
                        <button type="button" key={i} className="hit" onClick={() => use(h, [found!, ...alts.filter((x) => x !== h)])}>
                          <span>
                            <strong>{h.name}</strong>
                            <span className="mono-sm">{h.address}</span>
                          </span>
                          {h.status === "CLOSED_PERMANENTLY" && <span className="hit-bad">Closed</span>}
                        </button>
                      ))}
                      <button type="button" className="hit" onClick={() => (setChoosing(false), setManual(true))}>
                        <span>
                          <strong>None of these</strong>
                          <span className="mono-sm">Place it on a map yourself</span>
                        </span>
                      </button>
                    </div>
                  )}
                  {manual && (
                    <div className="pin-wrap-outer">
                      <PinPicker
                        center={coords ?? city.center}
                        value={coords}
                        onChange={(c) => {
                          setCoords(c);
                          setWhere("pinned");
                          if (!areaTouched.current) {
                            const g = guessArea(c);
                            if (g) setArea(g);
                          }
                        }}
                      />
                      <span className="pin-hint">{coords ? "Drag the pin onto the front door" : "Tap the map where it is"}</span>
                    </div>
                  )}
                  <label>
                    <span>Neighborhood</span>
                    <select value={area} onChange={(e) => {
                        setArea(e.target.value);
                        areaTouched.current = true;
                      }} required>
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
