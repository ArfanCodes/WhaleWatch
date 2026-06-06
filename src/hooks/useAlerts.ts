// useAlerts — loads alert history from Supabase and subscribes to new ones in
// real time.  Falls back to seed data if Supabase is not yet configured.

import { useEffect, useState } from 'react';
import { Alert, tierForValue } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { seedAlerts } from '../data/seedAlerts';

// Map a Supabase row to our Alert type.
function rowToAlert(row: Record<string, unknown>): Alert {
  const usd = Number(row.usd_value ?? 0);
  return {
    id: String(row.id),
    coin: String(row.coin ?? 'Ethereum'),
    symbol: String(row.symbol ?? 'ETH'),
    usdValue: usd,
    direction: (row.direction as Alert['direction']) ?? 'moved',
    tier: tierForValue(usd),
    moodScore: Number(row.mood_score ?? 50),
    moodLabel: (row.mood_label as Alert['moodLabel']) ?? 'Neutral',
    headline: String(row.headline ?? ''),
    detail: String(row.detail ?? ''),
    txHash: row.tx_hash ? String(row.tx_hash) : undefined,
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export function useAlerts(): Alert[] {
  const [alerts, setAlerts] = useState<Alert[]>(
    isSupabaseConfigured ? [] : seedAlerts,
  );

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    // ── 1. Load recent history (latest 50) ───────────────────────────────────
    supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) {
          console.warn('useAlerts fetch error:', error.message);
          setAlerts(seedAlerts);
          return;
        }
        if (data && data.length > 0) {
          setAlerts(data.map(rowToAlert));
        } else {
          // Table is empty — show seed so the UI isn't blank during demo
          setAlerts(seedAlerts);
        }
      });

    // ── 2. Subscribe to new inserts in real time ──────────────────────────────
    const channel = supabase
      .channel('alerts-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        (payload) => {
          const newAlert = rowToAlert(payload.new as Record<string, unknown>);
          setAlerts((prev) => {
            // Deduplicate and keep newest-first, cap at 50.
            const next = [newAlert, ...prev.filter((a) => a.id !== newAlert.id)];
            return next.slice(0, 50);
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return alerts;
}
