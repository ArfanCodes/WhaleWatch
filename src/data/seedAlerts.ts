// DEMO SEED ONLY — used so the UI looks alive during Phase 0 design work.
// Phase 1 replaces this with real alerts streamed from Supabase.
import { Alert, tierForValue } from '../types';

function mk(
  id: string,
  minsAgo: number,
  usdValue: number,
  direction: Alert['direction'],
  moodScore: number,
): Alert {
  const tier = tierForValue(usdValue);
  const moodLabel = moodScore < 40 ? 'Fearful' : moodScore < 60 ? 'Neutral' : 'Greedy';
  const usdTxt =
    usdValue >= 10_000_000
      ? `$${Math.round(usdValue / 1_000_000)}M`
      : `$${(usdValue / 1_000_000).toFixed(1)}M`;
  return {
    id,
    coin: 'Ethereum',
    symbol: 'ETH',
    usdValue,
    direction,
    tier,
    moodScore,
    moodLabel,
    headline: `${usdTxt} ETH ${direction} · Crowd: ${moodLabel}`,
    detail: `A whale ${direction} ${usdTxt} of Ethereum. Crowd mood is ${moodLabel.toLowerCase()}.`,
    createdAt: new Date(Date.now() - minsAgo * 60_000).toISOString(),
  };
}

// Timestamps are spread across the last ~24h so the chart markers land at
// varied points on the price line (real events arrive naturally spread out).
// The two newest are within minutes (they pulse as "fresh" in the feed); the
// rest are spread across ~24h so the chart markers land at varied points.
export const seedAlerts: Alert[] = [
  mk('s1', 0.6, 12_400_000, 'sold', 28),
  mk('s2', 3, 4_100_000, 'bought', 64),
  mk('s3', 180, 6_800_000, 'bought', 71),
  mk('s4', 470, 1_500_000, 'moved', 52),
  mk('s5', 820, 9_200_000, 'sold', 38),
  mk('s6', 1280, 2_300_000, 'sold', 44),
];
