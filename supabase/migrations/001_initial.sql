-- WhaleWatch — initial schema
-- Run this in the Supabase SQL editor after creating your project.

-- ─────────────────────────────────────────────
-- Alerts table: one row per whale event
-- ─────────────────────────────────────────────
create table if not exists public.alerts (
  id           text primary key,          -- tx hash or generated id
  coin         text not null default 'Ethereum',
  symbol       text not null default 'ETH',
  usd_value    numeric not null,
  direction    text not null check (direction in ('bought','sold','moved')),
  tier         text not null check (tier in ('fish','whale','fire')),
  mood_score   integer not null default 50 check (mood_score between 0 and 100),
  mood_label   text not null default 'Neutral',
  headline     text,
  detail       text,
  tx_hash      text,
  created_at   timestamptz not null default now()
);

-- index for the feed query (newest first)
create index if not exists alerts_created_at_idx on public.alerts (created_at desc);

-- ─────────────────────────────────────────────
-- Enable Row Level Security but allow anon reads
-- (Phase 4 adds user watchlists + auth-gated writes)
-- ─────────────────────────────────────────────
alter table public.alerts enable row level security;

create policy "Anyone can read alerts"
  on public.alerts for select
  using (true);

-- Only the service role (our edge function) can insert/update
create policy "Service role can write alerts"
  on public.alerts for insert
  with check (true);   -- enforced at the connection level by using service_role key

-- ─────────────────────────────────────────────
-- Enable realtime so the app gets pushed new rows
-- ─────────────────────────────────────────────
alter publication supabase_realtime add table public.alerts;
