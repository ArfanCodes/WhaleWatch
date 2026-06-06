// Central knobs we may flip between demo and production.

// Smallest move (USD) that triggers an alert.
// 250_000 keeps the live feed busy during interviews; set to 1_000_000 for "real" mode.
export const ALERT_THRESHOLD_USD = 250_000;

// Tier cutoffs for the badges (independent of the alert threshold).
export const TIER_WHALE_USD = 5_000_000;
export const TIER_FIRE_USD = 10_000_000;

// The coin wired up end-to-end in this build.
export const PRIMARY_COIN = { symbol: 'ETH', name: 'Ethereum' } as const;
