# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ Expo version

This project is on **Expo SDK 56 / React Native 0.85 / React 19**. The API surface
has changed across recent SDKs — read the exact versioned docs at
https://docs.expo.dev/versions/v56.0.0/ before writing or changing native/Expo code.

## Commands

```bash
npm install            # install deps
npm start              # expo start — scan QR with Expo Go
npm run android        # open on Android
npm run ios            # open on iOS
npm run web            # run in browser (react-native-web)
```

Type-check (no test runner is configured): `npx tsc --noEmit`

### Edge function (Supabase, Deno)

```bash
supabase functions deploy whale-webhook      # deploy the serverless webhook
supabase secrets set GEMINI_API_KEY=...       # set runtime secrets (see note below)
```

Apply the schema by pasting `supabase/migrations/001_initial.sql` into the
Supabase SQL editor. Full external-service walkthrough is in `SETUP.md`.

## Architecture

WhaleWatch fuses on-chain whale moves with AI crowd-mood into one plain-English
alert. The pipeline is **serverless and event-driven** (scales to zero):

```
Alchemy webhook → Supabase Edge Function → Postgres insert → Realtime → RN app feed
```

**Backend — `supabase/functions/whale-webhook/index.ts` (Deno):** the entire
server. On each Alchemy "Address Activity" POST it: (1) verifies the HMAC
signature, (2) fetches ETH/USD from CoinGecko (60s in-memory cache), (3) filters
transfers below `ALERT_THRESHOLD_USD`, (4) infers direction by comparing
from/to against the WETH contract address, (5) scores crowd mood via an LLM, and
(6) `upsert`s a row into `alerts` keyed by tx hash. Realtime broadcasts the insert.

**Client — Expo / React Native:** `App.tsx` gates on `useAuth` (Supabase
magic-link / email OTP, deep link `whalewatch://auth-callback`) → bottom-tab
navigator (Feed, Watchlist, Alerts, Settings). `src/hooks/useAlerts.ts` is the
data spine: loads the latest 50 rows, then subscribes to `postgres_changes`
INSERTs and merges newest-first (deduped, capped at 50).

**Graceful degradation is load-bearing.** `src/lib/supabase.ts` exports
`isSupabaseConfigured` (true only when both `EXPO_PUBLIC_*` vars exist). When
unconfigured — or when the `alerts` table is empty/errors — the app falls back to
`src/data/seedAlerts.ts` so the UI is never blank. New data code should preserve
this fallback path.

**Other libs:** `src/lib/prices.ts` pulls ETH/USD history from CoinGecko and
`priceAt()` interpolates a price at an arbitrary timestamp, so whale markers land
exactly on the chart line. `src/lib/keepAlive.ts` pings Supabase every 4 days so
the free-tier project never auto-pauses.

## Conventions

- **Mobile-first.** Every size/token in `src/theme.ts` is tuned for a 390px
  phone first. Use the `colors`/`space`/`radius`/`font`/`type` tokens and the
  `Inter_*` font families (via `type`) instead of raw values or `fontWeight`.
- `src/types.ts` is the shared client model. Note `usd_value` (DB, snake_case) ↔
  `usdValue` (client, camelCase) — `rowToAlert` in `useAlerts.ts` does the mapping.
- Thresholds/tier cutoffs live in `src/config.ts` (client) and are **duplicated**
  as literals in the edge function — change both when tuning. Likewise `formatUsd`,
  `moodLabel`, and `tierForValue` exist in both client and function.
- Only `EXPO_PUBLIC_`-prefixed env vars are readable in the app; everything else
  (service role key, signing keys, LLM key) is backend-only.

## Known inconsistency

The mood scorer in `whale-webhook/index.ts` calls **Google Gemini** and reads
`GEMINI_API_KEY`, but `SETUP.md` and `.env.example` document `ANTHROPIC_API_KEY`
(Claude). `README.md` says Gemini. Treat the function code as source of truth
(`GEMINI_API_KEY`); reconcile the docs if you touch this area.
