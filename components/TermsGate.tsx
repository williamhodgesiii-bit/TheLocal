"use client";

import { useState } from "react";
import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { MIN_AGE } from "@/lib/legal";
import Portal from "./Portal";

/**
 * Asks a signed-in member to agree to the current Terms of Service and Privacy Policy: shown once to
 * everyone who joined before these terms, and again whenever TERMS_VERSION changes. An explicit
 * checkbox and button (a "clickwrap"), so there's no question they saw it and said yes; each
 * agreement is stored with its date (public.terms_acceptances).
 */
export default function TermsGate({ onAgree, onSignOut }: { onAgree: () => Promise<void>; onSignOut: () => void }) {
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <Portal>
      <div className="overlay terms-overlay">
        <div className="modal terms-gate" role="dialog" aria-modal="true" aria-labelledby="terms-title">
          <h2 className="modal-title" id="terms-title">
            Our Terms have been updated
          </h2>
          <p>
            To keep using {BRAND}, please read and agree to our <Link href="/terms" target="_blank">Terms of Service</Link> and{" "}
            <Link href="/privacy" target="_blank">Privacy Policy</Link>.
          </p>
          <ul className="terms-points">
            <li>Post only honest, first-hand reviews and photos you have the right to share.</li>
            <li>Restaurant details can change and reviews are members&apos; opinions. Check with a place before you go.</li>
            <li>The site is provided as-is, our liability is limited, and disputes go to individual arbitration, not class actions (you can opt out within 30 days).</li>
            <li>You must be {MIN_AGE} or older.</li>
          </ul>
          <label className="terms-check">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            <span>
              I have read and agree to the Terms of Service, including the arbitration agreement and class action waiver, and the Privacy Policy.
            </span>
          </label>
          <div className="terms-btns">
            <button type="button" className="textbtn" onClick={onSignOut}>
              Sign out
            </button>
            <button
              type="button"
              className="btn btn-ink"
              disabled={!checked || busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onAgree();
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Saving…" : "I agree"}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
