// Pings Supabase every 4 days so the free-tier project never auto-pauses.
// Call startKeepAlive() once from App.tsx.
// Supabase pauses after 7 days of inactivity — this runs well within that.

import { supabase, isSupabaseConfigured } from './supabase';

const INTERVAL_MS = 4 * 24 * 60 * 60 * 1000; // 4 days

export function startKeepAlive() {
  if (!isSupabaseConfigured || !supabase) return;

  async function ping() {
    try {
      // Lightweight read — just fetches 1 row to register activity.
      await supabase!.from('alerts').select('id').limit(1);
    } catch {
      // Silent — not critical.
    }
  }

  ping(); // ping immediately on app open
  setInterval(ping, INTERVAL_MS);
}
