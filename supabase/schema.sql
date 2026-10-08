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
