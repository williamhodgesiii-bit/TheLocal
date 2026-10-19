"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { track } from "@/lib/analytics";
import { areaLabelOf, type Spot } from "@/lib/data";
import { giftFor, giftHref, soldBy, type Gift } from "@/lib/gifts";
import { Thumb } from "./Photo";
import Portal from "./Portal";
import { useApp } from "./Providers";

const HOW: Record<Gift["kind"], string> = {
  egift: "An e-gift card, sent by email or text.",
  mailed: "A plastic card, mailed.",
  either: "Pick e-gift or mailed on their page.",
};

/**
 * Gift cards, the honest way: we send you to the place's own gift card page, where the place
 * sells the card and keeps every dollar. For a friend, it starts from their favorites, and a
 * friend (you follow each other) can get a note on the site that a card is on its way.
 */
export default function GiftSheet({
  open,
  onClose,
  spots,
  to,
  reason,
  surface,
}: {
  open: boolean;
  onClose: () => void;
  /** one place (from its page) or someone's favorites */
  spots: Spot[];
  to?: { id: string; name: string; friends: boolean };
  reason?: (id: string) => string;
  surface: string;
}) {
  const { backend, toast } = useApp();
  const [pick, setPick] = useState<Spot | null>(null);
  const [went, setWent] = useState(false);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const giftable = spots.filter((s) => giftFor(s));
  const first = to?.name.split(" ")[0];

  useEffect(() => {
    if (!open) return;
    setPick(spots.length === 1 ? spots[0] : null);
    setWent(false);
    setNote("");
    setSent(false);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function sendNote() {
    if (!to || !pick) return;
    try {
      await backend.sendGiftNote(to.id, pick.id, note);
      setSent(true);
      track("gift_note");
      toast(`${first} will see a note that a card's on the way.`, "ok");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't send that.", "err");
    }
  }

  const g = pick ? giftFor(pick) : undefined;
  return (
    <Portal>
      <AnimatePresence>
      {open && (
        <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div
            className="modal where gift-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gift-title"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="sheet-head">
              <h2 className="modal-title" id="gift-title">
                {to ? `Treat ${first}` : "Gift card"}
              </h2>
              <button className="modal-x" onClick={onClose} aria-label="Close">
                ×
              </button>
            </div>
            <div className="sheet-body">
              {!pick ? (
                giftable.length ? (
                  <>
                    <p className="muted">A gift card to one of {first}&apos;s favorites. Each is sold by the place itself.</p>
                    <ul className="gift-list">
                      {giftable.map((s) => (
                        <li key={s.id}>
                          <button type="button" className="mb-row" onClick={() => setPick(s)}>
                            <Thumb spot={s} w={56} />
                            <span className="mb-row-main">
                              <b>{s.name}</b>
                              <span className="mb-row-sub">{reason?.(s.id) || areaLabelOf(s)}</span>
                              <span className="mb-row-sub">{soldBy(s, giftFor(s)!)}</span>
                            </span>
                            <span className="gift-go" aria-hidden>
                              →
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <>
                    <p className="muted">
                      None of {first ? `${first}'s` : "these"} places sell gift cards online that we&apos;ve found yet. Most sell them at the register, so ask next time you&apos;re in.
                    </p>
                    {spots.length > 0 && (
                      <ul className="gift-list quiet">
                        {spots.slice(0, 6).map((s) => (
                          <li key={s.id}>
                            <b>{s.name}</b> · {reason?.(s.id) || areaLabelOf(s)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )
              ) : (
                <div className="gift-one">
                  {spots.length > 1 && (
                    <button type="button" className="textbtn" onClick={() => (setPick(null), setWent(false))}>
                      ← {first}&apos;s other places
                    </button>
                  )}
                  <div className="gift-place">
                    <Thumb spot={pick} w={72} />
                    <span>
                      <b>{pick.name}</b>
                      <span>{areaLabelOf(pick)}</span>
                      {reason?.(pick.id) && <span>{reason(pick.id)}</span>}
                    </span>
                  </div>
                  {g ? (
                    <>
                      <p className="gift-sold">{soldBy(pick, g)}.</p>
                      <p className="gift-how">
                        {HOW[g.kind]} {g.note}
                      </p>
                      <ol className="gift-steps">
                        <li>Pick an amount on their page{to ? ` and put in ${first}'s email` : ""}.</li>
                        <li>{pick.name} sends the card. Questions about it go to them.</li>
                      </ol>
                      <a
                        className="btn btn-green btn-block gift-buy"
                        href={giftHref(pick.id, surface)}
                        target="_blank"
                        rel="noopener"
                        onClick={() => {
                          setWent(true);
                          track("gift_click", { id: pick.id, via: g.via, from: surface });
                        }}
                      >
                        Buy a gift card from {pick.name} ↗
                      </a>
                      {to && went && (
                        <div className="gift-note">
                          {to.friends ? (
                            sent ? (
                              <p className="gift-sent">Note sent. {first} will see it under Activity.</p>
                            ) : (
                              <>
                                <label htmlFor="gift-note">Tell {first} it&apos;s on the way (optional)</label>
                                <textarea id="gift-note" rows={2} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Happy birthday! Get the ribeye." />
                                <button type="button" className="btn btn-line btn-sm" onClick={sendNote}>
                                  Send the note
                                </button>
                              </>
                            )
                          ) : (
                            <p className="muted">Bought it? Let {first} know it&apos;s coming. Notes on the site are for friends (you follow each other).</p>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="muted">We haven&apos;t found a way to buy {pick.name} gift cards online. Ask at the register.</p>
                  )}
                </div>
              )}
            </div>
            <p className="sheet-foot gift-fine">We don&apos;t sell these cards or take a cut. Your money goes straight to the restaurant.</p>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </Portal>
  );
}
