// Supabase Edge Function: whale-webhook
// ─────────────────────────────────────────────────────────────────────────────
// Receives POST requests from Alchemy's Address Activity webhook whenever a
// large ETH transfer happens.  Steps:
//   1. Verify the Alchemy HMAC signature (security).
//   2. Extract the transfer details (USD value, direction, tx hash).
//   3. Call the Claude API to score the crowd mood.
//   4. Save the fused alert to the Supabase alerts table.
//   5. Supabase Realtime broadcasts the insert to all connected app clients.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'npm:@supabase/supabase-js@2';

const ALERT_THRESHOLD_USD = 250_000; // lower threshold for demo
const ETH_USD_CACHE_TTL_MS = 60_000;

// ── helpers ───────────────────────────────────────────────────────────────────

function tierForValue(usd: number): 'fish' | 'whale' | 'fire' {
  if (usd >= 10_000_000) return 'fire';
  if (usd >= 5_000_000) return 'whale';
  return 'fish';
}

function formatUsd(usd: number): string {
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(2)}B`;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(usd >= 10_000_000 ? 0 : 1)}M`;
  return `$${(usd / 1_000).toFixed(0)}K`;
}

function moodLabel(score: number): 'Fearful' | 'Neutral' | 'Greedy' {
  if (score < 40) return 'Fearful';
  if (score < 60) return 'Neutral';
  return 'Greedy';
}

// Verify Alchemy's HMAC-SHA256 signature using Web Crypto (built-in, no import).
async function verifyAlchemySignature(body: string, sigHeader: string, signingKey: string): Promise<boolean> {
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(signingKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
    );
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
    const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
    return hex === sigHeader;
  } catch {
    return false;
  }
}

// Fetch the current ETH/USD price from CoinGecko (cached in memory for 60s).
let ethPriceCache: { price: number; ts: number } | null = null;
async function getEthPrice(): Promise<number> {
  if (ethPriceCache && Date.now() - ethPriceCache.ts < ETH_USD_CACHE_TTL_MS) {
    return ethPriceCache.price;
  }
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
    );
    const data = await res.json();
    const price = data?.ethereum?.usd ?? 0;
    ethPriceCache = { price, ts: Date.now() };
    return price;
  } catch {
    return ethPriceCache?.price ?? 2000; // fallback to last known or rough estimate
  }
}

// Ask Google Gemini (free tier) to score the crowd mood for ETH right now
// (0 = extreme fear, 100 = extreme greed). Uses a plain fetch — no SDK needed.
async function scoreMood(geminiKey: string, usdValue: number, direction: string): Promise<number> {
  const prompt = `You are a crypto market sentiment scorer. A whale just ${direction} ${formatUsd(usdValue)} of Ethereum.
Based on typical market psychology for this type of move, score the crowd mood from 0 (extreme fear) to 100 (extreme greed).
Reply with ONLY a number between 0 and 100. No words, no explanation.`;

  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 10, temperature: 0.4 },
      }),
    },
  );

  if (!res.ok) {
    console.error('Gemini error', res.status, await res.text());
    return 50;
  }
  const data = await res.json();
  const raw: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const n = parseInt(raw.replace(/[^0-9]/g, ''), 10);
  return isNaN(n) ? 50 : Math.max(0, Math.min(100, n));
}

// ── main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = await req.text();

  // 1. Verify Alchemy signature
  const alchemySigningKey = Deno.env.get('ALCHEMY_WEBHOOK_SIGNING_KEY') ?? '';
  if (alchemySigningKey) {
    const sig = req.headers.get('x-alchemy-signature') ?? '';
    const valid = await verifyAlchemySignature(body, sig, alchemySigningKey);
    if (!valid) {
      return new Response('Invalid signature', { status: 401 });
    }
  }

  let payload: any;
  try {
    payload = JSON.parse(body);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  // 2. Extract transfers from the Alchemy webhook payload
  const transfers: any[] = payload?.event?.activity ?? [];
  const ethPrice = await getEthPrice();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const geminiKey = Deno.env.get('GEMINI_API_KEY') ?? '';

  const processed: string[] = [];

  // We watch the WETH contract; flow direction relative to it gives an
  // approximate buy/sell signal (true DEX-level classification needs swap
  // decoding, which is out of scope for the MVP).
  const WETH = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';

  for (const tx of transfers) {
    try {
      // Alchemy sends the transfer amount as a decimal `value`, or as hex wei
      // in `rawContract.rawValue`. Prefer the decimal value when present.
      let ethAmount = 0;
      if (typeof tx.value === 'number') ethAmount = tx.value;
      else if (typeof tx.value === 'string' && tx.value) ethAmount = parseFloat(tx.value);
      else if (tx.rawContract?.rawValue) ethAmount = parseInt(tx.rawContract.rawValue, 16) / 1e18;

      const usdValue = ethAmount * ethPrice;
      if (usdValue < ALERT_THRESHOLD_USD) continue;

      const from = (tx.fromAddress ?? '').toLowerCase();
      const to = (tx.toAddress ?? '').toLowerCase();
      const direction: 'bought' | 'sold' | 'moved' =
        from === WETH ? 'bought' : to === WETH ? 'sold' : 'moved';

      const tier = tierForValue(usdValue);
      const txHash: string = tx.hash ?? crypto.randomUUID();

      // 3. Score mood
      const moodScore = geminiKey
        ? await scoreMood(geminiKey, usdValue, direction)
        : 50;
      const label = moodLabel(moodScore);

      const usdTxt = formatUsd(usdValue);
      const arrow = direction === 'sold' ? '▼' : direction === 'bought' ? '▲' : '◆';

      // 4. Save alert
      const { error } = await supabase.from('alerts').upsert({
        id: txHash,
        coin: 'Ethereum',
        symbol: 'ETH',
        usd_value: usdValue,
        direction,
        tier,
        mood_score: moodScore,
        mood_label: label,
        headline: `${usdTxt} ETH ${direction} ${arrow} Crowd: ${label}`,
        detail: `A whale ${direction} ${usdTxt} of Ethereum. Crowd mood is ${label.toLowerCase()}.`,
        tx_hash: txHash,
      });

      if (error) {
        console.error('DB error:', error.message);
      } else {
        processed.push(txHash);
      }
    } catch (err) {
      console.error('Error processing tx:', err);
    }
  }

  return new Response(JSON.stringify({ processed: processed.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
