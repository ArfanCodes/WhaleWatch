// Fetches ETH/USD price history from CoinGecko's free public API.
// No API key required. Free tier is rate-limited, so we refresh on an
// interval (not tick-by-tick) — which is fine for this chart.

export interface PricePoint {
  t: number; // unix ms
  price: number; // USD
}

export interface PriceSeries {
  points: PricePoint[];
  current: number;
  changePct: number; // % change across the loaded window
}

const ETH_MARKET_CHART =
  'https://api.coingecko.com/api/v3/coins/ethereum/market_chart?vs_currency=usd&days=1';

export async function fetchEthSeries(): Promise<PriceSeries> {
  const res = await fetch(ETH_MARKET_CHART, {
    headers: { accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`CoinGecko ${res.status}`);
  }
  const json = (await res.json()) as { prices: [number, number][] };
  const points: PricePoint[] = (json.prices || []).map(([t, price]) => ({ t, price }));
  const current = points.length ? points[points.length - 1].price : 0;
  const first = points.length ? points[0].price : 0;
  const changePct = first ? ((current - first) / first) * 100 : 0;
  return { points, current, changePct };
}

// Linearly interpolate the price at an arbitrary timestamp so a whale event
// can be placed exactly on the price line at the moment it happened.
export function priceAt(points: PricePoint[], t: number): number | null {
  if (!points.length) return null;
  if (t <= points[0].t) return points[0].price;
  if (t >= points[points.length - 1].t) return points[points.length - 1].price;
  for (let i = 1; i < points.length; i++) {
    if (points[i].t >= t) {
      const a = points[i - 1];
      const b = points[i];
      const ratio = (t - a.t) / (b.t - a.t || 1);
      return a.price + (b.price - a.price) * ratio;
    }
  }
  return points[points.length - 1].price;
}
