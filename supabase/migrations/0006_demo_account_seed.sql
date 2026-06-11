-- Migration E: public demo account + sample portfolio
-- =============================================================================
-- Creates a ready-to-use, pre-confirmed demo login and populates it with a
-- realistic, FICTIONAL portfolio so anyone reading the README can sign in at
-- https://erickmobltda.github.io/ledgenator/ and explore the app with data.
--
--   Login:  demo@ledgenator.app
--   Pass:   demo1234
--
-- HOW TO APPLY (one-time, run as the project owner):
--   Supabase Dashboard -> SQL Editor -> paste this whole file -> Run.
--   (Equivalent: `supabase db push` or psql against the project DB.)
--   The SQL Editor runs with elevated privileges, so the auth.* inserts and the
--   price_cache seed below succeed (RLS is bypassed). It is IDEMPOTENT: safe to
--   re-run — it upserts the user/catalog and replaces the demo's own rows.
--
-- DATA IS FICTIONAL: brokers, assets, dates, amounts and FX rates are invented
-- for demonstration and are intentionally different from any real import.
--
-- NOTE on shared catalog: `brokers` and `assets` are global (no per-user
-- scoping in this schema), so these demo brokers/assets also appear in other
-- accounts' pickers. Demo brokers are tagged via `notes` to make that obvious.
-- =============================================================================

-- pgcrypto (crypt/gen_salt) is already enabled by 0001_init.sql; ensure anyway.
create extension if not exists "pgcrypto";

do $$
declare
  demo_id uuid := 'd3300000-0000-4000-8000-0000000000d3';
begin
  -- ==========================================================================
  -- 1. Pre-confirmed auth user (idempotent on id/email)
  -- ==========================================================================
  insert into auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  )
  select
    '00000000-0000-0000-0000-000000000000',
    demo_id,
    'authenticated',
    'authenticated',
    'demo@ledgenator.app',
    crypt('demo1234', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Demo Investor"}'::jsonb,
    now(),
    now()
  where not exists (
    select 1 from auth.users where email = 'demo@ledgenator.app' or id = demo_id
  );

  -- Email identity (GoTrue requires this for password sign-in).
  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  )
  select
    gen_random_uuid(),
    demo_id,
    demo_id::text,
    jsonb_build_object('sub', demo_id::text, 'email', 'demo@ledgenator.app', 'email_verified', true),
    'email',
    now(), now(), now()
  where not exists (
    select 1 from auth.identities where user_id = demo_id and provider = 'email'
  );

  -- Profile is auto-created by the on_auth_user_created trigger; set its fields.
  update public.profiles
     set display_name = 'Demo Investor',
         base_currency = 'BRL',
         preferred_locale = 'pt-BR'
   where id = demo_id;

  -- ==========================================================================
  -- 2. Clean any prior demo-owned rows so a re-run is clean
  -- ==========================================================================
  delete from public.operations      where user_id = demo_id;
  delete from public.funding_events   where user_id = demo_id;
  delete from public.broker_transfers where user_id = demo_id;
end $$;

-- ============================================================================
-- 3. Brokers (shared catalog) — fictional set, tagged as demo
-- ============================================================================
insert into public.brokers (name, notes) values
  ('Nomad',          'Demo account sample data'),
  ('Charles Schwab', 'Demo account sample data'),
  ('Binance',        'Demo account sample data'),
  ('Rico',           'Demo account sample data'),
  ('Clear',          'Demo account sample data')
on conflict (name) do nothing;

-- ============================================================================
-- 4. Assets (shared catalog) — multi-currency / market / type
-- ============================================================================
insert into public.assets (ticker, asset_type, market, currency, display_name) values
  ('AAPL',   'STOCK',  'NASDAQ', 'USD', 'Apple Inc.'),
  ('MSFT',   'STOCK',  'NASDAQ', 'USD', 'Microsoft Corp.'),
  ('VOO',    'ETF',    'NYSE',   'USD', 'Vanguard S&P 500 ETF'),
  ('QQQ',    'ETF',    'NASDAQ', 'USD', 'Invesco QQQ Trust'),
  ('BND',    'BOND',   'NASDAQ', 'USD', 'Vanguard Total Bond Market ETF'),
  ('PETR4',  'STOCK',  'B3',     'BRL', 'Petrobras PN'),
  ('ITUB4',  'STOCK',  'B3',     'BRL', 'Itaú Unibanco PN'),
  ('HGLG11', 'FII',    'B3',     'BRL', 'CSHG Logística FII'),
  ('BTC',    'CRYPTO', 'CRYPTO', 'USD', 'Bitcoin'),
  ('ETH',    'CRYPTO', 'CRYPTO', 'USD', 'Ethereum')
on conflict (ticker, market) do nothing;

-- Synthetic FX asset (also seeded by 0005) used to cache the live USD->BRL rate.
insert into public.assets (ticker, asset_type, market, currency, display_name) values
  ('USDBRL', 'OTHER', 'OTHER', 'BRL', 'US Dollar / Brazilian Real')
on conflict (ticker, market) do nothing;

-- ============================================================================
-- 5. Funding events
--    BRL aportes: amount only. USD câmbios: amount + exchange_rate (trigger
--    derives source_amount_brl). Dates/amounts/rates are fictional.
-- ============================================================================
with d as (select 'd3300000-0000-4000-8000-0000000000d3'::uuid as id),
     b as (select id, name from public.brokers)
insert into public.funding_events
  (user_id, broker_id, event_date, currency, amount, source_amount_brl, exchange_rate, note) values
  -- BRL deposits
  ((select id from d), (select id from b where name='Rico'),  '2021-03-15'::date, 'BRL'::currency_code, 15000.00, null, null, 'Aporte inicial'),
  ((select id from d), (select id from b where name='Rico'),  '2021-09-10'::date, 'BRL'::currency_code, 12000.00, null, null, 'Aporte mensal'),
  ((select id from d), (select id from b where name='Clear'), '2022-02-08'::date, 'BRL'::currency_code, 20000.00, null, null, 'Aporte FIIs'),
  ((select id from d), (select id from b where name='Clear'), '2023-01-20'::date, 'BRL'::currency_code, 18000.00, null, null, 'Aporte bônus'),
  ((select id from d), (select id from b where name='Rico'),  '2024-05-05'::date, 'BRL'::currency_code, 25000.00, null, null, 'Aporte 13º'),
  ((select id from d), (select id from b where name='Clear'), '2025-02-12'::date, 'BRL'::currency_code, 22000.00, null, null, 'Aporte anual'),
  -- USD exchanges (câmbios) with varied FX rates
  ((select id from d), (select id from b where name='Nomad'),          '2021-04-02'::date, 'USD'::currency_code, 2000.00, null, 5.09000000, 'Câmbio para Nomad'),
  ((select id from d), (select id from b where name='Nomad'),          '2022-06-18'::date, 'USD'::currency_code, 3000.00, null, 5.18000000, 'Câmbio aporte'),
  ((select id from d), (select id from b where name='Charles Schwab'), '2023-03-22'::date, 'USD'::currency_code, 5000.00, null, 5.04000000, 'Câmbio Schwab'),
  ((select id from d), (select id from b where name='Charles Schwab'), '2024-01-30'::date, 'USD'::currency_code, 4000.00, null, 4.92000000, 'Câmbio Schwab'),
  ((select id from d), (select id from b where name='Binance'),        '2024-07-14'::date, 'USD'::currency_code, 1500.00, null, 5.45000000, 'Câmbio cripto'),
  ((select id from d), (select id from b where name='Nomad'),          '2025-03-09'::date, 'USD'::currency_code, 3500.00, null, 5.78000000, 'Câmbio recente'),
  ((select id from d), (select id from b where name='Charles Schwab'), '2025-11-04'::date, 'USD'::currency_code, 6000.00, null, 6.05000000, 'Câmbio recente');

-- ============================================================================
-- 6. Operations (BUY/SELL). USD trades carry fx_rate_brl; BRL trades leave it
--    null. current_broker_id = where it lives now; bought_broker_id = venue.
-- ============================================================================
with d as (select 'd3300000-0000-4000-8000-0000000000d3'::uuid as id),
     b as (select id, name from public.brokers),
     a as (select id, ticker, market from public.assets)
insert into public.operations
  (user_id, current_broker_id, bought_broker_id, asset_id, side, op_date, units, unit_price, fees, currency, fx_rate_brl) values
  -- USD equities/ETFs on Nomad / Charles Schwab
  ((select id from d), (select id from b where name='Nomad'),          (select id from b where name='Nomad'),          (select id from a where ticker='VOO'  and market='NYSE'),   'BUY'::operation_side, '2021-04-05'::date,  4.00000000, 380.50000000, 0, 'USD'::currency_code, 5.10000000),
  ((select id from d), (select id from b where name='Nomad'),          (select id from b where name='Nomad'),          (select id from a where ticker='AAPL' and market='NASDAQ'), 'BUY'::operation_side, '2021-04-05'::date,  6.00000000, 132.40000000, 0, 'USD'::currency_code, 5.10000000),
  ((select id from d), (select id from b where name='Nomad'),          (select id from b where name='Nomad'),          (select id from a where ticker='QQQ'  and market='NASDAQ'), 'BUY'::operation_side, '2022-06-20'::date,  3.00000000, 290.10000000, 0, 'USD'::currency_code, 5.20000000),
  ((select id from d), (select id from b where name='Nomad'),          (select id from b where name='Nomad'),          (select id from a where ticker='MSFT' and market='NASDAQ'), 'BUY'::operation_side, '2022-06-20'::date,  5.00000000, 252.75000000, 0, 'USD'::currency_code, 5.20000000),
  ((select id from d), (select id from b where name='Charles Schwab'), (select id from b where name='Charles Schwab'), (select id from a where ticker='VOO'  and market='NYSE'),   'BUY'::operation_side, '2023-03-24'::date,  8.00000000, 365.20000000, 0, 'USD'::currency_code, 5.05000000),
  ((select id from d), (select id from b where name='Charles Schwab'), (select id from b where name='Charles Schwab'), (select id from a where ticker='BND'  and market='NASDAQ'), 'BUY'::operation_side, '2023-03-24'::date, 30.00000000,  72.10000000, 0, 'USD'::currency_code, 5.05000000),
  ((select id from d), (select id from b where name='Charles Schwab'), (select id from b where name='Charles Schwab'), (select id from a where ticker='AAPL' and market='NASDAQ'), 'BUY'::operation_side, '2024-02-01'::date,  4.00000000, 184.30000000, 0, 'USD'::currency_code, 4.95000000),
  ((select id from d), (select id from b where name='Charles Schwab'), (select id from b where name='Charles Schwab'), (select id from a where ticker='MSFT' and market='NASDAQ'), 'BUY'::operation_side, '2024-02-01'::date,  3.00000000, 403.80000000, 0, 'USD'::currency_code, 4.95000000),
  ((select id from d), (select id from b where name='Nomad'),          (select id from b where name='Nomad'),          (select id from a where ticker='QQQ'  and market='NASDAQ'), 'BUY'::operation_side, '2025-03-11'::date,  2.00000000, 470.60000000, 0, 'USD'::currency_code, 5.80000000),
  ((select id from d), (select id from b where name='Charles Schwab'), (select id from b where name='Charles Schwab'), (select id from a where ticker='VOO'  and market='NYSE'),   'BUY'::operation_side, '2025-11-06'::date,  5.00000000, 540.90000000, 0, 'USD'::currency_code, 6.05000000),
  -- A SELL to exercise realized P&L (units < held VOO)
  ((select id from d), (select id from b where name='Nomad'),          (select id from b where name='Nomad'),          (select id from a where ticker='VOO'  and market='NYSE'),   'SELL'::operation_side, '2025-12-15'::date, 2.00000000, 560.00000000, 0, 'USD'::currency_code, 6.10000000),
  -- Crypto on Binance
  ((select id from d), (select id from b where name='Binance'),        (select id from b where name='Binance'),        (select id from a where ticker='BTC'  and market='CRYPTO'), 'BUY'::operation_side, '2024-07-15'::date,  0.02000000, 58000.00000000, 0, 'USD'::currency_code, 5.45000000),
  ((select id from d), (select id from b where name='Binance'),        (select id from b where name='Binance'),        (select id from a where ticker='ETH'  and market='CRYPTO'), 'BUY'::operation_side, '2024-07-15'::date,  0.50000000,  3200.00000000, 0, 'USD'::currency_code, 5.45000000),
  ((select id from d), (select id from b where name='Binance'),        (select id from b where name='Binance'),        (select id from a where ticker='ETH'  and market='CRYPTO'), 'SELL'::operation_side, '2025-09-01'::date, 0.20000000,  4100.00000000, 0, 'USD'::currency_code, 5.50000000),
  -- BRL-native holdings on Rico / Clear (no fx_rate_brl)
  ((select id from d), (select id from b where name='Rico'),  (select id from b where name='Rico'),  (select id from a where ticker='PETR4'  and market='B3'), 'BUY'::operation_side, '2021-03-18'::date, 300.00000000,  23.45000000, 0, 'BRL'::currency_code, null),
  ((select id from d), (select id from b where name='Rico'),  (select id from b where name='Rico'),  (select id from a where ticker='ITUB4'  and market='B3'), 'BUY'::operation_side, '2021-09-12'::date, 200.00000000,  27.80000000, 0, 'BRL'::currency_code, null),
  ((select id from d), (select id from b where name='Clear'), (select id from b where name='Clear'), (select id from a where ticker='HGLG11' and market='B3'), 'BUY'::operation_side, '2022-02-10'::date,  50.00000000, 170.20000000, 0, 'BRL'::currency_code, null),
  ((select id from d), (select id from b where name='Rico'),  (select id from b where name='Rico'),  (select id from a where ticker='PETR4'  and market='B3'), 'BUY'::operation_side, '2024-05-08'::date, 250.00000000,  37.60000000, 0, 'BRL'::currency_code, null),
  ((select id from d), (select id from b where name='Clear'), (select id from b where name='Clear'), (select id from a where ticker='HGLG11' and market='B3'), 'BUY'::operation_side, '2025-02-14'::date,  40.00000000, 162.90000000, 0, 'BRL'::currency_code, null),
  ((select id from d), (select id from b where name='Rico'),  (select id from b where name='Rico'),  (select id from a where ticker='ITUB4'  and market='B3'), 'SELL'::operation_side, '2025-10-03'::date, 100.00000000, 34.10000000, 0, 'BRL'::currency_code, null);

-- ============================================================================
-- 7. Broker transfers (cash moves between brokers)
-- ============================================================================
with d as (select 'd3300000-0000-4000-8000-0000000000d3'::uuid as id),
     b as (select id, name from public.brokers)
insert into public.broker_transfers
  (user_id, source_broker_id, dest_broker_id, transfer_date, amount, currency, note) values
  ((select id from d), (select id from b where name='Nomad'), (select id from b where name='Charles Schwab'),
   '2023-03-21'::date, 1800.00, 'USD'::currency_code, 'Consolidação para Schwab'),
  ((select id from d), (select id from b where name='Rico'),  (select id from b where name='Clear'),
   '2022-02-05'::date, 5000.00, 'BRL'::currency_code, 'Transferência para FIIs');

-- ============================================================================
-- 8. price_cache — seed current prices so the dashboard shows P&L on first
--    load (refresh-prices edge function overwrites these later). FX ~5.4.
-- ============================================================================
insert into public.price_cache (asset_id, price, currency, fetched_at)
select a.id, v.price, v.currency::currency_code, now()
from (values
  ('AAPL',   'NASDAQ', 232.00::numeric,    'USD'),
  ('MSFT',   'NASDAQ', 470.00::numeric,    'USD'),
  ('VOO',    'NYSE',   565.00::numeric,    'USD'),
  ('QQQ',    'NASDAQ', 495.00::numeric,    'USD'),
  ('BND',    'NASDAQ',  74.50::numeric,    'USD'),
  ('PETR4',  'B3',      39.20::numeric,    'BRL'),
  ('ITUB4',  'B3',      35.40::numeric,    'BRL'),
  ('HGLG11', 'B3',     166.00::numeric,    'BRL'),
  ('BTC',    'CRYPTO', 95000.00::numeric,  'USD'),
  ('ETH',    'CRYPTO',  3600.00::numeric,  'USD'),
  ('USDBRL', 'OTHER',     5.40::numeric,   'BRL')
) as v(ticker, market, price, currency)
join public.assets a on a.ticker = v.ticker and a.market = v.market::market_code
on conflict (asset_id) do update
  set price = excluded.price, currency = excluded.currency, fetched_at = excluded.fetched_at;

-- ============================================================================
-- Verification (run after applying):
--   select email, email_confirmed_at from auth.users where email='demo@ledgenator.app';
--   select count(*) from public.operations    where user_id='d3300000-0000-4000-8000-0000000000d3';  -- 21
--   select count(*) from public.funding_events where user_id='d3300000-0000-4000-8000-0000000000d3';  -- 13
--   select count(*) from public.broker_transfers where user_id='d3300000-0000-4000-8000-0000000000d3'; -- 2
-- ============================================================================
