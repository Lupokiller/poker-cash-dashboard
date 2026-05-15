-- Schema do app (Postgres/Supabase). Copia espelhada em supabase/migrations/ para `npm run db:push`.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS registered_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  buy_in NUMERIC(12, 2) NOT NULL DEFAULT 0,
  cash_out NUMERIC(12, 2) NOT NULL DEFAULT 0,
  net NUMERIC(12, 2) GENERATED ALWAYS AS (cash_out - buy_in) STORED,
  payment_status TEXT NOT NULL CHECK (payment_status IN ('a receber', 'a pagar', 'quitado')),
  phone TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS registered_players_created_at_idx
  ON registered_players (created_at DESC);

CREATE INDEX IF NOT EXISTS registered_players_date_idx
  ON registered_players (date DESC);

CREATE TABLE IF NOT EXISTS poker_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date DATE NOT NULL UNIQUE,
  finalized_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS poker_sessions_session_date_idx
  ON poker_sessions (session_date DESC);

CREATE TABLE IF NOT EXISTS poker_session_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES poker_sessions (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  buy_in NUMERIC(12, 2) NOT NULL DEFAULT 0,
  cash_out NUMERIC(12, 2) NOT NULL DEFAULT 0,
  net NUMERIC(12, 2) NOT NULL,
  payment_status TEXT NOT NULL CHECK (payment_status IN ('a receber', 'a pagar', 'quitado'))
);

CREATE INDEX IF NOT EXISTS poker_session_players_session_id_idx
  ON poker_session_players (session_id);
