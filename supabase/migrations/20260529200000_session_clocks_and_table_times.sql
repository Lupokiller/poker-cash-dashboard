CREATE TABLE IF NOT EXISTS session_clocks (
  session_date DATE PRIMARY KEY,
  table_started_at TIMESTAMPTZ,
  table_ended_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE poker_sessions
  ADD COLUMN IF NOT EXISTS table_started_at TIMESTAMPTZ;

ALTER TABLE poker_sessions
  ADD COLUMN IF NOT EXISTS table_ended_at TIMESTAMPTZ;
