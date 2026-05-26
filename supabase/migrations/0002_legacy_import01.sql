-- Migration A: reshape brokers/operations/funding_events for cleaner multi-currency
-- broker model + transfers; then re-seed reference data.
--
-- IMPORTANT: before re-applying, run the manual cleanup documented in the PR
-- description (deletes imported rows from operations/funding_events/brokers/assets
-- and clears schema_migrations entries for 0002-0004). The DELETEs below are
-- defensive: safe to re-run against an empty table.

-- =========================================================================
-- 0. defensive data wipe (safe on empty tables; preserves auth.users + profiles)
-- =========================================================================
delete from public.operations;
delete from public.funding_events;
delete from public.brokers;
delete from public.assets;

-- =========================================================================
-- 1. drop dependents that reference brokers.user_id / brokers.currency
-- =========================================================================
drop policy if exists "brokers_owner_all" on public.brokers;
drop trigger if exists on_funding_insert on public.funding_events;

alter table public.brokers drop constraint if exists brokers_user_id_name_currency_key;
drop index if exists brokers_user_idx;

-- =========================================================================
-- 2. brokers becomes a shared, currency-agnostic registry
-- =========================================================================
alter table public.brokers drop column if exists user_id;
alter table public.brokers drop column if exists currency;
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'brokers_name_key' and conrelid = 'public.brokers'::regclass
  ) then
    alter table public.brokers add constraint brokers_name_key unique (name);
  end if;
end $$;

drop policy if exists "brokers_auth_read" on public.brokers;
create policy "brokers_auth_read" on public.brokers
  for select using (auth.role() = 'authenticated');

drop policy if exists "brokers_auth_insert" on public.brokers;
create policy "brokers_auth_insert" on public.brokers
  for insert with check (auth.role() = 'authenticated');

-- =========================================================================
-- 3. operations: split broker into current vs. original execution venue
-- =========================================================================
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='operations' and column_name='broker_id'
  ) then
    alter table public.operations rename column broker_id to current_broker_id;
  end if;
end $$;

alter table public.operations
  add column if not exists bought_broker_id uuid references public.brokers(id) on delete set null;

alter index if exists operations_broker_idx rename to operations_current_broker_idx;
create index if not exists operations_bought_broker_idx
  on public.operations(bought_broker_id);

-- =========================================================================
-- 4. funding_events: explicit currency (no longer derived from broker)
-- =========================================================================
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='funding_events' and column_name='currency'
  ) then
    alter table public.funding_events add column currency currency_code not null default 'BRL';
    alter table public.funding_events alter column currency drop default;
  end if;
end $$;

create or replace function public.handle_funding_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.currency = 'USD' then
    if new.exchange_rate is null and new.source_amount_brl is null then
      raise exception 'For USD funding events, either source_amount_brl or exchange_rate must be provided';
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

create trigger on_funding_insert
  before insert or update on public.funding_events
  for each row execute function public.handle_funding_event();

revoke execute on function public.handle_funding_event() from public, anon, authenticated;

-- =========================================================================
-- 5. broker_transfers (first-class moves of cash between brokers)
-- =========================================================================
create table if not exists public.broker_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_broker_id uuid not null references public.brokers(id) on delete restrict,
  dest_broker_id   uuid not null references public.brokers(id) on delete restrict,
  transfer_date date not null,
  amount numeric(20, 2) not null check (amount > 0),
  currency currency_code not null,
  note text,
  created_at timestamptz not null default now(),
  check (source_broker_id <> dest_broker_id)
);

create index if not exists broker_transfers_user_date_idx
  on public.broker_transfers(user_id, transfer_date desc);
create index if not exists broker_transfers_source_idx
  on public.broker_transfers(source_broker_id);
create index if not exists broker_transfers_dest_idx
  on public.broker_transfers(dest_broker_id);

alter table public.broker_transfers enable row level security;

drop policy if exists "broker_transfers_owner_all" on public.broker_transfers;
create policy "broker_transfers_owner_all" on public.broker_transfers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================================
-- 6. seed reference data: 4 brokers, 7 assets
-- =========================================================================
insert into public.brokers (name, notes) values
  ('Inter',  'Importado de legacy.csv'),
  ('Avenue', 'Importado de legacy.csv'),
  ('XP',     'Importado de legacy.csv (XP + XP Global consolidados)'),
  ('BITSO',  'Importado de legacy.csv');

insert into public.assets (ticker, asset_type, market, currency) values
  ('AMZN', 'STOCK', 'NASDAQ', 'USD'),
  ('EMGF', 'ETF',   'NASDAQ', 'USD'),
  ('IQLT', 'ETF',   'NASDAQ', 'USD'),
  ('SPHQ', 'ETF',   'NYSE',   'USD'),
  ('TFLO', 'ETF',   'NYSE',   'USD'),
  ('TSLA', 'STOCK', 'NASDAQ', 'USD'),
  ('VT',   'ETF',   'NYSE',   'USD')
  on conflict (ticker, market) do nothing;
