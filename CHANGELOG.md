# Changelog

## 2026-10-25 — Domain moved to erickmob.dev

**Why:** `erickmob.dev` was bought back and is the main domain again. GitHub Pages serves one custom domain per repo, so `.dev` is the canonical one and `.com` redirects to it.

| | Before | After |
|---|---|---|
| URL | `https://ledgenator.erickmob.com` | **`https://ledgenator.erickmob.dev`** (`.com` and `erickmobltda.github.io/ledgenator/` redirect here) |
| API | `https://api.erickmob.com` | `https://api.erickmob.dev` (`.com` keeps answering) |

- Changed: the `cname` of the deploy step, the `VITE_API_URL` repo secret, `.env.example`, README.
- The login session is stored per domain: sign in again once on `.dev`.

## 2026-10-24 — Supabase → Firebase + erickmob-api, new domain

**Why:** Supabase pauses free projects after a week without activity; every app moved to one free stack that does not pause: Firebase for login and data, and a single backend ([erickmob-api](https://github.com/erickmobltda/erickmob-api)) on an Oracle Always Free VM for everything that needs a secret key.

### Where things moved

| | Before | After |
|---|---|---|
| URL | `erickmobltda.github.io/ledgenator/` | **`https://ledgenator.erickmob.com`** (old URL redirects) |
| Login | Supabase Auth (password, sign-up, magic link) + demo button | Firebase Auth, project `erickmob-apps`, shared with the other apps. Password + demo button; sign-up off |
| Per-user data | Postgres `operations`, `funding_events`, `broker_transfers`, `profiles` | Firestore `apps/ledgenator/users/{uid}/{operations,funding_events,broker_transfers,profile}` |
| Brokers | Postgres `brokers`, **shared by every user** (the public demo could add brokers everyone saw) | Per user: `apps/ledgenator/users/{uid}/brokers` |
| Ticker catalog / prices | Postgres `assets` (any user could update any row), `price_cache` | Firestore `apps/ledgenator/assets` (append-only) and `apps/ledgenator/price_cache` (written only by the API) |
| Price refresh | Edge function `refresh-prices`, **deployed with `--no-verify-jwt` (anyone could trigger it)**, refreshed every asset | `POST https://api.erickmob.com/ledgenator/refresh-prices`: requires login, refuses the demo, refreshes only the caller's assets + `USDBRL`, with an Alpha Vantage fallback for `USDBRL` |
| Market-data keys | Supabase secrets (and, oddly, the deploy workflow passed the anon key under their names) | Only in erickmob-api's server environment |

### Logic that moved out of Postgres

- `operations.total_price` (generated column) → computed in `useSaveOperation`: `round(units × unit_price, 2)`.
- `handle_funding_event` trigger → `fundingFx()` in `useBrokers.ts`: USD funding needs `exchange_rate` or `source_amount_brl` and the missing one is derived; BRL funding has neither. The Firestore rules reject USD funding without both values.
- Foreign keys → deleting a broker that still has operations or funding events is refused.
- `handle_new_user` (profile on sign-up) → the profile is a document created when saved.
- Joins (`operations` + `assets` + `brokers`) → done in the client in `useOperations`.

### Demo account

- `demo@ledgenator.app` / `demo1234` kept its password (bcrypt hash imported) and got the Firebase custom claim `demo: true`: erickmob-api answers `403` to its paid calls and the Firestore rules keep it out of the other apps.
- The SQL seed was replaced by `scripts/demo-seed.json` + `npm run reset-demo` (needs the Firebase service account).

### Data migration

- Users: the owner (`erickmobltda@gmail.com`) attached to the existing Firebase account; the demo imported with its uid and password hash.
- 189 operations, 70 funding events, 4 transfers, 24 assets, 23 cached prices, 2 profiles copied with their original ids; brokers copied to each user who uses them (owner 4, demo 5). Counts checked per user against Supabase.
- A full `pg_dump` is kept offline. The Supabase project (`noldxlpfluvfspuavigl`) is no longer used by the app.

Other changes: removed `supabase/`, `src/lib/supabase.ts`, magic link and sign-up; Vite `base` is `/` and the deploy publishes a `CNAME`.

Commits: `f19869d` (domain), `70aaeaa` (migration).
