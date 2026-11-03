"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";
import { useApp } from "./Providers";
import { VerifiedMark } from "./People";

/**
 * The two things a member can ask for: the check (we confirm who you are) and Plate Patron
 * (supporting the site). Both start as a list the team answers by hand, so we learn who wants
 * them before building payments. Neither ever changes how a review counts.
 */
export default function Upgrades({ verified, patron }: { verified: boolean; patron: boolean }) {
  const { backend, user, me, toast } = useApp();
  const [sent, setSent] = useState<Record<string, boolean>>({});
  if (!user) return null;
  async function ask(tier: "patron" | "verify", message: string) {
    try {
      await backend.lead({ name: user!.name, business: me ? `@${me.handle}` : user!.name, email: user!.email, tier, message });
      setSent((s) => ({ ...s, [tier]: true }));
      track(tier === "patron" ? "patron_interest" : "verify_request");
      toast(tier === "patron" ? "You're on the founding Patron list. We'll email you." : "Got it. We'll email you to confirm who you are.", "ok");
    } catch (e) {
      toast(e instanceof Error ? e.message : "That didn't go through. Try again?", "err");
    }
  }
  return (
    <div className="upgrades">
      <section className="up-card up-patron">
        <p className="eyebrow">{patron ? "You're a Patron" : "Coming soon"}</p>
        <h3>Plate Patron</h3>
        <p>
          Keep the local list independent. Patrons get a Patron mark on their page, a <b>Plate Wrapped</b> of their year in food, a cover photo for their page, and
          The Thursday Plate a day early.
        </p>
        <p className="up-price">
          <b>$3</b> a month or <b>$24</b> a year. Founding Patrons keep that price for good.
        </p>
        {!patron && (
          <button type="button" className="btn btn-ink btn-sm" disabled={sent.patron} onClick={() => ask("patron", "Founding Patron list")}>
            {sent.patron ? "You're on the list" : "Join the founding list"}
          </button>
        )}
      </section>
      <section className="up-card">
        <p className="eyebrow">{verified ? "Verified" : "For chefs, writers, owners and regulars"}</p>
        <h3>
          <VerifiedMark size={18} /> Get verified
        </h3>
        <p>
          The check says we confirmed who you are, so people know your reviews come from a real local. We do it by hand. It never makes your reviews count more.
        </p>
        {!verified && (
          <button type="button" className="btn btn-line btn-sm" disabled={sent.verify} onClick={() => ask("verify", "Please verify my account")}>
            {sent.verify ? "Request sent" : "Ask to be verified"}
          </button>
        )}
      </section>
    </div>
  );
}
