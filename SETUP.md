# WhaleWatch — End-to-End Setup

Three services, each takes ~5 minutes.

---

## 1. Supabase (database + live push)

1. Go to https://supabase.com → sign in with GitHub → New project.
   - Name: `whalewatch` · Region: Mumbai · Plan: Free.
2. Wait ~2 min for the project to spin up.
3. Open the **SQL Editor** (left sidebar) and paste the entire contents of
   `supabase/migrations/001_initial.sql`, then click **Run**.
4. Go to **Project Settings → API**:
   - Copy **Project URL** → paste into `.env` as `EXPO_PUBLIC_SUPABASE_URL`
   - Copy **anon public key** → paste as `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - Copy **service_role key** (secret) → paste as `SUPABASE_SERVICE_ROLE_KEY`

---

## 2. Deploy the Edge Function

Install the Supabase CLI if needed:
```
npm install -g supabase
```

Link your project (run from the WhaleWatch folder):
```
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

Set the function's secrets:
```
supabase secrets set ANTHROPIC_API_KEY=your_key_here
supabase secrets set ALCHEMY_WEBHOOK_SIGNING_KEY=your_key_here
```

Deploy:
```
supabase functions deploy whale-webhook
```

The function URL will be:
`https://YOUR_PROJECT_REF.supabase.co/functions/v1/whale-webhook`

Copy this URL — you'll need it for Alchemy.

---

## 3. Alchemy (live ETH whale events)

1. Go to https://alchemy.com → sign up free → Create App.
   - Chain: **Ethereum** · Network: **Mainnet** · Name: `whalewatch`
2. Copy the **API Key** → paste into `.env` as `ALCHEMY_API_KEY`.
3. In the Alchemy dashboard, go to **Notify → Webhooks → Create Webhook**.
   - Type: **Address Activity**
   - Addresses: leave blank (we filter by value in the function)
   - Webhook URL: paste your Supabase function URL from Step 2.
4. After creation, copy the **Signing Key** → paste as `ALCHEMY_WEBHOOK_SIGNING_KEY`.
   Also re-run: `supabase secrets set ALCHEMY_WEBHOOK_SIGNING_KEY=your_key_here`

> Note: The free tier "Address Activity" webhook requires at least one address.
> Use `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2` (WETH contract) — nearly
> every large ETH move touches it.

---

## 4. Anthropic / Claude (mood scoring)

1. Go to https://console.anthropic.com → API Keys → Create Key.
2. Paste the key into `.env` as `ANTHROPIC_API_KEY`.
3. Re-run: `supabase secrets set ANTHROPIC_API_KEY=your_key_here`

~$5 of credit covers thousands of mood scorings during a demo.

---

## 5. Verify it's working

1. Run the app: `npm start` (scan QR with Expo Go)
2. The feed should show seed data initially (table is empty).
3. Trigger a test: in Alchemy Notify, click **Send Test** on your webhook.
4. Within a few seconds the alert should appear in your live feed.

For real whale events, large ETH transfers (>$250K) will appear automatically.

---

## Environment variables summary (.env file)

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ALCHEMY_API_KEY=xxxx
ALCHEMY_WEBHOOK_SIGNING_KEY=xxxx
ANTHROPIC_API_KEY=sk-ant-...
```
