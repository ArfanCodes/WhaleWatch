// Shared types for WhaleWatch.

export type MoodLabel = 'Fearful' | 'Neutral' | 'Greedy';

export type WhaleTier = 'fish' | 'whale' | 'fire'; // $1M+ / $5M+ / $10M+

export type Direction = 'sold' | 'bought' | 'moved';

// A single fused whale + mood alert as shown in the feed.
export interface Alert {
  id: string;
  coin: string; // e.g. "Ethereum"
  symbol: string; // e.g. "ETH"
  usdValue: number; // dollar size of the move
  direction: Direction;
  tier: WhaleTier;
  moodScore: number; // 0 (max fear) .. 100 (max greed)
  moodLabel: MoodLabel;
  headline: string; // punchy line, e.g. "$4M ETH sold · Crowd: Fearful"
  detail: string; // optional longer fused sentence
  txHash?: string;
  createdAt: string; // ISO timestamp
}

export function tierForValue(usd: number): WhaleTier {
  if (usd >= 10_000_000) return 'fire';
  if (usd >= 5_000_000) return 'whale';
  return 'fish';
}

// Text label per tier (no emojis).
export function tierLabel(tier: WhaleTier): string {
  return tier === 'fire' ? '10M+' : tier === 'whale' ? '5M+' : '1M+';
}

export function formatUsd(usd: number): string {
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(2)}B`;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(usd >= 10_000_000 ? 0 : 1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}K`;
  return `$${usd}`;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
