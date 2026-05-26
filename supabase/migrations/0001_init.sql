-- Ledgenator initial schema
-- Tables: profiles, brokers, assets, operations, funding_events, price_cache
-- All user-scoped tables enforce RLS via auth.uid()

create extension if not exists "pgcrypto";

-- =========================================================================
-- enums
-- =========================================================================
do $$ begin
  create type currency_code as enum ('BRL', 'USD');
exception when duplicate_object then null; end $$;

do $$ begin
  create type asset_type as enum ('STOCK', 'ETF', 'FII', 'REIT', 'CRYPTO', 'BOND', 'OTHER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type market_code as enum ('B3', 'NASDAQ', 'NYSE', 'CRYPTO', 'OTHER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type operation_side as enum ('BUY', 'SELL');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ui_locale as enum ('pt-BR', 'en');
exception when duplicate_object then null; end $$;

-- =========================================================================
-- profiles (1:1 with auth.users)
-- =========================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  preferred_locale ui_locale not null default 'pt-BR',
  base_currency currency_code not null default 'BRL',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_self_upsert" on public.profiles;
create policy "profiles_self_upsert" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- brokers
-- =========================================================================
create table if not exists public.brokers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  currency currency_code not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, name, currency)
);

create index if not exists brokers_user_idx on public.brokers(user_id);

alter table public.brokers enable row level security;

drop policy if exists "brokers_owner_all" on public.brokers;
create policy "brokers_owner_all" on public.brokers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================================
-- assets (shared catalog)
-- =========================================================================
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  asset_type asset_type not null,
  market market_code not null,
  currency currency_code not null,
  display_name text,
  created_at timestamptz not null default now(),
  unique (ticker, market)
);

create index if not exists assets_ticker_idx on public.assets (lower(ticker));

alter table public.assets enable row level security;

drop policy if exists "assets_auth_read" on public.assets;
create policy "assets_auth_read" on public.assets
  for select using (auth.role() = 'authenticated');

drop policy if exists "assets_auth_insert" on public.assets;
create policy "assets_auth_insert" on public.assets
  for insert with check (auth.role() = 'authenticated');

-- =========================================================================
-- operations
-- =========================================================================
create table if not exists public.operations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  broker_id uuid not null references public.brokers(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete restrict,
  side operation_side not null,
  op_date date not null,
  units numeric(20, 8) not null check (units > 0),
  unit_price numeric(20, 8) not null check (unit_price >= 0),
  total_price numeric(20, 2) generated always as (round((units * unit_price)::numeric, 2)) stored,
  fees numeric(20, 2) not null default 0,
  currency currency_code not null,
  created_at timestamptz not null default now()
);

create index if not exists operations_user_date_idx on public.operations(user_id, op_date desc);
create index if not exists operations_broker_idx on public.operations(broker_id);
create index if not exists operations_asset_idx on public.operations(asset_id);

alter table public.operations enable row level security;

drop policy if exists "operations_owner_all" on public.operations;
create policy "operations_owner_all" on public.operations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================================
-- funding_events
-- =========================================================================
create table if not exists public.funding_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  broker_id uuid not null references public.brokers(id) on delete cascade,
  event_date date not null,
  amount numeric(20, 2) not null check (amount > 0),
  source_amount_brl numeric(20, 2),
  exchange_rate numeric(20, 8),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists funding_user_date_idx on public.funding_events(user_id, event_date desc);
create index if not exists funding_broker_idx on public.funding_events(broker_id);

alter table public.funding_events enable row level security;

drop policy if exists "funding_owner_all" on public.funding_events;
create policy "funding_owner_all" on public.funding_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- enforce conversion bookkeeping when broker is USD
create or replace function public.handle_funding_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  broker_currency currency_code;
begin
  select currency into broker_currency from public.brokers where id = new.broker_id;

  if broker_currency = 'USD' then
    if new.exchange_rate is null and new.source_amount_brl is null then
      raise exception 'For USD brokers, either source_amount_brl or exchange_rate must be provided';
    end if;
    if new.exchange_rate is not null and new.source_amount_brl is null then
      new.source_amount_brl := round((new.amount * new.exchange_rate)::numeric, 2);
    elsif new.source_amount_brl is not null and new.exchange_rate is null then
      new.exchange_rate := round((new.source_amount_brl / new.amount)::numeric, 8);
    end if;
  else
    new.source_amount_brl := null;
    new.exchange_rate := null;
  end if;

  return new;
end;
$$;

drop trigger if exists on_funding_insert on public.funding_events;
create trigger on_funding_insert
  before insert or update on public.funding_events
  for each row execute function public.handle_funding_event();

-- =========================================================================
-- price_cache (shared)
-- =========================================================================
create table if not exists public.price_cache (
  asset_id uuid primary key references public.assets(id) on delete cascade,
  price numeric(20, 8) not null,
  currency currency_code not null,
  fetched_at timestamptz not null default now()
);

alter table public.price_cache enable row level security;

drop policy if exists "price_cache_auth_read" on public.price_cache;
create policy "price_cache_auth_read" on public.price_cache
  for select using (auth.role() = 'authenticated');

-- writes only via service role / edge function (no policy = denied)

-- =========================================================================
-- Lock down SECURITY DEFINER trigger functions (no direct RPC access)
-- =========================================================================
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_funding_event() from public, anon, authenticated;
