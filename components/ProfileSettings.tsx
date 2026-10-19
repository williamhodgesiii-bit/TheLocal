"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { track } from "@/lib/analytics";
import type { Spot } from "@/lib/data";
import { BIO_MAX, COMMENT_POLICIES, TOP_MAX, cleanHandle, handleProblem, type CommentPolicy, type MemberLite } from "@/lib/social";
import { Avatar } from "./People";
import Portal from "./Portal";
import { useApp } from "./Providers";

const MONTH = 30 * 86400e3;

/** your page and who sees what: name, @name, a line about you, your Top 4, and privacy */
export default function ProfileSettings({ open, onClose, spotById }: { open: boolean; onClose: () => void; spotById: Record<string, Spot> }) {
  const { backend, user, me, setMe, toast, been } = useApp();
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [free, setFree] = useState<boolean | null>(null);
  const [bio, setBio] = useState("");
  const [top, setTop] = useState<string[]>([]);
  const [find, setFind] = useState("");
  const [priv, setPriv] = useState(false);
  const [inSearch, setInSearch] = useState(true);
  const [visits, setVisits] = useState(true);
  const [shareSaved, setShareSaved] = useState(true);
  const [comments, setComments] = useState<CommentPolicy>("anyone");
  const [blocked, setBlocked] = useState<MemberLite[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !me || !user) return;
    setName(user.name);
    setHandle(me.handle);
    setBio(me.bio ?? "");
    setTop(me.top);
    setPriv(me.private);
    setInSearch(me.inSearch);
    setVisits(me.shareVisits);
    setShareSaved(me.shareSaved);
    setComments(me.comments);
    setFind("");
    setFree(null);
    backend.blocked().then(setBlocked, () => setBlocked([]));
  }, [open, me?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // the @name, checked as you type
  const lockedUntil = me?.handleChangedAt && Date.now() - +new Date(me.handleChangedAt) < MONTH ? new Date(+new Date(me.handleChangedAt) + MONTH) : null;
  const handleBad = handle !== me?.handle ? handleProblem(handle) : null;
  useEffect(() => {
    if (!me || handle === me.handle || handleBad) return setFree(null);
    let live = true;
    const t = window.setTimeout(() => backend.handleFree(handle).then((ok) => live && setFree(ok)), 300);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [handle, me, handleBad, backend]);

  const matches = useMemo(() => {
    const t = find.trim().toLowerCase();
    const all = Object.values(spotById);
    if (t.length < 2) return all.filter((s) => been[s.id]?.verdict === "loved" && !top.includes(s.id)).slice(0, 6);
    return all.filter((s) => s.name.toLowerCase().includes(t) && !top.includes(s.id)).slice(0, 6);
  }, [find, spotById, top, been]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!me) return;
    if (handle !== me.handle && (handleBad || free === false)) return toast(handleBad ?? "That @name is taken. Try another.", "err");
    setBusy(true);
    try {
      if (name.trim() && name.trim() !== user?.name) await backend.updateName(name.trim());
      const next = await backend.saveMember({
        ...(handle !== me.handle ? { handle } : {}),
        bio,
        // only when changed, so picks from a city that isn't loaded right now aren't lost
        ...(top.join() !== me.top.join() ? { top } : {}),
        private: priv,
        inSearch,
        shareVisits: visits,
        shareSaved,
        comments,
      });
      setMe({ ...next, name: name.trim() || next.name });
      track("profile_saved", { private: priv });
      toast("Saved.", "ok");
      onClose();
    } catch (x) {
      toast(x instanceof Error ? x.message : "Couldn't save that.", "err");
    } finally {
      setBusy(false);
    }
  }

  async function unblock(m: MemberLite) {
    try {
      await backend.block(m.id, false);
      setBlocked((b) => b.filter((x) => x.id !== m.id));
      toast(`Unblocked ${m.name}.`);
    } catch {
      toast("Couldn't do that.", "err");
    }
  }

  return (
    <Portal>
      <AnimatePresence>
      {open && me && (
        <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.form
            className="modal where settings"
            role="dialog"
            aria-modal="true"
            aria-labelledby="set-title"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onMouseDown={(e) => e.stopPropagation()}
            onSubmit={save}
          >
            <div className="sheet-head">
              <h2 className="modal-title" id="set-title">
                Your page
              </h2>
              <button type="button" className="modal-x" onClick={onClose} aria-label="Close">
                ×
              </button>
            </div>
            <div className="sheet-body form">
              <div className="set-id">
                <Avatar m={{ id: me.id, name: name || me.name }} size={52} />
                <label className="set-grow">
                  <span className="cl">Name people see</span>
                  <input value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} maxLength={40} autoComplete="given-name" />
                </label>
              </div>
              <label>
                <span className="cl">@name</span>
                <span className="set-handle">
                  <span aria-hidden>@</span>
                  <input
                    value={handle}
                    onChange={(e) => setHandle(cleanHandle(e.target.value))}
                    disabled={!!lockedUntil}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    aria-describedby="handle-help"
                  />
                </span>
                <span id="handle-help" className={`set-help ${handleBad || free === false ? "bad" : free ? "good" : ""}`}>
                  {lockedUntil
                    ? `You can change it again on ${lockedUntil.toLocaleDateString("en-US", { month: "long", day: "numeric" })}.`
                    : handleBad ?? (free === false ? "Taken. Try another." : free ? "That one's free." : `Your page: theplatenextdoor.com/u/${handle}. Change it once a month.`)}
                </span>
              </label>
              <label>
                <span className="cl">A line about you</span>
                <textarea rows={2} value={bio} maxLength={BIO_MAX} onChange={(e) => setBio(e.target.value.replace(/\n/g, " "))} placeholder="Homewood. Will drive for barbecue." />
                <span className="set-help">{BIO_MAX - bio.length} left</span>
              </label>

              <fieldset className="set-top">
                <legend className="cl">Your Top 4</legend>
                <p className="set-help">The four places you&apos;d send anyone. They lead your page.</p>
                {top.length > 0 && (
                  <ol className="set-top-list">
                    {top.map((id) => (
                      <li key={id}>
                        {spotById[id]?.name ?? "A place in another city"}
                        <button type="button" className="textbtn" onClick={() => setTop((t) => t.filter((x) => x !== id))} aria-label={`Take ${spotById[id]?.name ?? "it"} off`}>
                          ×
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
                {top.length < TOP_MAX && (
                  <>
                    <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Add a place" aria-label="Find a place for your Top 4" />
                    {matches.length > 0 && (
                      <p className="set-picks">
                        {find.trim().length < 2 && <span className="set-help">Places you loved: </span>}
                        {matches.map((s) => (
                          <button key={s.id} type="button" className="b-chip b-chip-sm" onClick={() => (setTop((t) => [...t, s.id].slice(0, TOP_MAX)), setFind(""))}>
                            + {s.name}
                          </button>
                        ))}
                      </p>
                    )}
                  </>
                )}
              </fieldset>

              <fieldset className="set-privacy">
                <legend className="cl">Who sees what</legend>
                <Toggle on={priv} set={setPriv} label="Approve followers first">
                  Only people you approve see your passport, want-to-go list and activity. Your reviews still show on each place&apos;s page.
                </Toggle>
                <Toggle on={inSearch} set={setInSearch} label="Show me in search and suggestions">
                  Off, people can still open your page from a link.
                </Toggle>
                <Toggle on={visits} set={setVisits} label="Share my passport">
                  The places you&apos;ve stamped and how they went, on your page and in followers&apos; feeds. The day only, never the time.
                </Toggle>
                <Toggle on={shareSaved} set={setShareSaved} label="Share my want-to-go list">
                  On your page. Friends use it for gift ideas.
                </Toggle>
                <label className="set-row">
                  <span>Who can comment on your reviews</span>
                  <select value={comments} onChange={(e) => setComments(e.target.value as CommentPolicy)}>
                    {COMMENT_POLICIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
              </fieldset>

              {blocked.length > 0 && (
                <fieldset>
                  <legend className="cl">Blocked</legend>
                  <ul className="set-blocked">
                    {blocked.map((m) => (
                      <li key={m.id}>
                        {m.name} <span className="set-help">@{m.handle}</span>
                        <button type="button" className="textbtn" onClick={() => unblock(m)}>
                          Unblock
                        </button>
                      </li>
                    ))}
                  </ul>
                </fieldset>
              )}
            </div>
            <div className="sheet-foot">
              <button type="button" className="textbtn" onClick={onClose}>
                Cancel
              </button>
              <button className="btn btn-green" disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
      </AnimatePresence>
    </Portal>
  );
}

function Toggle({ on, set, label, children }: { on: boolean; set: (v: boolean) => void; label: string; children: React.ReactNode }) {
  return (
    <label className="set-toggle">
      <input type="checkbox" role="switch" checked={on} onChange={(e) => set(e.target.checked)} aria-checked={on} />
      <span>
        <b>{label}</b>
        <span className="set-help">{children}</span>
      </span>
    </label>
  );
}
