# Security

How accounts and data are protected, what the November 2026 audit found and fixed, and the settings only the owners can turn on.

## How it's protected

- **No passwords.** Sign-in is a one-time email code (Supabase Auth), Google, or a passkey. There is no password database to steal.
- **Encrypted everywhere.** HTTPS only; browsers are told to remember that for two years (HSTS).
- **Row level security on every table.** The database itself checks every request: members can read and change only their own private rows (saved places, stamps, notifications, blocks, profile email). This was verified by loading `supabase/schema.sql` into Postgres and attacking it as a signed-out visitor and as a member.
- **Least privilege.** The public (signed-out) role can't write to any table except the four public sign-up forms, and can't read emails, sign-up lists, leads, profiles, push tokens or notifications at all. Internal tables (admins, admin emails, banned words, Google budget, handle history) are closed to everyone but the server.
- **Server keys stay on the server.** `SUPABASE_SECRET_KEY` is only read in `app/api/*` routes; nothing secret is in a `NEXT_PUBLIC_` variable.
- **Staff powers can't be claimed.** Roles, Verified and Patron can only be set by staff (`member_rules`); `is_admin()` requires a confirmed email.
- **Security headers** (`next.config.mjs`): HSTS, no framing (clickjacking), nosniff, strict referrer, camera/location only for us, a CSP that blocks base-tag and plugin injection.
- **Crash reports** go to the server log (`/api/client-error`), never to a third party.

## Audit, Nov 9, 2026: found and fixed

| Found | Fix |
| --- | --- |
| A member could sign a review or photo with any name (e.g. "The Plate Next Door") through a direct API call | `sign_as_member()` trigger: always the account's own name |
| A member photo could point to any outside image | `photo_source_rules()`: must be in the member's own upload folder |
| The public role held write privileges on every table (only RLS stopped it) | Revoked; only the four sign-up forms take public inserts |
| Sign-up forms accepted any text | Length and email-format checks on waitlist, leads, subscribers |
| Sign-in redirect accepted `/\evil.com` (an open redirect for phishing) | `safeNext()` rejects backslashes and control characters and requires our own origin |
| No security headers | Added (above) |
| No record of members agreeing to the Terms | `terms_acceptances` table + `accept_terms()`; a one-time agreement screen (`TermsGate`) |

Checked and fine: every table has RLS; every privileged function pins its search path; emails are unreadable through the API; aggregate views (`spot_ratings`, `review_reactions`, …) expose counts only; storage uploads are limited to the member's own folder; account deletion verifies the token; unsubscribe links are HMAC-signed; push and cron routes claim work once; user text is escaped in structured data, the map and RSS.

## Owner checklist (dashboards only you can change)

1. **Two-factor authentication** on every account that controls the site: Supabase, Vercel, GitHub, Google Cloud, Resend, Apple Developer and the domain registrar. A stolen dashboard login is the most likely real-world breach.
2. **Supabase → Authentication → URL Configuration**: Site URL `https://www.theplatenextdoor.com`; Redirect URLs only `https://www.theplatenextdoor.com/**` and `https://theplatenextdoor.com/**`.
3. **Supabase → Authentication → Sign In / Providers → Email**: OTP expiry 600 seconds (10 minutes); keep "Secure email change" on.
4. **Supabase → Authentication → Rate Limits**: keep the defaults or lower; consider turning on **CAPTCHA** (Cloudflare Turnstile is free) once bots show up.
5. **Supabase → Advisors → Security Advisor**: run it. It will list the five count-only views as "security definer views"; that's intentional (they publish totals, not rows).
6. **Vercel → Environment Variables**: set `CRON_SECRET` (any long random string) and `PUSH_WEBHOOK_SECRET` so only Vercel and the database can call those routes. Never put the Supabase secret key in a `NEXT_PUBLIC_` variable.
7. **If a key is ever exposed** (pasted in a chat, committed to GitHub), rotate it in Supabase → Project Settings → API Keys, then update Vercel.
8. **Backups**: the free Supabase plan keeps limited backups; export the database occasionally (Database → Backups, or `pg_dump`).
9. **Legal**: register a DMCA agent with the U.S. Copyright Office (copyright.gov/dmca-directory, $6) so the copyright safe harbor applies; form an LLC and put its name in `lib/legal.ts` (`OPERATOR`); have a lawyer read the Terms.
