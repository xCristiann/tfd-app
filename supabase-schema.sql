-- ============================================
-- TheFundedDiaries — Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- FIRMS
create table public.firms (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null unique,
  website text,
  affiliate_link text,
  discount_code text,
  founded_year integer,
  headquarters text,
  platforms text[],
  short_description text,
  admin_notes text,
  trust_score integer default 0,
  payout_reliability text default 'Unknown',
  avg_payout_days integer,
  support_quality text default 'Medium',
  years_active integer,
  delayed_payout_reports integer default 0,
  rules_clarity text default 'Clear',
  total_funded_traders text,
  payout_methods text[],
  accepts_eu boolean default true,
  markets_forex boolean default true,
  markets_futures boolean default false,
  markets_crypto boolean default false,
  markets_indices boolean default false,
  markets_metals boolean default false,
  markets_commodities boolean default false,
  is_published boolean default false,
  is_featured boolean default false,
  rules_last_verified timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- CHALLENGES
create table public.challenges (
  id uuid default gen_random_uuid() primary key,
  firm_id uuid references public.firms(id) on delete cascade,
  name text not null,
  account_size integer not null,
  price_usd numeric not null,
  profit_split text,
  phase1_target numeric,
  phase1_daily_dd numeric,
  phase1_max_dd numeric,
  phase1_min_days integer default 0,
  phase1_time_limit integer default 0,
  phase2_target numeric,
  phase2_daily_dd numeric,
  phase2_max_dd numeric,
  phase2_min_days integer default 0,
  phase2_time_limit integer default 0,
  payout_frequency text,
  min_payout integer,
  payout_methods text[],
  allows_weekend_holding boolean default true,
  allows_news_trading boolean default true,
  allows_ea boolean default true,
  allows_hedging boolean default true,
  sort_order integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- RULES
create table public.rules (
  id uuid default gen_random_uuid() primary key,
  firm_id uuid references public.firms(id) on delete cascade,
  label text not null,
  value text not null,
  value_type text default 'neutral', -- 'green', 'red', 'amber', 'neutral'
  category text default 'General Trading',
  notes text,
  sort_order integer default 0,
  created_at timestamp with time zone default now()
);

-- PROFILES (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique,
  full_name text,
  avatar_url text,
  is_admin boolean default false,
  created_at timestamp with time zone default now()
);

-- REVIEWS
create table public.reviews (
  id uuid default gen_random_uuid() primary key,
  firm_id uuid references public.firms(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  title text,
  body text not null,
  rating integer check (rating >= 1 and rating <= 5),
  status text default 'pending', -- 'pending', 'approved', 'rejected'
  created_at timestamp with time zone default now()
);

-- COMMENTS
create table public.comments (
  id uuid default gen_random_uuid() primary key,
  review_id uuid references public.reviews(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamp with time zone default now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table public.firms enable row level security;
alter table public.challenges enable row level security;
alter table public.rules enable row level security;
alter table public.profiles enable row level security;
alter table public.reviews enable row level security;
alter table public.comments enable row level security;

-- FIRMS: anyone can read published firms
create policy "Public can view published firms"
  on public.firms for select
  using (is_published = true);

create policy "Admins can do everything on firms"
  on public.firms for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- CHALLENGES: public read
create policy "Public can view challenges"
  on public.challenges for select using (true);

create policy "Admins manage challenges"
  on public.challenges for all
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- RULES: public read
create policy "Public can view rules"
  on public.rules for select using (true);

create policy "Admins manage rules"
  on public.rules for all
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- PROFILES: users see own profile
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles for select
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- REVIEWS: public see approved
create policy "Public can view approved reviews"
  on public.reviews for select using (status = 'approved');

create policy "Users can insert own reviews"
  on public.reviews for insert
  with check (auth.uid() = user_id);

create policy "Admins manage reviews"
  on public.reviews for all
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- COMMENTS: public read
create policy "Public can view comments"
  on public.comments for select using (true);

create policy "Users can insert own comments"
  on public.comments for insert
  with check (auth.uid() = user_id);

create policy "Admins manage comments"
  on public.comments for all
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- ============================================
-- TRIGGER: auto-create profile on signup
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- FUNCTION: update updated_at
-- ============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger firms_updated_at before update on public.firms
  for each row execute procedure update_updated_at();

create trigger challenges_updated_at before update on public.challenges
  for each row execute procedure update_updated_at();

-- ============================================
-- MAKE YOURSELF ADMIN
-- After signing up, run this with your user ID:
-- update public.profiles set is_admin = true where id = 'YOUR-USER-UUID';
-- ============================================
