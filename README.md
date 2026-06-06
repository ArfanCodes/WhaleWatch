<div align="center">

# 🐋 WhaleWatch

### Real-time crypto whale alerts, fused with AI crowd-mood — in one plain-English signal.

[![React Native](https://img.shields.io/badge/React_Native-Expo-000020?logo=expo)](https://expo.dev)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres_+_Realtime-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Gemini](https://img.shields.io/badge/AI-Google_Gemini-4285F4?logo=google&logoColor=white)](https://ai.google.dev)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)

</div>

---

## The idea

Tools like Whale Alert, Nansen, and Laika show you **on-chain data** and **social sentiment** as two separate things. You have to connect the dots yourself.

**WhaleWatch fuses them into one readable signal.** When a whale makes a big move, it instantly cross-references the crowd's mood and pushes a single plain-English alert:

> *"A whale just sold $4M of Ethereum and the crowd mood is fearful — this pattern often precedes a price drop."*

One sentence. The money move **and** the market psychology, together.

---

## Key features

- 📡 **Live whale feed** — large ETH transactions stream in the moment they happen (event-driven, not polling).
- 🧠 **AI crowd-mood fusion** — every alert is scored Fearful / Neutral / Greedy by a live language model.
- 📈 **Custom price chart with whale overlay** — a smooth ETH/USD chart with glowing whale markers placed at the exact moment each move happened, so you can *see* "price dropped here, and a whale sold right before."
- 🎚️ **Per-coin mood gauge** — a speedometer dial swinging between fearful and greedy.
- 🔔 **Push-ready architecture** — built to alert even when the app is closed.
- 🌑 **Premium dark UI** — bold, animated, mobile-first design.

---

## How it works

```
   Ethereum blockchain
          │  (large transfer happens)
          ▼
   Alchemy webhook ───────────►  Supabase Edge Function (serverless)
                                    │  1. verify request (HMAC)
                                    │  2. fetch live ETH price (CoinGecko)
                                    │  3. score crowd mood (Google Gemini)
                                    │  4. save fused alert
                                    ▼
                              Supabase Postgres + Realtime
                                    │  (pushes new row instantly)
                                    ▼
                           React Native app — live feed
```

The whole backend is **serverless and event-driven** — it wakes only when a whale moves, so it scales to zero and costs effectively nothing to run.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Mobile | **React Native (Expo)** | One codebase, iOS + Android |
| Charting | **react-native-svg** (custom) | Pixel-perfect whale-marker overlay |
| Backend | **Supabase Edge Functions** (Deno) | Serverless, scales to zero |
| Database | **Supabase Postgres + Realtime** | Storage + instant push to clients |
| Whale data | **Alchemy webhooks** | Pushed on-chain events, no polling |
| Sentiment | **Google Gemini** | Live AI mood scoring |
| Prices | **CoinGecko API** | Free real-time price data |

---

## Status

🚧 **Active MVP.** The end-to-end pipeline is live for **Ethereum**: whale event → mood fusion → database → real-time app feed. Multi-coin support, watchlists, accounts, and push notifications are on the roadmap.

---

## Running it locally

This project needs your own free API keys (Supabase, Alchemy, Google Gemini). See **[SETUP.md](SETUP.md)** for the full step-by-step guide.

```bash
npm install
# create a .env from .env.example and fill in your keys
npm start          # then scan the QR code with Expo Go
```

> 🔐 No secrets are committed to this repo. All keys live in a git-ignored `.env`.

---

## 📜 License & collaboration

This project is **proprietary — all rights reserved.** It is shared publicly to demonstrate the work, **not** for copying, reuse, or redistribution. See [LICENSE](LICENSE) for the exact terms.

**Like the idea or have suggestions?** I'd genuinely love to collaborate rather than have the work copied. Open an issue or reach out via **[@ArfanCodes](https://github.com/ArfanCodes)** — let's build it together.

---

<div align="center">
<sub>Built by <a href="https://github.com/ArfanCodes">@ArfanCodes</a></sub>
</div>
