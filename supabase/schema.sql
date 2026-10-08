-- The Local — Supabase schema
-- Run in Supabase → SQL Editor. Then set NEXT_PUBLIC_SUPABASE_URL and
-- NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel. Without them the site runs in
-- on-device demo mode.

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
create policy "reviews are public" on public.reviews for select using (true);
create policy "members write their own reviews" on public.reviews for insert with check (auth.uid() = user_id);
create policy "members edit their own reviews" on public.reviews for update using (auth.uid() = user_id);
create policy "members delete their own reviews" on public.reviews for delete using (auth.uid() = user_id);

create or replace view public.spot_ratings as
  select spot_id, round(avg(rating)::numeric, 2) as avg_rating, count(*) as review_count
  from public.reviews group by spot_id;
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
create policy "approved photos are public" on public.photos for select using (approved or auth.uid() = user_id);
create policy "members add photos" on public.photos for insert with check (auth.uid() = user_id);
create policy "members delete their photos" on public.photos for delete using (auth.uid() = user_id);

-- Storage bucket for uploads (public read; members write into their own folder)
insert into storage.buckets (id, name, public) values ('spot-photos', 'spot-photos', true)
  on conflict (id) do nothing;
create policy "public read spot photos" on storage.objects for select using (bucket_id = 'spot-photos');
create policy "members upload to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'spot-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "members delete own uploads" on storage.objects for delete to authenticated
  using (bucket_id = 'spot-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Growth & revenue ----------
create table if not exists public.subscribers (
  email text primary key check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at timestamptz not null default now()
);
alter table public.subscribers enable row level security;
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
create policy "members see their own submissions; staff see all" on public.submissions
  for select using (auth.uid() = submitted_by or public.is_admin());
-- members can submit (pending only), max 10 waiting at a time
create policy "members submit spots" on public.submissions for insert with check (
  auth.uid() = submitted_by and status = 'pending'
  and (select count(*) from public.submissions s where s.submitted_by = auth.uid() and s.status = 'pending') < 10
);
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
create policy "live spots are public" on public.spots for select using (status = 'live' or public.is_admin());
create policy "staff publish spots" on public.spots for insert with check (public.is_admin());
create policy "staff edit spots" on public.spots for update using (public.is_admin());

-- staff attach a submitter's storefront photo when approving
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
create policy "anyone can join the waitlist" on public.waitlist for insert with check (true);
