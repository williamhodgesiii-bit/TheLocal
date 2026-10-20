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

-- Words that never post: slurs and threats, as whole words, through the usual letter swaps
-- (lib/moderation.ts keeps the same list). Add more with: insert into public.banned_terms values ('…');
create table if not exists public.banned_terms (term text primary key check (term = lower(term)));
alter table public.banned_terms enable row level security; -- read only through has_banned_word()
insert into public.banned_terms (term) values
  ('nigger'), ('niggers'), ('nigga'), ('niggas'), ('faggot'), ('faggots'), ('fag'), ('fags'), ('dyke'), ('dykes'), ('tranny'), ('trannies'),
  ('retard'), ('retards'), ('retarded'), ('chink'), ('chinks'), ('spic'), ('spics'), ('kike'), ('kikes'), ('wetback'), ('wetbacks'), ('gook'),
  ('gooks'), ('coon'), ('coons'), ('beaner'), ('beaners'), ('raghead'), ('ragheads'), ('towelhead'), ('towelheads'), ('cunt'), ('cunts'),
  ('kys'), ('kill yourself'), ('kill urself')
on conflict do nothing;
create or replace function public.has_banned_word(t text) returns boolean
  language sql stable security definer set search_path = public
as $$
  with x as (
    select regexp_replace(translate(lower(coalesce(t, '')), '0@41!3$', 'oaaiies'), '[^a-z\s]', '', 'g') as v
  )
  select exists (select 1 from public.banned_terms b, x where x.v ~ ('\m' || replace(b.term, ' ', '\s+') || '\M'))
$$;

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
  if public.has_banned_word(new.body || ' ' || array_to_string(new.ordered, ' ')) then
    raise exception 'That has a word we don''t allow here. Talk about the food, not the person.';
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
create or replace function public.photo_rules() returns trigger
  language plpgsql security definer set search_path = public
as $$
begin
  if public.has_banned_word(new.caption) then raise exception 'That has a word we don''t allow here.'; end if;
  return new;
end $$;
drop trigger if exists photos_rules on public.photos;
create trigger photos_rules before insert or update of caption on public.photos
  for each row execute function public.photo_rules();

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
-- when the team was emailed about it (app/api/notify)
alter table public.submissions add column if not exists notified_at timestamptz;
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

-- =====================================================================
-- Friends (Oct 2026): public member pages, follows, the feed, comments,
-- reactions and notifications. The research and the rules are in
-- README → Friends. Email addresses never leave public.profiles: everything
-- other members can read lives in public.members.
-- =====================================================================

create extension if not exists pg_trgm with schema extensions;
-- (wherever pg_trgm already lives, the indexes and search below find it)
set local search_path = public, extensions;

-- ---------- Members: the public side of an account ----------
create table if not exists public.members (
  id uuid primary key references auth.users (id) on delete cascade,
  -- @name: 3–20 lowercase letters, numbers or underscores, starting with a letter
  handle text not null unique check (handle ~ '^[a-z][a-z0-9_]{2,19}$'),
  display_name text not null check (char_length(display_name) between 1 and 40),
  bio text check (char_length(bio) <= 160),
  avatar_url text,
  -- 'editor' for staff and local critics people can follow from day one
  role text not null default 'member' check (role in ('member', 'editor')),
  -- approve followers first; reviews stay public on place pages either way
  is_private boolean not null default false,
  in_search boolean not null default true,
  -- the passport (places stamped, the day only) on my page, in followers' feeds and on places' pages
  share_visits boolean not null default true,
  -- the want-to-go list on my page (friends use it for gift ideas)
  share_saved boolean not null default true,
  -- who can comment on my reviews
  comments text not null default 'anyone' check (comments in ('anyone', 'following', 'off')),
  -- the Top 4 shelf
  top_spots text[] not null default '{}' check (cardinality(top_spots) <= 4),
  handle_changed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists members_handle_trgm on public.members using gin (handle gin_trgm_ops);
create index if not exists members_name_trgm on public.members using gin (lower(display_name) gin_trgm_ops);

-- an old @name points to its owner for 90 days, so shared links keep working and nobody can grab it
create table if not exists public.handle_history (
  handle text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  released_at timestamptz not null default now()
);
alter table public.handle_history enable row level security;

create or replace function public.reserved_handles() returns text[]
  language sql immutable
as $$ select array['about','admin','api','auth','best','credits','edit','editor','everyone','explore','feed','friends','gift','help',
  'home','login','logout','me','members','mod','moderator','neighborhood','new','notifications','null','official','partners','passport',
  'people','plate','platenextdoor','privacy','root','search','settings','signin','signup','spot','staff','support','team',
  'theplatenextdoor','undefined','user','users','you'] $$;

create or replace function public.handle_ok(h text, me uuid) returns boolean
  language sql stable security definer set search_path = public
as $$
  select h ~ '^[a-z][a-z0-9_]{2,19}$'
     and h <> all (public.reserved_handles())
     and not exists (select 1 from public.members m where m.handle = h and m.id is distinct from me)
     and not exists (select 1 from public.handle_history x where x.handle = h and x.user_id is distinct from me and x.released_at > now() - interval '90 days')
$$;

-- "Will H." (or "Will Hodges") → "willh", or "willh27" when that's taken
create or replace function public.new_handle(name text) returns text
  language plpgsql volatile security definer set search_path = public
as $$
declare
  base text;
  h text;
  i int := 0;
begin
  -- "Will Hodges" and "Will H." both make "willh": a surname never goes into an @name
  name := btrim(coalesce(name, ''));
  if name ~ '\s' then
    name := split_part(name, ' ', 1) || left(regexp_replace(name, '^.*\s', ''), 1);
  end if;
  base := left(regexp_replace(lower(translate(coalesce(name, ''), 'ÁÀÂÄÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝáàâäãåçéèêëíìîïñóòôöõúùûüýÿ', 'AAAAAACEEEEIIIINOOOOOUUUUYaaaaaaceeeeiiiinooooouuuuyy')), '[^a-z0-9]+', '', 'g'), 14);
  if base !~ '^[a-z]' then base := 'eats' || base; end if;
  if char_length(base) < 3 then base := base || 'eats'; end if;
  base := left(base, 14);
  h := base;
  while not public.handle_ok(h, null) loop
    i := i + 1;
    h := base || (10 + floor(random() * (case when i < 6 then 90 else 99990 end)))::int;
    if i > 40 then
      h := 'local' || floor(random() * 1e9)::bigint;
      exit;
    end if;
  end loop;
  return h;
end $$;

create or replace function public.member_rules() returns trigger
  language plpgsql security definer set search_path = public
as $$
begin
  new.handle := lower(btrim(new.handle));
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.created_at := old.created_at;
    if not public.is_admin() then new.handle_changed_at := old.handle_changed_at; end if;
    -- staff set roles; names come from the account (sync_member), pictures aren't uploadable yet
    if not public.is_admin() then
      new.role := old.role;
      new.avatar_url := old.avatar_url;
      if pg_trigger_depth() < 2 then new.display_name := old.display_name; end if;
    end if;
    if new.handle is distinct from old.handle then
      -- the @name we picked for you can change right away; after that, once a month
      if old.handle_changed_at > now() - interval '30 days' and not public.is_admin() then
        raise exception 'You can change your @name once a month.';
      end if;
      if not public.handle_ok(new.handle, new.id) then raise exception '@% is taken or not allowed. Try another.', new.handle; end if;
      insert into public.handle_history (handle, user_id) values (old.handle, old.id)
        on conflict (handle) do update set user_id = excluded.user_id, released_at = now();
      delete from public.handle_history where handle = new.handle and user_id = new.id;
      -- a change they made starts the month; our swap of a placeholder (below) doesn't
      if pg_trigger_depth() < 2 then new.handle_changed_at := now(); end if;
    end if;
  else
    if not public.is_admin() then
      new.role := 'member';
      new.avatar_url := null;
    end if;
    new.handle_changed_at := null;
    if not public.handle_ok(new.handle, new.id) then raise exception '@% is taken or not allowed. Try another.', new.handle; end if;
  end if;
  new.display_name := left(coalesce(nullif(btrim(new.display_name), ''), 'Local'), 40);
  new.bio := nullif(left(btrim(regexp_replace(coalesce(new.bio, ''), '\s+', ' ', 'g')), 160), '');
  if public.has_banned_word(coalesce(new.bio, '') || ' ' || replace(new.handle, '_', ' ')) and not public.is_admin() then
    raise exception 'That has a word we don''t allow here.';
  end if;
  -- the Top 4: places in the order picked, no repeats
  new.top_spots := coalesce((
    select array_agg(s order by o) from (
      select distinct on (s) s, o from unnest(new.top_spots) with ordinality as t (s, o)
      where char_length(s) between 1 and 80 order by s, o
    ) d
  ), '{}');
  if cardinality(new.top_spots) > 4 then new.top_spots := new.top_spots[1:4]; end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists members_rules on public.members;
create trigger members_rules before insert or update on public.members
  for each row execute function public.member_rules();

alter table public.members enable row level security;
-- ---------- Blocks and mutes (needed by the member rules below) ----------
create table if not exists public.blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists blocks_blocked_idx on public.blocks (blocked_id);
alter table public.blocks enable row level security;
drop policy if exists "members manage their blocks" on public.blocks;
create policy "members manage their blocks" on public.blocks for all
  using ((select auth.uid()) = blocker_id) with check ((select auth.uid()) = blocker_id);

create table if not exists public.mutes (
  muter_id uuid not null references auth.users (id) on delete cascade,
  muted_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_id),
  check (muter_id <> muted_id)
);
alter table public.mutes enable row level security;
drop policy if exists "members manage their mutes" on public.mutes;
create policy "members manage their mutes" on public.mutes for all
  using ((select auth.uid()) = muter_id) with check ((select auth.uid()) = muter_id);

-- either of us blocked the other (a block hides both people from each other everywhere)
create or replace function public.blocked_with(other uuid) returns boolean
  language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.blocks b
    where (b.blocker_id = (select auth.uid()) and b.blocked_id = other) or (b.blocker_id = other and b.blocked_id = (select auth.uid()))
  )
$$;

-- ---------- Follows ----------
create table if not exists public.follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  followee_id uuid not null references auth.users (id) on delete cascade,
  -- 'pending' while a private member decides
  status text not null default 'accepted' check (status in ('accepted', 'pending')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index if not exists follows_followee_idx on public.follows (followee_id, status, created_at desc);
create index if not exists follows_follower_idx on public.follows (follower_id, status, created_at desc);

-- I can see their passport, want-to-go list and activity: it's me, or they're public, or I'm an approved follower
create or replace function public.can_view(target uuid) returns boolean
  language sql stable security definer set search_path = public
as $$
  select coalesce(target = (select auth.uid()), false) or (
    not public.blocked_with(target) and exists (select 1 from public.members m where m.id = target) and (
      not (select m.is_private from public.members m where m.id = target)
      or exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.followee_id = target and f.status = 'accepted')
    )
  )
$$;

drop policy if exists "members are public" on public.members;
create policy "members are public" on public.members for select using (not public.blocked_with(id));
-- and only these columns: Top 4, privacy and search settings are read through member_page / ensure_member
revoke select on public.members from anon, authenticated;
grant select (id, handle, display_name, avatar_url, role, is_private, bio, comments, created_at) on public.members to anon, authenticated;
drop policy if exists "members edit themselves" on public.members;
create policy "members edit themselves" on public.members for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
drop policy if exists "members create themselves" on public.members;
create policy "members create themselves" on public.members for insert with check ((select auth.uid()) = id);

-- Accounts from before Friends: their passport and want-to-go list were private when they made
-- them, so they start with sharing off. (Friends launched October 20, 2026; nobody can stamp or
-- save before signing in, so a newer account with stamps already is one from before too.)
create or replace function public.joined_before_friends(uid uuid) returns boolean
  language sql stable security definer set search_path = public
as $$
  select coalesce((select u.created_at < timestamptz '2026-10-20 05:00:00+00' from auth.users u where u.id = uid), false)
      or exists (select 1 from public.stamps where user_id = uid)
      or exists (select 1 from public.saved_spots where user_id = uid)
$$;
revoke all on function public.joined_before_friends(uuid) from public, anon, authenticated;

-- a member row for everyone with a name: made with the first name, renamed with the name
create or replace function public.sync_member() returns trigger
  language plpgsql security definer set search_path = public
as $$
begin
  if new.display_name is null then return new; end if;
  if exists (select 1 from public.members where id = new.id) then
    update public.members set display_name = new.display_name where id = new.id and display_name is distinct from new.display_name;
    -- made before they had a name (@local…): now it can be a real one
    update public.members set handle = public.new_handle(new.display_name)
      where id = new.id and handle ~ '^local[0-9]*$' and handle_changed_at is null;
  else
    insert into public.members (id, handle, display_name, share_visits, share_saved)
    values (new.id, public.new_handle(new.display_name), new.display_name, not public.joined_before_friends(new.id), not public.joined_before_friends(new.id));
  end if;
  return new;
exception when others then
  -- never let this block a sign-in; the app makes the row on first use instead (ensure_member)
  raise warning 'sync_member failed for %: %', new.id, sqlerrm;
  return new;
end $$;
drop trigger if exists on_profile_member on public.profiles;
create trigger on_profile_member after insert or update of display_name on public.profiles
  for each row execute function public.sync_member();

-- members who signed up before this existed. Their passport and want-to-go list were private
-- when they made them, so they stay private until the member switches sharing on.
do $$
declare
  r record;
begin
  for r in select p.id, p.display_name from public.profiles p
           where p.display_name is not null and not exists (select 1 from public.members m where m.id = p.id) loop
    insert into public.members (id, handle, display_name, share_visits, share_saved)
    values (r.id, public.new_handle(r.display_name), r.display_name, false, false);
  end loop;
end $$;

create or replace function public.ensure_member() returns public.members
  language plpgsql volatile security definer set search_path = public
as $$
declare
  m public.members;
  nm text;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  select * into m from public.members where id = auth.uid();
  if found then return m; end if;
  select display_name into nm from public.profiles where id = auth.uid();
  insert into public.members (id, handle, display_name, share_visits, share_saved)
  values (auth.uid(), public.new_handle(coalesce(nm, 'Local')), coalesce(nm, 'Local'), not public.joined_before_friends(auth.uid()), not public.joined_before_friends(auth.uid()))
    returning * into m;
  return m;
end $$;
revoke all on function public.ensure_member() from public, anon;
grant execute on function public.ensure_member() to authenticated;

create or replace function public.handle_free(h text) returns boolean
  language sql stable security definer set search_path = public
as $$ select public.handle_ok(lower(btrim(h)), (select auth.uid())) $$;
grant execute on function public.handle_free(text) to anon, authenticated;

-- follow rules: no follows across a block, private members approve, and no follow sprees
create or replace function public.follow_rules() returns trigger
  language plpgsql security definer set search_path = public
as $$
declare
  priv boolean;
  n int;
begin
  if tg_op = 'UPDATE' then
    new.follower_id := old.follower_id;
    new.followee_id := old.followee_id;
    new.created_at := old.created_at;
    if new.status = old.status then
      new.accepted_at := old.accepted_at;
      return new;
    end if;
    if old.status <> 'pending' or new.status <> 'accepted' then raise exception 'That can''t be changed.'; end if;
    new.accepted_at := now();
    return new;
  end if;
  if exists (select 1 from public.blocks b where (b.blocker_id = new.follower_id and b.blocked_id = new.followee_id)
                                             or (b.blocker_id = new.followee_id and b.blocked_id = new.follower_id)) then
    raise exception 'You can''t follow this member.';
  end if;
  select is_private into priv from public.members where id = new.followee_id;
  if not found then raise exception 'That member isn''t here anymore.'; end if;
  if new.follower_id = auth.uid() then perform public.ensure_member(); end if;
  select count(*) into n from public.follows where follower_id = new.follower_id and created_at > now() - interval '1 hour';
  if n >= 60 then raise exception 'That''s a lot of follows at once. Try again in an hour.'; end if;
  select count(*) into n from public.follows where follower_id = new.follower_id and created_at > now() - interval '1 day';
  if n >= 200 then raise exception 'That''s a lot of follows for one day. Try again tomorrow.'; end if;
  if priv then
    select count(*) into n from public.follows where follower_id = new.follower_id and status = 'pending';
    if n >= 100 then raise exception 'You have 100 requests waiting. Give people time to answer.'; end if;
  end if;
  new.created_at := now();
  new.status := case when priv then 'pending' else 'accepted' end;
  new.accepted_at := case when priv then null else now() end;
  return new;
end $$;
drop trigger if exists follows_rules on public.follows;
create trigger follows_rules before insert or update on public.follows
  for each row execute function public.follow_rules();

alter table public.follows enable row level security;
-- who follows whom is public for public members, followers-only for private ones; requests only to the two people
drop policy if exists "follows are visible" on public.follows;
create policy "follows are visible" on public.follows for select using (
  (select auth.uid()) in (follower_id, followee_id)
  or (status = 'accepted' and public.can_view(follower_id) and public.can_view(followee_id))
);
drop policy if exists "members follow" on public.follows;
create policy "members follow" on public.follows for insert with check ((select auth.uid()) = follower_id);
drop policy if exists "members approve requests" on public.follows;
create policy "members approve requests" on public.follows for update using ((select auth.uid()) = followee_id);
-- unfollow, cancel a request, decline one, or remove a follower
drop policy if exists "either side ends a follow" on public.follows;
create policy "either side ends a follow" on public.follows for delete using ((select auth.uid()) in (follower_id, followee_id));

-- going public lets everyone who asked in
create or replace function public.member_went_public() returns trigger
  language plpgsql security definer set search_path = public
as $$
begin
  if old.is_private and not new.is_private then
    update public.follows set status = 'accepted' where followee_id = new.id and status = 'pending';
  end if;
  return new;
end $$;
drop trigger if exists members_went_public on public.members;
create trigger members_went_public after update of is_private on public.members
  for each row execute function public.member_went_public();

-- a block ends follows both ways and clears what passed between the two
create or replace function public.block_cleanup() returns trigger
  language plpgsql security definer set search_path = public
as $$
begin
  delete from public.follows where (follower_id = new.blocker_id and followee_id = new.blocked_id) or (follower_id = new.blocked_id and followee_id = new.blocker_id);
  delete from public.notifications where (user_id = new.blocker_id and actor_id = new.blocked_id) or (user_id = new.blocked_id and actor_id = new.blocker_id);
  return new;
end $$;

create table if not exists public.member_reports (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references auth.users (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (reason in ('impersonation', 'harassment', 'spam', 'underage', 'inappropriate', 'other')),
  note text check (char_length(note) <= 300),
  created_at timestamptz not null default now(),
  unique (member_id, user_id)
);
alter table public.member_reports enable row level security;
drop policy if exists "members report members" on public.member_reports;
create policy "members report members" on public.member_reports for insert with check ((select auth.uid()) = user_id and member_id <> user_id);

-- ---------- Reactions: "Helpful" grows into Helpful, Want to go and Thanks ----------
alter table public.review_votes add column if not exists kind text not null default 'helpful';
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'review_votes_kind_check') then
    alter table public.review_votes add constraint review_votes_kind_check check (kind in ('helpful', 'want', 'thanks'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.review_votes'::regclass and contype = 'p' and pg_get_constraintdef(oid) like '%kind%') then
    alter table public.review_votes drop constraint if exists review_votes_pkey;
    alter table public.review_votes add primary key (review_id, user_id, kind);
  end if;
end $$;
drop policy if exists "members vote helpful" on public.review_votes;
create policy "members vote helpful" on public.review_votes for insert with check (
  (select auth.uid()) = user_id
  and not exists (select 1 from public.reviews r where r.id = review_id and (r.user_id = (select auth.uid()) or public.blocked_with(r.user_id)))
);
create or replace view public.review_helpful as
  select review_id, count(*) as helpful from public.review_votes where kind = 'helpful' group by review_id;
create or replace view public.review_reactions as
  select review_id, kind, count(*) as n from public.review_votes group by review_id, kind;
grant select on public.review_helpful, public.review_reactions to anon, authenticated;

-- ---------- Comments: one level of replies, 500 characters, 15 minutes to fix a typo ----------
create table if not exists public.review_comments (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  parent_id uuid references public.review_comments (id) on delete cascade,
  body text check (char_length(body) <= 500),
  -- 'hidden': the review's writer took it down (its writer still sees it); 'deleted': gone, kept as a placeholder for its replies
  status text not null default 'live' check (status in ('live', 'hidden', 'held', 'removed', 'deleted')),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
-- who a reply answered (the thread it joins may have been started by someone else)
alter table public.review_comments add column if not exists reply_to uuid references auth.users (id) on delete set null;
create index if not exists review_comments_review_idx on public.review_comments (review_id, created_at);
create index if not exists review_comments_user_idx on public.review_comments (user_id, created_at desc);
create index if not exists review_comments_parent_idx on public.review_comments (parent_id) where parent_id is not null;

create or replace function public.comment_rules() returns trigger
  language plpgsql security definer set search_path = public
as $$
declare
  rv record;
  par record;
  n int;
  fresh boolean;
begin
  if tg_op = 'UPDATE' then
    new.review_id := old.review_id;
    new.user_id := old.user_id;
    new.parent_id := old.parent_id;
    new.reply_to := old.reply_to;
    new.created_at := old.created_at;
    -- staff, and our own rules (a trigger inside a trigger), can change anything else
    if pg_trigger_depth() >= 2 or public.is_admin() then return new; end if;
    -- the review's writer can hide or restore a comment on it; nothing else
    if auth.uid() is distinct from old.user_id then
      if new.status in ('live', 'hidden') and old.status in ('live', 'hidden') and new.body is not distinct from old.body
         and exists (select 1 from public.reviews r where r.id = old.review_id and r.user_id = auth.uid()) then
        new.edited_at := old.edited_at;
        return new;
      end if;
      raise exception 'That comment can''t be changed.';
    end if;
    new.status := old.status;
    new.edited_at := old.edited_at;
    if new.body is not distinct from old.body then return new; end if;
    if old.status <> 'live' then raise exception 'That comment can''t be edited.'; end if;
    if old.created_at < now() - interval '15 minutes' then raise exception 'Comments can be edited for 15 minutes after posting.'; end if;
    new.body := btrim(regexp_replace(coalesce(new.body, ''), '\s+', ' ', 'g'));
    if char_length(new.body) not between 1 and 500 then raise exception 'Comments are 1 to 500 characters.'; end if;
    if public.has_banned_word(new.body) then raise exception 'That has a word we don''t allow here. Talk about the food, not the person.'; end if;
    new.edited_at := now();
    return new;
  end if;

  new.body := btrim(regexp_replace(coalesce(new.body, ''), '\s+', ' ', 'g'));
  if char_length(new.body) not between 1 and 500 then raise exception 'Comments are 1 to 500 characters.'; end if;
  if public.has_banned_word(new.body) then raise exception 'That has a word we don''t allow here. Talk about the food, not the person.'; end if;
  select r.user_id, r.status, coalesce(m.comments, 'anyone') as comments, coalesce(m.display_name, r.display_name) as name
    into rv from public.reviews r left join public.members m on m.id = r.user_id where r.id = new.review_id;
  if not found or rv.status <> 'live' then raise exception 'That review isn''t taking comments.'; end if;
  if rv.user_id <> new.user_id then
    if exists (select 1 from public.blocks b where (b.blocker_id = rv.user_id and b.blocked_id = new.user_id) or (b.blocker_id = new.user_id and b.blocked_id = rv.user_id)) then
      raise exception 'You can''t comment on this review.';
    end if;
    if rv.comments = 'off' then raise exception 'Comments are off for this review.'; end if;
    if rv.comments = 'following' and not exists (select 1 from public.follows f where f.follower_id = rv.user_id and f.followee_id = new.user_id and f.status = 'accepted') then
      raise exception 'Only people % follows can comment on this review.', rv.name;
    end if;
  end if;
  -- one level of replies: answering a reply joins the thread it's in
  new.reply_to := null;
  if new.parent_id is not null then
    select c.review_id, c.parent_id, c.user_id into par from public.review_comments c where c.id = new.parent_id;
    if not found or par.review_id <> new.review_id then raise exception 'That comment isn''t there anymore.'; end if;
    new.reply_to := par.user_id;
    if par.parent_id is not null then new.parent_id := par.parent_id; end if;
  end if;
  -- pace: 30 seconds apart, 20 an hour, 100 a day; brand-new accounts 10 a day
  if exists (select 1 from public.review_comments where user_id = new.user_id and created_at > now() - interval '30 seconds') then
    raise exception 'Give it a few seconds before the next comment.';
  end if;
  select count(*) into n from public.review_comments where user_id = new.user_id and created_at > now() - interval '1 hour';
  if n >= 20 then raise exception 'That''s 20 comments this hour. Take a breather.'; end if;
  select count(*) into n from public.review_comments where user_id = new.user_id and created_at > now() - interval '1 day';
  select coalesce(u.created_at > now() - interval '72 hours', false) into fresh from auth.users u where u.id = new.user_id;
  if n >= (case when fresh then 10 else 100 end) then raise exception 'That''s the most comments for one day. More tomorrow.'; end if;
  if new.user_id = auth.uid() then perform public.ensure_member(); end if;
  new.status := 'live';
  new.created_at := now();
  new.edited_at := null;
  return new;
end $$;
drop trigger if exists review_comments_rules on public.review_comments;
create trigger review_comments_rules before insert or update on public.review_comments
  for each row execute function public.comment_rules();

-- deleting a comment with replies leaves "Comment deleted" so the thread still reads
create or replace function public.comment_soft_delete() returns trigger
  language plpgsql security definer set search_path = public
as $$
begin
  if pg_trigger_depth() > 1 then return old; end if; -- the review (or the whole thread) is going
  if exists (select 1 from public.review_comments c where c.parent_id = old.id and c.status <> 'deleted') then
    update public.review_comments set status = 'deleted', body = null where id = old.id;
    return null;
  end if;
  return old;
end $$;
drop trigger if exists review_comments_soft_delete on public.review_comments;
create trigger review_comments_soft_delete before delete on public.review_comments
  for each row execute function public.comment_soft_delete();
-- and when the last reply goes, so does the placeholder
create or replace function public.comment_tidy() returns trigger
  language plpgsql security definer set search_path = public
as $$
begin
  if old.parent_id is not null and pg_trigger_depth() = 1 then
    delete from public.review_comments p where p.id = old.parent_id and p.status = 'deleted'
      and not exists (select 1 from public.review_comments c where c.parent_id = p.id);
  end if;
  return old;
end $$;
drop trigger if exists review_comments_tidy on public.review_comments;
create trigger review_comments_tidy after delete on public.review_comments
  for each row execute function public.comment_tidy();

alter table public.review_comments enable row level security;
drop policy if exists "comments are public" on public.review_comments;
-- the review's writer also sees what they hid, so they can put it back
create policy "comments are public" on public.review_comments for select using (
  (status in ('live', 'deleted') or (select auth.uid()) = user_id
   or (status = 'hidden' and exists (select 1 from public.reviews r where r.id = review_id and r.user_id = (select auth.uid()))))
  and not public.blocked_with(user_id)
);
drop policy if exists "members comment" on public.review_comments;
create policy "members comment" on public.review_comments for insert with check ((select auth.uid()) = user_id);
-- writers fix typos; the review's writer can hide a comment on it
drop policy if exists "members edit comments" on public.review_comments;
create policy "members edit comments" on public.review_comments for update using (
  (select auth.uid()) = user_id or exists (select 1 from public.reviews r where r.id = review_id and r.user_id = (select auth.uid()))
);
drop policy if exists "members delete comments" on public.review_comments;
create policy "members delete comments" on public.review_comments for delete using (
  (select auth.uid()) = user_id or exists (select 1 from public.reviews r where r.id = review_id and r.user_id = (select auth.uid()))
);
create or replace view public.review_comment_counts as
  select review_id, count(*) as n from public.review_comments where status = 'live' group by review_id;
grant select on public.review_comment_counts to anon, authenticated;

create table if not exists public.comment_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.review_comments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (reason in ('not-firsthand', 'conflict', 'abusive', 'harassment', 'personal-info', 'spam', 'other')),
  note text check (char_length(note) <= 300),
  created_at timestamptz not null default now(),
  unique (comment_id, user_id)
);
alter table public.comment_reports enable row level security;
drop policy if exists "members report comments" on public.comment_reports;
create policy "members report comments" on public.comment_reports for insert with check ((select auth.uid()) = user_id);
-- three reports hold a comment for a person to check (two when its writer is brand new)
create or replace function public.hold_reported_comment() returns trigger
  language plpgsql security definer set search_path = public
as $$
declare
  writer_new boolean;
begin
  select coalesce(u.created_at > now() - interval '72 hours', false) into writer_new
    from public.review_comments c join auth.users u on u.id = c.user_id where c.id = new.comment_id;
  if (select count(*) from public.comment_reports where comment_id = new.comment_id) >= (case when writer_new then 2 else 3 end) then
    update public.review_comments set status = 'held' where id = new.comment_id and status in ('live', 'hidden');
  end if;
  return new;
end $$;
drop trigger if exists comment_reported on public.comment_reports;
create trigger comment_reported after insert on public.comment_reports
  for each row execute function public.hold_reported_comment();

-- ---------- Notifications: written only by the rules here, read by their owner ----------
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete cascade,
  kind text not null check (kind in ('follow', 'request', 'accepted', 'comment', 'reply', 'mention', 'reaction', 'gift')),
  review_id uuid references public.reviews (id) on delete cascade,
  comment_id uuid references public.review_comments (id) on delete cascade,
  spot_id text,
  detail text check (char_length(detail) <= 300),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (user_id) where read_at is null;
alter table public.notifications enable row level security;
drop policy if exists "members read their notifications" on public.notifications;
create policy "members read their notifications" on public.notifications for select using ((select auth.uid()) = user_id);
drop policy if exists "members mark notifications read" on public.notifications;
create policy "members mark notifications read" on public.notifications for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "members clear notifications" on public.notifications;
create policy "members clear notifications" on public.notifications for delete using ((select auth.uid()) = user_id);

drop trigger if exists blocks_cleanup on public.blocks;
create trigger blocks_cleanup after insert on public.blocks
  for each row execute function public.block_cleanup();

-- never about your own actions, never from someone you blocked or muted
create or replace function public.notify(recipient uuid, actor uuid, k text, rev uuid, com uuid, spot text, det text) returns void
  language plpgsql security definer set search_path = public
as $$
begin
  if recipient is null or recipient = actor then return; end if;
  if exists (select 1 from public.blocks where (blocker_id = recipient and blocked_id = actor) or (blocker_id = actor and blocked_id = recipient)) then return; end if;
  if exists (select 1 from public.mutes where muter_id = recipient and muted_id = actor) then return; end if;
  insert into public.notifications (user_id, actor_id, kind, review_id, comment_id, spot_id, detail)
  values (recipient, actor, k, rev, com, spot, left(det, 300));
end $$;
revoke all on function public.notify(uuid, uuid, text, uuid, uuid, text, text) from public, anon, authenticated;

-- ---------- The feed: what people did, kept as one line each ----------
create table if not exists public.activities (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('review', 'been', 'save', 'follow')),
  spot_id text,
  review_id uuid references public.reviews (id) on delete cascade,
  target_id uuid references auth.users (id) on delete cascade,
  verdict text,
  created_at timestamptz not null default now()
);
create index if not exists activities_time_idx on public.activities (created_at desc, id desc);
create index if not exists activities_actor_idx on public.activities (actor_id, created_at desc, id desc);
create unique index if not exists activities_once on public.activities
  (actor_id, kind, (coalesce(spot_id, '')), (coalesce(target_id, '00000000-0000-0000-0000-000000000000'::uuid)));
alter table public.activities enable row level security;
-- read through feed(); members see their own
drop policy if exists "members see their activity" on public.activities;
create policy "members see their activity" on public.activities for select using ((select auth.uid()) = actor_id);

create or replace function public.log_review() returns trigger
  language plpgsql security definer set search_path = public
as $$
begin
  insert into public.activities (actor_id, kind, spot_id, review_id, created_at)
  values (new.user_id, 'review', new.spot_id, new.id, new.created_at)
  on conflict (actor_id, kind, (coalesce(spot_id, '')), (coalesce(target_id, '00000000-0000-0000-0000-000000000000'::uuid)))
  do update set review_id = excluded.review_id;
  return new;
end $$;
drop trigger if exists reviews_activity on public.reviews;
create trigger reviews_activity after insert on public.reviews
  for each row execute function public.log_review();

create or replace function public.log_stamp() returns trigger
  language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.activities where actor_id = old.user_id and kind = 'been' and spot_id = old.spot_id;
    return old;
  elsif tg_op = 'UPDATE' then
    update public.activities set verdict = new.verdict where actor_id = new.user_id and kind = 'been' and spot_id = new.spot_id;
    return new;
  end if;
  -- the day it happened (never in the future), so an old passport brought in doesn't flood the feed as "today"
  insert into public.activities (actor_id, kind, spot_id, verdict, created_at)
  values (new.user_id, 'been', new.spot_id, new.verdict, least(new.stamped_at, now()))
  on conflict (actor_id, kind, (coalesce(spot_id, '')), (coalesce(target_id, '00000000-0000-0000-0000-000000000000'::uuid)))
  do update set verdict = excluded.verdict;
  return new;
end $$;
drop trigger if exists stamps_activity on public.stamps;
create trigger stamps_activity after insert or update of verdict or delete on public.stamps
  for each row execute function public.log_stamp();

create or replace function public.log_save() returns trigger
  language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.activities where actor_id = old.user_id and kind = 'save' and spot_id = old.spot_id;
    return old;
  end if;
  insert into public.activities (actor_id, kind, spot_id, created_at) values (new.user_id, 'save', new.spot_id, least(new.created_at, now()))
  on conflict (actor_id, kind, (coalesce(spot_id, '')), (coalesce(target_id, '00000000-0000-0000-0000-000000000000'::uuid))) do nothing;
  return new;
end $$;
drop trigger if exists saved_activity on public.saved_spots;
create trigger saved_activity after insert or delete on public.saved_spots
  for each row execute function public.log_save();

-- a follow: the feed line, and a note to the person followed (or asked)
create or replace function public.follow_after() returns trigger
  language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.activities where actor_id = old.follower_id and kind = 'follow' and target_id = old.followee_id;
    -- the note stays (read, for a cancelled request), so following again doesn't send another
    update public.notifications set read_at = coalesce(read_at, now())
      where user_id = old.followee_id and actor_id = old.follower_id and kind = 'request';
    return old;
  end if;
  if new.status = 'accepted' and (tg_op = 'INSERT' or old.status = 'pending') then
    insert into public.activities (actor_id, kind, target_id) values (new.follower_id, 'follow', new.followee_id)
    on conflict (actor_id, kind, (coalesce(spot_id, '')), (coalesce(target_id, '00000000-0000-0000-0000-000000000000'::uuid))) do nothing;
  end if;
  if tg_op = 'INSERT' then
    if not exists (select 1 from public.notifications where user_id = new.followee_id and actor_id = new.follower_id
                   and kind in ('follow', 'request') and created_at > now() - interval '30 days') then
      perform public.notify(new.followee_id, new.follower_id, case when new.status = 'pending' then 'request' else 'follow' end, null, null, null, null);
    end if;
  elsif old.status = 'pending' and new.status = 'accepted' then
    delete from public.notifications where user_id = new.followee_id and actor_id = new.follower_id and kind = 'request';
    perform public.notify(new.follower_id, new.followee_id, 'accepted', null, null, null, null);
  end if;
  return new;
end $$;
drop trigger if exists follows_after on public.follows;
create trigger follows_after after insert or update or delete on public.follows
  for each row execute function public.follow_after();

-- what happened before the feed existed (safe to run again: each thing is logged once)
insert into public.activities (actor_id, kind, spot_id, review_id, created_at)
  select user_id, 'review', spot_id, id, created_at from public.reviews on conflict do nothing;
insert into public.activities (actor_id, kind, spot_id, verdict, created_at)
  select user_id, 'been', spot_id, verdict, least(stamped_at, now()) from public.stamps on conflict do nothing;
insert into public.activities (actor_id, kind, spot_id, created_at)
  select user_id, 'save', spot_id, least(created_at, now()) from public.saved_spots on conflict do nothing;

-- a reaction tells the writer once, ever (so taking it back and again can't spam them)
create or replace function public.reaction_after() returns trigger
  language plpgsql security definer set search_path = public
as $$
declare
  author uuid;
  sp text;
begin
  select user_id, spot_id into author, sp from public.reviews where id = new.review_id;
  if not exists (select 1 from public.notifications where user_id = author and actor_id = new.user_id and kind = 'reaction' and review_id = new.review_id and detail = new.kind) then
    perform public.notify(author, new.user_id, 'reaction', new.review_id, null, sp, new.kind);
  end if;
  return new;
end $$;
drop trigger if exists review_votes_after on public.review_votes;
create trigger review_votes_after after insert on public.review_votes
  for each row execute function public.reaction_after();

-- a comment tells the review's writer, the person replied to, and up to two people @named
create or replace function public.comment_after() returns trigger
  language plpgsql security definer set search_path = public
as $$
declare
  author uuid;
  sp text;
  pauthor uuid;
  h text;
  who uuid;
  told uuid[] := array[new.user_id];
begin
  select user_id, spot_id into author, sp from public.reviews where id = new.review_id;
  if new.parent_id is not null then
    pauthor := coalesce(new.reply_to, (select user_id from public.review_comments where id = new.parent_id));
    if pauthor is not null and not pauthor = any (told) then
      perform public.notify(pauthor, new.user_id, 'reply', new.review_id, new.id, sp, left(new.body, 140));
      told := told || pauthor;
    end if;
  end if;
  if author is not null and not author = any (told) then
    perform public.notify(author, new.user_id, 'comment', new.review_id, new.id, sp, left(new.body, 140));
    told := told || author;
  end if;
  for h in select distinct lower(m[1]) from regexp_matches(new.body, '@([A-Za-z][A-Za-z0-9_]{2,19})', 'g') as m limit 2 loop
    select id into who from public.members where handle = h;
    if who is not null and not who = any (told) then
      perform public.notify(who, new.user_id, 'mention', new.review_id, new.id, sp, left(new.body, 140));
      told := told || who;
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists review_comments_after on public.review_comments;
create trigger review_comments_after after insert on public.review_comments
  for each row execute function public.comment_after();

-- ---------- What the app reads (security definer: each one applies the privacy rules itself) ----------

-- The feed, newest first, 40 at a time. "following": people I follow; "everyone": the latest reviews
create or replace function public.feed(scope text default 'following', before_at timestamptz default null, before_id bigint default null, lim int default 40)
returns table (
  id bigint, kind text, spot_id text, review_id uuid, verdict text, created_at timestamptz,
  actor_id uuid, actor_handle text, actor_name text, actor_avatar text, actor_role text,
  target_id uuid, target_handle text, target_name text
)
language sql stable security definer set search_path = public
as $$
  select a.id, a.kind, a.spot_id, a.review_id, a.verdict, a.created_at,
         a.actor_id, am.handle, am.display_name, am.avatar_url, am.role,
         a.target_id, tm.handle, tm.display_name
  from public.activities a
  join public.members am on am.id = a.actor_id
  left join public.members tm on tm.id = a.target_id
  left join public.reviews r on r.id = a.review_id
  where (before_at is null or (a.created_at, a.id) < (before_at, coalesce(before_id, 9223372036854775807)))
    and case when scope = 'everyone'
          then a.kind = 'review' and public.can_view(a.actor_id)
          else exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.followee_id = a.actor_id and f.status = 'accepted')
        end
    and (a.kind <> 'review' or r.status = 'live')
    and (a.kind <> 'been' or am.share_visits)
    and (a.kind <> 'save' or am.share_saved)
    and (a.target_id is null or (tm.id is not null and not public.blocked_with(a.target_id)))
    and not exists (select 1 from public.mutes mu where mu.muter_id = (select auth.uid()) and mu.muted_id = a.actor_id)
    and not public.blocked_with(a.actor_id)
  order by a.created_at desc, a.id desc
  limit least(greatest(lim, 1), 100)
$$;
grant execute on function public.feed(text, timestamptz, bigint, int) to anon, authenticated;

-- "You agree on 7 of 9 places you've both been": scores within a point count as agreeing
create or replace function public.taste_match(target uuid) returns jsonb
  language sql stable security definer set search_path = public
as $$
  with st as (select user_id, spot_id, verdict from public.stamps
              where user_id = (select auth.uid()) or (user_id = target and (select m.share_visits from public.members m where m.id = target))),
  rv as (select user_id, spot_id, rating from public.reviews where status = 'live' and user_id in ((select auth.uid()), target)),
  scores as (
    select coalesce(st.user_id, rv.user_id) as user_id, coalesce(st.spot_id, rv.spot_id) as spot_id,
           coalesce(rv.rating::numeric, case st.verdict when 'loved' then 5 when 'liked' then 3.5 when 'meh' then 2 end) as score
    from st full join rv on rv.user_id = st.user_id and rv.spot_id = st.spot_id
  ),
  both_ as (
    select a.score as mine, b.score as theirs from scores a join scores b on a.spot_id = b.spot_id
    where a.user_id = (select auth.uid()) and b.user_id = target and a.score is not null and b.score is not null
  )
  select case when (select auth.uid()) is null or (select auth.uid()) = target or not public.can_view(target) then null
              else jsonb_build_object('common', (select count(*) from both_), 'agree', (select count(*) from both_ where abs(mine - theirs) <= 1)) end
$$;
grant execute on function public.taste_match(uuid) to authenticated;

-- One member's page: who they are, the counts, how we're connected. Null if there's no such member (or they blocked me).
create or replace function public.member_page(h text) returns jsonb
  language plpgsql stable security definer set search_path = public
as $$
declare
  m public.members;
  me uuid := auth.uid();
  i_blocked boolean;
  ok boolean;
begin
  select * into m from public.members where handle = lower(btrim(h));
  if not found then
    select mm.* into m from public.handle_history x join public.members mm on mm.id = x.user_id
      where x.handle = lower(btrim(h)) and x.released_at > now() - interval '90 days';
    if not found then return null; end if;
  end if;
  i_blocked := exists (select 1 from public.blocks where blocker_id = me and blocked_id = m.id);
  if not i_blocked and public.blocked_with(m.id) then return null; end if;
  ok := not i_blocked and public.can_view(m.id);
  return jsonb_build_object(
    'member', jsonb_build_object('id', m.id, 'handle', m.handle, 'name', m.display_name, 'bio', m.bio, 'avatar', m.avatar_url,
      'role', m.role, 'private', m.is_private, 'top', case when ok then to_jsonb(m.top_spots) else '[]'::jsonb end, 'since', m.created_at,
      'comments', m.comments),
    'visible', ok,
    'stats', jsonb_build_object(
      'following', (select count(*) from public.follows where follower_id = m.id and status = 'accepted'),
      'followers', (select count(*) from public.follows where followee_id = m.id and status = 'accepted'),
      'reviews', (select count(*) from public.reviews where user_id = m.id and status = 'live'),
      'been', case when ok and (me = m.id or m.share_visits) then (select count(*) from public.stamps where user_id = m.id) end),
    'rel', case when me is null or me = m.id then null else jsonb_build_object(
      'following', coalesce((select status from public.follows where follower_id = me and followee_id = m.id), 'none'),
      'followsMe', exists (select 1 from public.follows where follower_id = m.id and followee_id = me and status = 'accepted'),
      'muted', exists (select 1 from public.mutes where muter_id = me and muted_id = m.id),
      'blocked', i_blocked) end,
    'match', case when ok then public.taste_match(m.id) end
  );
end $$;
grant execute on function public.member_page(text) to anon, authenticated;

-- Every place on someone's page: been (with how it went, the day only), reviewed, want to go
create or replace function public.member_places(target uuid)
returns table (spot_id text, verdict text, rating smallint, review_id uuid, been_on date, saved boolean, saved_on date)
language sql stable security definer set search_path = public
as $$
  with s as (select st.spot_id, st.verdict, st.stamped_at::date as been_on from public.stamps st
             where st.user_id = target and (target = (select auth.uid()) or (select m.share_visits from public.members m where m.id = target))),
  r as (select rv.spot_id, rv.rating, rv.id as review_id, coalesce(rv.visited_on, rv.created_at::date) as on_date
        from public.reviews rv where rv.user_id = target and rv.status = 'live'),
  w as (select sv.spot_id, sv.created_at::date as saved_on from public.saved_spots sv
        where sv.user_id = target and (target = (select auth.uid()) or (select m.share_saved from public.members m where m.id = target)))
  select spot_id, s.verdict, r.rating, r.review_id, coalesce(s.been_on, r.on_date), w.spot_id is not null, w.saved_on
  from s full join r using (spot_id) full join w using (spot_id)
  where public.can_view(target)
$$;
grant execute on function public.member_places(uuid) to anon, authenticated;

-- People on someone's page: who they follow, or who follows them
create or replace function public.network(target uuid, which text)
returns table (id uuid, handle text, display_name text, avatar_url text, role text, is_private boolean, i_follow text, follows_me boolean)
language sql stable security definer set search_path = public
as $$
  select m.id, m.handle, m.display_name, m.avatar_url, m.role, m.is_private,
         coalesce((select f2.status from public.follows f2 where f2.follower_id = (select auth.uid()) and f2.followee_id = m.id), 'none'),
         exists (select 1 from public.follows f3 where f3.follower_id = m.id and f3.followee_id = (select auth.uid()) and f3.status = 'accepted')
  from public.follows f
  join public.members m on m.id = case when which = 'followers' then f.follower_id else f.followee_id end
  where (case when which = 'followers' then f.followee_id else f.follower_id end) = target
    and f.status = 'accepted' and public.can_view(target) and public.can_view(m.id)
  order by f.created_at desc
  limit 500
$$;
grant execute on function public.network(uuid, text) to anon, authenticated;

-- Find people: exact @name first, then people I follow, people who follow me, then close matches
create or replace function public.search_members(q text, lim int default 20)
returns table (id uuid, handle text, display_name text, avatar_url text, role text, is_private boolean, bio text, i_follow text, follows_me boolean, reviews bigint)
language sql stable security definer set search_path = public, extensions
as $$
  with t as (select left(lower(btrim(regexp_replace(coalesce(q, ''), '^@', ''))), 40) as q),
  hits as (
    select m.*,
      coalesce((select f.status from public.follows f where f.follower_id = (select auth.uid()) and f.followee_id = m.id), 'none') as i_follow,
      exists (select 1 from public.follows f where f.follower_id = m.id and f.followee_id = (select auth.uid()) and f.status = 'accepted') as follows_me,
      greatest(similarity(t.q, m.handle), word_similarity(t.q, lower(m.display_name))) as sim,
      m.handle = t.q as exact
    from public.members m, t
    where char_length(t.q) >= 2
      and m.id is distinct from (select auth.uid())
      and (m.in_search or exists (select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.followee_id = m.id))
      and not public.blocked_with(m.id)
      and (position(t.q in m.handle) = 1 or position(t.q in lower(m.display_name)) > 0
           or similarity(t.q, m.handle) > 0.3 or word_similarity(t.q, lower(m.display_name)) > 0.4)
  )
  select h.id, h.handle, h.display_name, h.avatar_url, h.role, h.is_private, h.bio, h.i_follow, h.follows_me,
         (select count(*) from public.reviews r where r.user_id = h.id and r.status = 'live')
  from hits h
  order by h.exact desc, (h.i_follow <> 'none') desc, h.follows_me desc, h.sim desc, h.handle
  limit least(greatest(lim, 1), 50)
$$;
grant execute on function public.search_members(text, int) to anon, authenticated;

-- People to follow, with the reason: follows you, followed by people you follow, a local editor, writes a lot
create or replace function public.suggested_members(lim int default 12)
returns table (id uuid, handle text, display_name text, avatar_url text, role text, is_private boolean, bio text, reason text, reviews bigint)
language sql stable security definer set search_path = public
as $$
  with me as (select (select auth.uid()) as id),
  mine as (select followee_id from public.follows, me where follower_id = me.id),
  cand as (
    select f.follower_id as id, 1 as rank, 'Follows you' as reason, 0 as n
      from public.follows f, me where f.followee_id = me.id and f.status = 'accepted'
    union all
    select f2.followee_id, 2, 'Followed by ' || min(m1.display_name) || case when count(*) > 1 then ' and ' || (count(*) - 1) || ' more you follow' else '' end, count(*)::int
      from public.follows f1 join public.follows f2 on f2.follower_id = f1.followee_id and f2.status = 'accepted'
      join public.members m1 on m1.id = f1.followee_id, me
      where f1.follower_id = me.id and f1.status = 'accepted'
      group by f2.followee_id
    union all
    select m.id, 3, 'Local editor', 0 from public.members m where m.role = 'editor'
    union all
    select r.user_id, 4, case when count(*) = 1 then '1 review' else count(*) || ' reviews' end, count(*)::int from public.reviews r where r.status = 'live' group by r.user_id
  ),
  best as (
    select distinct on (c.id) c.id, c.rank, c.reason, c.n from cand c, me
    where c.id is distinct from me.id and c.id not in (select followee_id from mine)
    order by c.id, c.rank, c.n desc
  )
  select m.id, m.handle, m.display_name, m.avatar_url, m.role, m.is_private, m.bio, b.reason,
         (select count(*) from public.reviews r where r.user_id = m.id and r.status = 'live')
  from best b join public.members m on m.id = b.id
  where m.in_search and not public.blocked_with(m.id)
  order by b.rank, b.n desc, m.created_at
  limit least(greatest(lim, 1), 30)
$$;
grant execute on function public.suggested_members(int) to anon, authenticated;

-- On a place's page: the people I follow who've been, reviewed it or want to go
create or replace function public.friends_at(spot_ids text[])
returns table (user_id uuid, handle text, display_name text, avatar_url text, spot_id text, rating smallint, verdict text, review_id uuid, saved boolean)
language sql stable security definer set search_path = public
as $$
  with f as (
    select m.* from public.follows fo join public.members m on m.id = fo.followee_id
    where fo.follower_id = (select auth.uid()) and fo.status = 'accepted' and not public.blocked_with(m.id)
  )
  select f.id, f.handle, f.display_name, f.avatar_url, x.spot_id, max(x.rating)::smallint, max(x.verdict), (array_agg(x.review_id) filter (where x.review_id is not null))[1], bool_or(x.saved)
  from f join (
    select st.user_id, st.spot_id, null::smallint as rating, st.verdict, null::uuid as review_id, false as saved, 's' as src from public.stamps st where st.spot_id = any (spot_ids)
    union all
    select rv.user_id, rv.spot_id, rv.rating, null, rv.id, false, 'r' from public.reviews rv where rv.spot_id = any (spot_ids) and rv.status = 'live'
    union all
    select sv.user_id, sv.spot_id, null, null, null, true, 'w' from public.saved_spots sv where sv.spot_id = any (spot_ids)
  ) x on x.user_id = f.id
  where (x.src <> 's' or f.share_visits) and (x.src <> 'w' or f.share_saved)
  group by f.id, f.handle, f.display_name, f.avatar_url, x.spot_id
$$;
grant execute on function public.friends_at(text[]) to authenticated;

-- Requests waiting on me
create or replace function public.my_requests()
returns table (id uuid, handle text, display_name text, avatar_url text, requested_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select m.id, m.handle, m.display_name, m.avatar_url, f.created_at
  from public.follows f join public.members m on m.id = f.follower_id
  where f.followee_id = (select auth.uid()) and f.status = 'pending'
  order by f.created_at desc
$$;
grant execute on function public.my_requests() to authenticated;

-- People I blocked (a block hides them from members, so settings reads them here to offer Unblock)
create or replace function public.my_blocked()
returns table (id uuid, handle text, display_name text, avatar_url text, blocked_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select m.id, m.handle, m.display_name, m.avatar_url, b.created_at
  from public.blocks b join public.members m on m.id = b.blocked_id
  where b.blocker_id = (select auth.uid())
  order by b.created_at desc
$$;
grant execute on function public.my_blocked() to authenticated;

-- My notifications with who did it
create or replace function public.my_notifications(lim int default 60)
returns table (id bigint, kind text, review_id uuid, comment_id uuid, spot_id text, detail text, created_at timestamptz, read_at timestamptz,
               actor_id uuid, actor_handle text, actor_name text, actor_avatar text)
language sql stable security definer set search_path = public
as $$
  select n.id, n.kind, n.review_id, n.comment_id, n.spot_id, n.detail, n.created_at, n.read_at,
         n.actor_id, m.handle, m.display_name, m.avatar_url
  from public.notifications n left join public.members m on m.id = n.actor_id
  where n.user_id = (select auth.uid())
  order by n.created_at desc
  limit least(greatest(lim, 1), 200)
$$;
grant execute on function public.my_notifications(int) to authenticated;

-- "I sent you a gift card": a note to a friend (you follow each other), at most 10 a day
create or replace function public.send_gift_note(to_member uuid, spot text, note text) returns void
  language plpgsql volatile security definer set search_path = public
as $$
declare
  n int;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if not exists (
    select 1 from public.follows a join public.follows b on b.follower_id = a.followee_id and b.followee_id = a.follower_id
    where a.follower_id = auth.uid() and a.followee_id = to_member and a.status = 'accepted' and b.status = 'accepted'
  ) then
    raise exception 'Gift notes go to friends: people you follow who follow you back.';
  end if;
  select count(*) into n from public.notifications where actor_id = auth.uid() and kind = 'gift' and created_at > now() - interval '1 day';
  if n >= 10 then raise exception 'That''s plenty of gift notes for today.'; end if;
  perform public.notify(to_member, auth.uid(), 'gift', null, null, left(spot, 80),
    nullif(left(btrim(regexp_replace(coalesce(note, ''), '\s+', ' ', 'g')), 200), ''));
end $$;
revoke all on function public.send_gift_note(uuid, text, text) from public, anon;
grant execute on function public.send_gift_note(uuid, text, text) to authenticated;

-- Gift card link-outs: which place, which seller, from where on the site. No who; it's for telling restaurants what we send them.
create table if not exists public.gift_clicks (
  id bigint generated always as identity primary key,
  spot_id text not null check (char_length(spot_id) between 1 and 80),
  via text check (char_length(via) <= 40),
  surface text check (char_length(surface) <= 40),
  created_at timestamptz not null default now()
);
alter table public.gift_clicks enable row level security;
drop policy if exists "anyone logs a gift click" on public.gift_clicks;
create policy "anyone logs a gift click" on public.gift_clicks for insert with check (true);

-- ---------- The iPhone app's push notifications ----------
-- One row per phone: the address Apple gave the app, and whose account is signed in on it.
-- app/api/push sends to these when a note lands (Database → Webhooks, see README → iPhone app).
create table if not exists public.push_tokens (
  token text primary key check (token ~ '^[0-9a-f]{32,}$' and char_length(token) <= 400),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null default 'ios' check (platform in ('ios')),
  env text not null default 'production' check (env in ('production', 'sandbox')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_user_idx on public.push_tokens (user_id);
alter table public.push_tokens enable row level security;
drop policy if exists "members see their phones" on public.push_tokens;
create policy "members see their phones" on public.push_tokens for select using ((select auth.uid()) = user_id);
drop policy if exists "members drop their phones" on public.push_tokens;
create policy "members drop their phones" on public.push_tokens for delete using ((select auth.uid()) = user_id);

-- the app saves its address here; a phone someone else signed out of moves to whoever is signed in now
create or replace function public.save_push_token(t text) returns void
  language plpgsql security definer set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Sign in first.'; end if;
  insert into public.push_tokens (token, user_id) values (lower(t), uid)
  on conflict (token) do update set user_id = uid, updated_at = now();
  -- a phone keeps a handful of old addresses at most
  delete from public.push_tokens where user_id = uid and token not in
    (select token from public.push_tokens where user_id = uid order by updated_at desc limit 5);
end $$;
revoke all on function public.save_push_token(text) from public, anon;
grant execute on function public.save_push_token(text) to authenticated;

-- each note is pushed at most once (app/api/push claims it by setting this)
alter table public.notifications add column if not exists pushed_at timestamptz;

-- internal helpers stay internal
revoke all on function public.new_handle(text) from public, anon, authenticated;
revoke all on function public.handle_ok(text, uuid) from public, anon, authenticated;

-- Review rules that need the staff check above (kept here so a fresh database sets up in one run)
-- everyone sees live reviews; a writer also sees their own while it's held
drop policy if exists "reviews are public" on public.reviews;
create policy "reviews are public" on public.reviews for select using (
  ((status = 'live' and not public.blocked_with(user_id)) or (select auth.uid()) = user_id or public.is_admin())
);
drop policy if exists "staff moderate reviews" on public.reviews;
create policy "staff moderate reviews" on public.reviews for update using (public.is_admin());
drop policy if exists "staff read reports" on public.review_reports;
create policy "staff read reports" on public.review_reports for select using (auth.uid() = user_id or public.is_admin());
drop policy if exists "staff moderate comments" on public.review_comments;
create policy "staff moderate comments" on public.review_comments for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "staff read comment reports" on public.comment_reports;
create policy "staff read comment reports" on public.comment_reports for select using ((select auth.uid()) = user_id or public.is_admin());
drop policy if exists "staff read member reports" on public.member_reports;
create policy "staff read member reports" on public.member_reports for select using ((select auth.uid()) = user_id or public.is_admin());
drop policy if exists "staff read gift clicks" on public.gift_clicks;
create policy "staff read gift clicks" on public.gift_clicks for select using (public.is_admin());

commit;
