# Ledgenator

Personal investment tracker across multiple brokers (stocks, ETFs, FIIs, crypto, …) with BRL/USD bookkeeping and an animated dashboard. Built with **Vite + React + TypeScript + Firebase + Tailwind + Recharts**.

- **Languages:** pt-BR (primary), en
- **Mobile-first:** designed for iPhone 16 Pro Safari (safe-area insets, bottom tab nav, 44 px touch targets)

## Live demo

Try it without signing up: **https://ledgenator.erickmob.com**

| | |
|---|---|
| **Email** | `demo@ledgenator.app` |
| **Password** | `demo1234` |

Or just click **“Try the demo”** on the login page — it logs you in with the
credentials above. The demo account comes pre-loaded with multiple brokers,
multi-currency assets (BRL/USD), funding events, exchange rates, and a few years
of buy/sell operations so the dashboard, charts, and reports all have data.

> It's a **shared sandbox** account: anyone can sign in, so data may have been
> changed by other visitors. To reset it, see [Resetting the demo account](#resetting-the-demo-account).
> The demo account cannot refresh prices (the API rejects it; that call spends paid
> market-data quota) and has no access to the other apps that share the login.

## How it fits together

| Piece | Where |
|---|---|
| Frontend | This repo, on GitHub Pages at `ledgenator.erickmob.com` |
| Login | Firebase Auth (project `erickmob-apps`, shared with other apps). Sign-up is off: accounts are created in the Firebase console |
| Per-user data | Firestore `apps/ledgenator/users/{uid}/{profile,brokers,operations,funding_events,broker_transfers}` |
| Shared data | Firestore `apps/ledgenator/assets` (ticker catalog, append-only) and `apps/ledgenator/price_cache` (written only by the API) |
| Price refresh | [erickmob-api](https://github.com/erickmobltda/erickmob-api) `POST /ledgenator/refresh-prices` — refreshes the caller's assets plus the synthetic `USDBRL` row (Yahoo with Alpha Vantage fallback for US tickers and FX, brapi for B3, CoinGecko for crypto) |

The Firestore security rules live in erickmob-api (`firebase/firestore.rules`).
What used to be Postgres logic now lives in the app: `total_price = round(units × unit_price, 2)`,
the USD funding FX rule (USD funding stores both `exchange_rate` and `source_amount_brl`,
deriving the missing one; the rules reject USD funding without them), and brokers in use
cannot be deleted.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in the Firebase web config
npm run dev                  # http://localhost:5173
```

| Variable | Where to get it |
|---|---|
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_APP_ID` | `firebase apps:sdkconfig WEB <ledgenator appId> --project erickmob-apps` |
| `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` | `erickmob-apps.firebaseapp.com`, `erickmob-apps` |
| `VITE_API_URL` | `https://api.erickmob.com` |

The deploy workflow reads the same names from the repo's GitHub secrets. The market-data keys (`BRAPI_TOKEN`, `ALPHAVANTAGE_API_KEY`, `COINGECKO_DEMO_API_KEY`) live only in erickmob-api's server environment.

## Resetting the demo account

`scripts/demo-seed.json` holds the demo's sample portfolio. To restore it (and the
demo password and `demo` claim):

```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/firebase-sa.json npm run reset-demo
```

It replaces the demo account's own documents; the shared ticker catalog is left alone.

## Scripts

- `npm run dev` — dev server on port 5173
- `npm run build` — production build (`dist/`)
- `npm run typecheck` — TypeScript only
- `npm run reset-demo` — restore the demo account (needs the Firebase service account)

## Structure

- `src/features/auth` — login (password + demo button)
- `src/features/dashboard` — home with 4 animated charts + KPI cards
- `src/features/operations` — CRUD operations, asset picker
- `src/features/brokers` — broker CRUD + funding events (BRL↔USD bookkeeping)
- `src/features/profile` — locale + display name
- `src/components/charts` — Recharts wrappers (allocation, performance, broker, currency)
- `src/components/ui` — minimal shadcn-style primitives (button, card, input, dialog, tabs, select, toast, …)
- `src/lib/{firebase,api,i18n,currency,utils}.ts`
- `src/locales/{pt-BR,en}.json`

## Notes & known limitations

- If `USDBRL` has no cached price, the dashboard falls back to a fixed rate of 5.0 (`FX_FALLBACK` in `src/hooks/usePortfolio.ts`).
- Bundle is ~1 MB (300 kB gzipped). To split: dynamic-import the Recharts pages or set `build.rollupOptions.output.manualChunks`.
