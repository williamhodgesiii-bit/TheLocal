import { BRAND, FOUNDER, MAILING_ADDRESS } from "./brand";

/**
 * The legal basics in one place. Change TERMS_VERSION whenever the Terms or Privacy Policy change in
 * a way that matters: every member is asked to agree again (components/TermsGate.tsx) and each
 * agreement is kept, dated, in public.terms_acceptances.
 */
export const TERMS_VERSION = "2026-11-09";
export const LEGAL_UPDATED = "November 9, 2026";
/** who runs the site. When an LLC is formed, put its exact name here and the pages follow. */
export const OPERATOR = FOUNDER.name ? `${FOUNDER.name}, doing business as ${BRAND}` : BRAND;
export const LEGAL_EMAIL = FOUNDER.email || "emails@theplatenextdoor.com";
export const LEGAL_ADDRESS = MAILING_ADDRESS;
export const GOVERNING_STATE = "Alabama";
export const VENUE = "Jefferson County, Alabama";
export const MIN_AGE = 13;
