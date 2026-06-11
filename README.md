# Ledgenator

Personal investment tracker across multiple brokers (stocks, ETFs, FIIs, crypto, …) with BRL/USD bookkeeping and an animated dashboard. Built with **Vite + React + TypeScript + Supabase + Tailwind + Recharts**.

- **Languages:** pt-BR (primary), en
- **Mobile-first:** designed for iPhone 16 Pro Safari (safe-area insets, bottom tab nav, 44 px touch targets)

## Live demo

Try it without signing up: **https://erickmobltda.github.io/ledgenator/**

| | |
|---|---|
| **Email** | `demo@ledgenator.app` |
| **Password** | `demo1234` |

Or just click **“Try the demo”** on the login page — it logs you in with the
credentials above. The demo account comes pre-loaded with multiple brokers,
multi-currency assets (BRL/USD), funding events, exchange rates, and a few years
of buy/sell operations so the dashboard, charts, and reports all have data.

> It's a **shared sandbox** account: anyone can sign in, so data may have been
> changed by other visitors. To reset it to the original sample data, re-apply
> the seed (see [Seeding the demo account](#seeding-the-demo-account)).

## Quick start

```bash
npm install
cp .env.example .env.local   # already provisioned — see below if you need new keys
npm run dev                  # http://localhost:5173
```

The Supabase project for this app is already provisioned, the schema is applied, and the `refresh-prices` edge function is deployed. Sign up with any email on the login page to create your account.

## Environment variables

All env vars live in `.env.local` (Vite only exposes vars prefixed with `VITE_` to the browser).

| Variable | Where to get it | Required |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase Dashboard → your project → **Settings → Data API → Project URL**. For this app: `https://noldxlpfluvfspuavigl.supabase.co`. | yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → **Settings → API Keys**. Use the **publishable** key (`sb_publishable_…`), not the secret/service-role key. Safe to ship to the browser. | yes |

### Edge-function secrets (server-side only — set in Supabase, not in `.env.local`)

The `refresh-prices` edge function fetches live market prices. Without keys it falls back to anonymous tier limits (heavily rate-limited / "demo" key).

| Secret | Where to get it | Default if missing |
|---|---|---|
| `BRAPI_TOKEN` | https://brapi.dev → register → **My account → Tokens**. Free tier allows ~15k req/month. Used for B3 tickers. | Anonymous tier (low rate limit). |
| `ALPHAVANTAGE_API_KEY` | https://www.alphavantage.co/support/#api-key → free signup → instant key. 25 req/day on free tier. Used for NASDAQ/NYSE tickers. | The literal string `demo` (only works for `IBM`). |
| `COINGECKO_DEMO_API_KEY` | https://www.coingecko.com/en/developers/dashboard → Demo plan → free. Used for crypto. | Anonymous tier (~30 req/min). |

Set them with the Supabase CLI:

```bash
supabase secrets set \
  BRAPI_TOKEN=... \
  ALPHAVANTAGE_API_KEY=... \
  COINGECKO_DEMO_API_KEY=... \
  --project-ref noldxlpfluvfspuavigl
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically into edge functions by Supabase — don't set those yourself.

## What was provisioned

| Thing | Identifier |
|---|---|
| Supabase project name | `ledgenator` |
| Project ref | `noldxlpfluvfspuavigl` |
| Region | `sa-east-1` (São Paulo) |
| Tier | Free |
| API URL | https://noldxlpfluvfspuavigl.supabase.co |
| Edge function | `refresh-prices` (JWT-verified) |

Auth: email/password + magic link are **enabled by default** on new Supabase projects, so no extra configuration is needed for either flow. Magic link redirects to `window.location.origin`.

## Seeding the demo account

The public demo login and its sample portfolio are defined in
`supabase/migrations/0006_demo_account_seed.sql`. It creates a pre-confirmed
`demo@ledgenator.app` user (password `demo1234`) and fictional brokers, assets,
funding events, FX rates, and operations.

To apply (or reset) it:

1. Supabase Dashboard → **SQL Editor**.
2. Paste the contents of `supabase/migrations/0006_demo_account_seed.sql` and **Run**
   (equivalently `supabase db push`, or run the file via `psql`).

The script is **idempotent** — re-running it upserts the user/catalog and replaces
the demo account's own rows, restoring the original sample data. Verification
queries are included as comments at the bottom of the file.

## Supabase setup from scratch (if you ever recreate the project)

1. **Create project** at https://supabase.com → New project.
2. **Apply schema:**
   ```bash
   supabase db push --project-ref <ref>
   # or paste supabase/migrations/0001_init.sql into the SQL Editor
   ```
3. **Deploy the edge function:**
   ```bash
   supabase functions deploy refresh-prices --project-ref <ref>
   ```
4. **Configure auth redirect URLs** in Dashboard → Authentication → URL Configuration → add `http://localhost:5173` and your production URL.
5. **Copy keys** from Dashboard → Settings → API Keys into `.env.local`.

## Scripts

- `npm run dev` — dev server on port 5173
- `npm run build` — production build (`dist/`)
- `npm run typecheck` — TypeScript only

## Structure

- `src/features/auth` — login (password + magic link)
- `src/features/dashboard` — home with 4 animated charts + KPI cards
- `src/features/operations` — CRUD operations, asset picker
- `src/features/brokers` — broker CRUD + funding events (BRL↔USD bookkeeping)
- `src/features/profile` — locale + display name
- `src/components/charts` — Recharts wrappers (allocation, performance, broker, currency)
- `src/components/ui` — minimal shadcn-style primitives (button, card, input, dialog, tabs, select, toast, …)
- `src/lib/{supabase,i18n,currency,utils}.ts`
- `src/locales/{pt-BR,en}.json`
- `supabase/migrations/0001_init.sql` — schema + RLS + triggers
- `supabase/functions/refresh-prices/` — Brapi / CoinGecko / Alpha Vantage proxy

## Notes & known limitations

- **USD→BRL FX rate is hardcoded to 5.0** in `src/hooks/usePortfolio.ts` and `src/features/dashboard/HomePage.tsx`. To make it live, extend `refresh-prices` to fetch a daily rate and store it under a sentinel asset, then read it in `usePortfolio.ts`.
- The Supabase client is loosely typed (no generated `Database` types yet). Run `supabase gen types typescript --project-id noldxlpfluvfspuavigl > src/types/database.ts` if you want full type-safety on `.from(...)` calls — then re-add `createClient<Database>(...)` in `src/lib/supabase.ts`.
- Bundle is ~1 MB (300 kB gzipped). To split: dynamic-import the Recharts pages or set `build.rollupOptions.output.manualChunks`.


