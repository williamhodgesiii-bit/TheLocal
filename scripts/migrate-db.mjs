// Keeps the live database in step with supabase/schema.sql, so nobody has to paste it into
// Supabase after an update. Runs before every production build on Vercel (package.json "build"),
// using the database connection the Vercel ↔ Supabase integration adds (POSTGRES_URL…).
//
// - The whole file is one transaction (it starts with begin and ends with commit): it all goes
//   in, or nothing changes.
// - A file that already went in is skipped (its fingerprint is kept in public.schema_runs).
// - It never fails the build: a site that's a version ahead of its database keeps working, since
//   the app falls back for anything the database doesn't have yet.
//
// Locally: MIGRATE_DATABASE_URL=postgres://… node scripts/migrate-db.mjs
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const log = (m) => console.log(`[database] ${m}`);
const local = process.env.MIGRATE_DATABASE_URL;
if (!local && process.env.VERCEL_ENV !== "production") {
  log("not a production build; skipped");
  process.exit(0);
}
const urls = [local, process.env.POSTGRES_URL_NON_POOLING, process.env.POSTGRES_URL, process.env.DATABASE_URL, process.env.SUPABASE_DB_URL].filter(Boolean);
if (!urls.length) {
  log("no database connection in this environment; run supabase/schema.sql in Supabase → SQL Editor instead");
  process.exit(0);
}

const pg = (await import("pg").catch(() => null))?.default;
if (!pg) {
  log("the pg package isn't installed; skipped");
  process.exit(0);
}

const sql = readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8");
const hash = createHash("sha256").update(sql).digest("hex");

/** Supabase's certificate isn't in Node's store; the connection is still encrypted */
function clientFor(url) {
  const u = new URL(url);
  u.searchParams.delete("sslmode");
  u.searchParams.delete("supa");
  const isLocal = /^(localhost|127\.0\.0\.1|\/)/.test(u.hostname) || u.searchParams.has("host");
  return new pg.Client({ connectionString: u.toString(), ssl: isLocal ? false : { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
}

const short = (e) => `${e.code ? `${e.code} ` : ""}${String(e.message).replace(/postgres(ql)?:\/\/\S+/g, "<connection>").slice(0, 240)}`;

for (const [i, url] of urls.entries()) {
  const c = clientFor(url);
  try {
    await c.connect();
  } catch (e) {
    log(`couldn't connect with connection ${i + 1} of ${urls.length}: ${short(e)}`);
    continue;
  }
  try {
    await c.query("set lock_timeout = '15s'");
    await c.query(
      "create table if not exists public.schema_runs (hash text primary key, ran_at timestamptz not null default now()); alter table public.schema_runs enable row level security;"
    );
    const seen = await c.query("select ran_at from public.schema_runs where hash = $1", [hash]);
    if (seen.rowCount) {
      log(`already up to date (this version went in ${seen.rows[0].ran_at.toISOString()})`);
    } else {
      const t = Date.now();
      await c.query(sql);
      await c.query("insert into public.schema_runs (hash) values ($1) on conflict do nothing", [hash]);
      // the API picks up new tables and functions right away
      await c.query("notify pgrst, 'reload schema'");
      log(`updated in ${((Date.now() - t) / 1000).toFixed(1)}s (version ${hash.slice(0, 12)})`);
    }
  } catch (e) {
    await c.query("rollback").catch(() => {});
    log(`update didn't go in, nothing changed: ${short(e)}`);
  } finally {
    await c.end().catch(() => {});
  }
  break;
}
process.exit(0);
