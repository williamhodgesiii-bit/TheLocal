-- The Plate Next Door — Supabase schema
-- Paste the whole file into Supabase → SQL Editor → Run. Safe to run again any
-- time (it only adds what's missing and refreshes the rules), so after an
-- update just run it again. Setup steps for sign-in are in README → Accounts.
-- Without NEXT_PUBLIC_SUPABASE_URL + a publishable (anon) key in Vercel the
-- site runs in on-device demo mode.

begin;

-- ---------- Reviews ----------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  spot_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 10 and 2000),
  created_at timestamptz not null default now(),
  unique (spot_id, user_id)
);
create index if not exists reviews_spot_idx on public.reviews (spot_id, created_at desc);

alter table public.reviews enable row level security;
drop policy if exists "reviews are public" on public.reviews;
create policy "reviews are public" on public.reviews for select using (true);
drop policy if exists "members write their own reviews" on public.reviews;
create policy "members write their own reviews" on public.reviews for insert with check (auth.uid() = user_id);
drop policy if exists "members edit their own reviews" on public.reviews;
create policy "members edit their own reviews" on public.reviews for update using (auth.uid() = user_id);
drop policy if exists "members delete their own reviews" on public.reviews;
create policy "members delete their own reviews" on public.reviews for delete using (auth.uid() = user_id);

-- Reviews, the full version (Oct 2026). The rules are in lib/reviews.ts and README → Reviews:
-- one paragraph (100–600 characters), a labeled 1–5 score, "would you go back", what you got
-- (1–3 things), the month you went, and a promise that you went yourself and have no tie to the
-- place. Optional: "good for" tags and food/service/vibe scores. Older reviews keep working.
alter table public.reviews add column if not exists go_back boolean;
alter table public.reviews add column if not exists visited_on date;
alter table public.reviews add column if not exists ordered text[] not null default '{}';
alter table public.reviews add column if not exists good_for text[] not null default '{}';
alter table public.reviews add column if not exists sub_taste smallint check (sub_taste between 1 and 5);
alter table public.reviews add column if not exists sub_service smallint check (sub_service between 1 and 5);
alter table public.reviews add column if not exists sub_vibe smallint check (sub_vibe between 1 and 5);
alter table public.reviews add column if not exists affirmed_at timestamptz;
alter table public.reviews add column if not exists updated_at timestamptz;
-- "held": reported and being checked, so it doesn't count and only its writer sees it
alter table public.reviews add column if not exists status text not null default 'live' check (status in ('live', 'held', 'removed'));
create index if not exists reviews_user_idx on public.reviews (user_id, created_at desc);

-- The same rules for every review, good or bad, checked where nobody can skip them.
create or replace function public.review_rules() returns trigger
  language plpgsql security definer set search_path = public
as $$
declare
  today int;
begin
  if tg_op = 'UPDATE' then
    -- who wrote it, about where, and when it was first posted never change
    new.user_id := old.user_id;
    new.spot_id := old.spot_id;
    new.created_at := old.created_at;
    -- only staff, or our own report rule (a trigger inside a trigger), can hold or restore a review
    if not public.is_admin() and pg_trigger_depth() < 2 then new.status := old.status; end if;
    -- a rename re-signs old reviews; nothing else to check then
    if new.body is not distinct from old.body and new.rating is not distinct from old.rating
       and new.go_back is not distinct from old.go_back and new.ordered is not distinct from old.ordered
       and new.visited_on is not distinct from old.visited_on and new.good_for is not distinct from old.good_for
       and new.sub_taste is not distinct from old.sub_taste and new.sub_service is not distinct from old.sub_service
       and new.sub_vibe is not distinct from old.sub_vibe then
      return new;
    end if;
    new.updated_at := now();
  else
    new.status := 'live';
    select count(*) into today from public.reviews where user_id = new.user_id and created_at > now() - interval '1 day';
    if today >= 5 then raise exception 'That''s 5 reviews today. Come back tomorrow for more.'; end if;
  end if;
  new.body := btrim(regexp_replace(regexp_replace(new.body, '\s*\n+\s*', ' ', 'g'), ' {2,}', ' ', 'g'));
  if char_length(new.body) not between 100 and 600 then
    raise exception 'Reviews are one paragraph, 100 to 600 characters.';
  end if;
  if new.go_back is null then raise exception 'Would you go back? Pick yes or no.'; end if;
  if cardinality(new.ordered) not between 1 and 3 then raise exception 'Add what you got: one to three things.'; end if;
  if exists (select 1 from unnest(new.ordered) o where char_length(btrim(o)) not between 1 and 40) then
    raise exception 'Keep each thing you got under 40 characters.';
  end if;
  if cardinality(new.good_for) > 3 then raise exception 'Pick up to three "good for" tags.'; end if;
  if new.visited_on is null or new.visited_on > current_date or new.visited_on < current_date - interval '25 months' then
    raise exception 'Pick the month you went (within the last two years).';
  end if;
  if new.affirmed_at is null then raise exception 'Confirm you went yourself and have no tie to the place.'; end if;
  return new;
end $$;
drop trigger if exists reviews_rules on public.reviews;
create trigger reviews_rules before insert or update on public.reviews
  for each row execute function public.review_rules();


-- "Helpful": one per member per review, never on your own. Who voted stays private; counts are public.
create table if not exists public.review_votes (
  review_id uuid not null references public.reviews (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);
alter table public.review_votes enable row level security;
drop policy if exists "members see their votes" on public.review_votes;
create policy "members see their votes" on public.review_votes for select using (auth.uid() = user_id);
drop policy if exists "members vote helpful" on public.review_votes;
create policy "members vote helpful" on public.review_votes for insert with check (
  auth.uid() = user_id and not exists (select 1 from public.reviews r where r.id = review_id and r.user_id = auth.uid())
);
drop policy if exists "members take back a vote" on public.review_votes;
create policy "members take back a vote" on public.review_votes for delete using (auth.uid() = user_id);
create or replace view public.review_helpful as
  select review_id, count(*) as helpful from public.review_votes group by review_id;
grant select on public.review_helpful to anon, authenticated;

-- how many reviews each member has posted, shown beside their name
create or replace view public.reviewer_totals as
  select user_id, count(*) as reviews from public.reviews where status = 'live' group by user_id;
grant select on public.reviewer_totals to anon, authenticated;

-- Reports: members flag a review; three reports hold it for a person to check. Same for any rating.
create table if not exists public.review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (reason in ('not-firsthand', 'conflict', 'abusive', 'spam', 'other')),
  note text check (char_length(note) <= 300),
  created_at timestamptz not null default now(),
  unique (review_id, user_id)
);
alter table public.review_reports enable row level security;
drop policy if exists "members report reviews" on public.review_reports;
create policy "members report reviews" on public.review_reports for insert with check (auth.uid() = user_id);
create or replace function public.hold_reported_review() returns trigger
  language plpgsql security definer set search_path = public
as $$
begin
  if (select count(*) from public.review_reports where review_id = new.review_id) >= 3 then
    update public.reviews set status = 'held' where id = new.review_id and status = 'live';
  end if;
  return new;
end $$;
drop trigger if exists review_reported on public.review_reports;
create trigger review_reported after insert on public.review_reports
  for each row execute function public.hold_reported_review();

-- what the list shows: live reviews only
create or replace view public.spot_ratings as
  select spot_id, round(avg(rating)::numeric, 2) as avg_rating, count(*) as review_count,
         round(100.0 * avg(case when go_back then 1 when not go_back then 0 end))::int as go_back_pct
  from public.reviews where status = 'live' group by spot_id;
grant select on public.spot_ratings to anon, authenticated;

-- ---------- Photos ----------
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  spot_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  url text not null,
  kind text not null default 'food' check (kind in ('food', 'building', 'vibe')),
  caption text check (char_length(caption) <= 140),
  approved boolean not null default true, -- flip default to false for pre-moderation
  created_at timestamptz not null default now()
);
create index if not exists photos_spot_idx on public.photos (spot_id, created_at desc);

alter table public.photos enable row level security;
drop policy if exists "approved photos are public" on public.photos;
create policy "approved photos are public" on public.photos for select using (approved or auth.uid() = user_id);
drop policy if exists "members add photos" on public.photos;
create policy "members add photos" on public.photos for insert with check (auth.uid() = user_id);
drop policy if exists "members delete their photos" on public.photos;
create policy "members delete their photos" on public.photos for delete using (auth.uid() = user_id);

-- Storage bucket for uploads (public read; members write into their own folder)
insert into storage.buckets (id, name, public) values ('spot-photos', 'spot-photos', true)
  on conflict (id) do nothing;
drop policy if exists "public read spot photos" on storage.objects;
create policy "public read spot photos" on storage.objects for select using (bucket_id = 'spot-photos');
drop policy if exists "members upload to own folder" on storage.objects;
create policy "members upload to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'spot-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "members delete own uploads" on storage.objects;
create policy "members delete own uploads" on storage.objects for delete to authenticated
  using (bucket_id = 'spot-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Growth & revenue ----------
create table if not exists public.subscribers (
  email text primary key check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at timestamptz not null default now()
);
alter table public.subscribers enable row level security;
drop policy if exists "anyone can subscribe" on public.subscribers;
create policy "anyone can subscribe" on public.subscribers for insert with check (true);

create table if not exists public.partner_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business text not null,
  email text not null,
  tier text not null,
  message text,
  created_at timestamptz not null default now()
);
alter table public.partner_leads enable row level security;
drop policy if exists "anyone can submit a lead" on public.partner_leads;
create policy "anyone can submit a lead" on public.partner_leads for insert with check (true);

-- =====================================================================
-- Community spots: members submit → staff verify → spot goes live
-- =====================================================================

-- Staff who can moderate. Add yourself after signing up:
--   insert into public.admins (user_id) select id from auth.users where email = 'you@example.com';
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public
  as $$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;
grant execute on function public.is_admin() to anon, authenticated;

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  city_id text not null,
  name text not null check (char_length(name) between 2 and 80),
  address text not null check (char_length(address) between 4 and 160),
  area text not null,
  area_label text not null,
  lat double precision not null,
  lng double precision not null,
  genres text[] not null check (array_length(genres, 1) between 1 and 3),
  drinks text[] not null default '{}',
  price smallint not null check (price between 1 and 4),
  known_for text not null check (char_length(known_for) between 3 and 80),
  blurb text not null check (char_length(blurb) between 20 and 600),
  website text,
  phone text,
  tags text[] not null default '{}',
  note text,
  photo_url text,
  submitted_by uuid not null references auth.users (id) on delete cascade,
  submitter_name text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reject_reason text,
  checklist jsonb,
  reviewed_by uuid references auth.users (id),
  reviewed_at timestamptz,
  spot_id text,
  created_at timestamptz not null default now()
);
create index if not exists submissions_status_idx on public.submissions (status, created_at);
create index if not exists submissions_user_idx on public.submissions (submitted_by, created_at desc);

alter table public.submissions enable row level security;
drop policy if exists "members see their own submissions; staff see all" on public.submissions;
create policy "members see their own submissions; staff see all" on public.submissions
  for select using (auth.uid() = submitted_by or public.is_admin());
-- members can submit (pending only), max 10 waiting at a time
drop policy if exists "members submit spots" on public.submissions;
create policy "members submit spots" on public.submissions for insert with check (
  auth.uid() = submitted_by and status = 'pending'
  and (select count(*) from public.submissions s where s.submitted_by = auth.uid() and s.status = 'pending') < 10
);
drop policy if exists "staff review submissions" on public.submissions;
create policy "staff review submissions" on public.submissions for update using (public.is_admin());

create table if not exists public.spots (
  id text primary key,
  city_id text not null,
  name text not null,
  address text not null,
  area text not null,
  area_label text,
  lat double precision not null,
  lng double precision not null,
  genres text[] not null,
  drinks text[] not null default '{}',
  price smallint not null,
  known_for text not null,
  blurb text not null,
  website text,
  phone text,
  tags text[] not null default '{}',
  pop smallint not null default 60,
  sponsored boolean not null default false,
  status text not null default 'live' check (status in ('live', 'closed', 'hidden')),
  added_by text,
  submitted_by uuid references auth.users (id) on delete set null,
  submission_id uuid references public.submissions (id) on delete set null,
  verified_by uuid references auth.users (id),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists spots_city_idx on public.spots (city_id) where status = 'live';

alter table public.spots enable row level security;
drop policy if exists "live spots are public" on public.spots;
create policy "live spots are public" on public.spots for select using (status = 'live' or public.is_admin());
drop policy if exists "staff publish spots" on public.spots;
create policy "staff publish spots" on public.spots for insert with check (public.is_admin());
drop policy if exists "staff edit spots" on public.spots;
create policy "staff edit spots" on public.spots for update using (public.is_admin());

-- staff attach a submitter's storefront photo when approving
drop policy if exists "staff add photos" on public.photos;
create policy "staff add photos" on public.photos for insert with check (public.is_admin());

-- ---------- Expansion waitlist ----------
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  state text not null,
  city text,
  created_at timestamptz not null default now(),
  unique (email, state)
);
alter table public.waitlist enable row level security;
drop policy if exists "anyone can join the waitlist" on public.waitlist;
create policy "anyone can join the waitlist" on public.waitlist for insert with check (true);

-- =====================================================================
-- Accounts: profiles, the passport and want-to-try list, staff by email
-- =====================================================================

-- One row per member, kept in step with their sign-in record automatically
-- (name, home city, email, last visit). Members read their own; staff read all.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  home_city text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz
);
alter table public.profiles enable row level security;
drop policy if exists "members read their own profile" on public.profiles;
create policy "members read their own profile" on public.profiles for select using (auth.uid() = id or public.is_admin());

create or replace function public.sync_profile() returns trigger
  language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, home_city, avatar_url, last_seen_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'home_city',
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    new.last_sign_in_at
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    home_city = coalesce(excluded.home_city, public.profiles.home_city),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    last_seen_at = coalesce(excluded.last_seen_at, public.profiles.last_seen_at),
    updated_at = now();
  return new;
exception when others then
  -- never let bookkeeping block a sign-in
  raise warning 'sync_profile failed for %: %', new.id, sqlerrm;
  return new;
end $$;

drop trigger if exists on_auth_user_saved on auth.users;
create trigger on_auth_user_saved
  after insert or update of raw_user_meta_data, email, last_sign_in_at on auth.users
  for each row execute function public.sync_profile();

-- members who signed up before this existed
insert into public.profiles (id, email, display_name, home_city, last_seen_at)
  select id, email,
         coalesce(raw_user_meta_data ->> 'display_name', raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name'),
         raw_user_meta_data ->> 'home_city', last_sign_in_at
  from auth.users
on conflict (id) do nothing;

-- a new name re-signs their old reviews and photos too
create or replace function public.propagate_display_name() returns trigger
  language plpgsql security definer set search_path = public
as $$
begin
  if new.display_name is not null and new.display_name is distinct from old.display_name then
    update public.reviews set display_name = new.display_name where user_id = new.id;
    update public.photos set display_name = new.display_name where user_id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists on_profile_renamed on public.profiles;
create trigger on_profile_renamed after update of display_name on public.profiles
  for each row execute function public.propagate_display_name();

-- The want-to-try list
create table if not exists public.saved_spots (
  user_id uuid not null references auth.users (id) on delete cascade,
  spot_id text not null check (char_length(spot_id) between 1 and 80),
  created_at timestamptz not null default now(),
  primary key (user_id, spot_id)
);
alter table public.saved_spots enable row level security;
drop policy if exists "members manage their saved list" on public.saved_spots;
create policy "members manage their saved list" on public.saved_spots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- The Plate Passport: one stamp per place, with how it went
create table if not exists public.stamps (
  user_id uuid not null references auth.users (id) on delete cascade,
  spot_id text not null check (char_length(spot_id) between 1 and 80),
  verdict text check (verdict in ('loved', 'liked', 'meh')),
  stamped_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, spot_id)
);
create index if not exists stamps_spot_idx on public.stamps (spot_id);
alter table public.stamps enable row level security;
drop policy if exists "members manage their passport" on public.stamps;
create policy "members manage their passport" on public.stamps
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Staff by email: anyone who signs in with a verified address on this list can
-- moderate. Add more with:  insert into public.admin_emails values ('name@example.com');
create table if not exists public.admin_emails (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);
alter table public.admin_emails enable row level security; -- read only through is_admin()
insert into public.admin_emails (email) values ('emails@theplatenextdoor.com') on conflict do nothing;

create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
      or exists (
        select 1 from auth.users u join public.admin_emails a on a.email = lower(u.email)
        where u.id = auth.uid() and u.email_confirmed_at is not null
      )
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- Fallback for "Delete my account" when the server key isn't configured.
-- (The app normally deletes through /api/account/delete, which also clears uploads.)
create or replace function public.delete_my_account() returns void
  language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Review rules that need the staff check above (kept here so a fresh database sets up in one run)
-- everyone sees live reviews; a writer also sees their own while it's held
drop policy if exists "reviews are public" on public.reviews;
create policy "reviews are public" on public.reviews for select using (status = 'live' or auth.uid() = user_id or public.is_admin());
drop policy if exists "staff moderate reviews" on public.reviews;
create policy "staff moderate reviews" on public.reviews for update using (public.is_admin());
drop policy if exists "staff read reports" on public.review_reports;
create policy "staff read reports" on public.review_reports for select using (auth.uid() = user_id or public.is_admin());

commit;
