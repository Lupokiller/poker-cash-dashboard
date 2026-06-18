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
  payment_method TEXT NOT NULL DEFAULT 'pix' CHECK (payment_method IN ('pix', 'dinheiro', 'fiado')),
  buy_in_logs JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS registered_players_created_at_idx
  ON registered_players (created_at DESC);

CREATE INDEX IF NOT EXISTS registered_players_date_idx
  ON registered_players (date DESC);

CREATE TABLE IF NOT EXISTS poker_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date DATE NOT NULL UNIQUE,
  staff_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_pix NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_dinheiro NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_fiado NUMERIC(12, 2) NOT NULL DEFAULT 0,
  table_started_at TIMESTAMPTZ,
  table_ended_at TIMESTAMPTZ,
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

CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  login TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS app_users_login_idx ON app_users (login);

CREATE TABLE IF NOT EXISTS player_profiles (
  name_key TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  fiado_limit NUMERIC(12, 2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS player_profiles_display_name_idx ON player_profiles (display_name);

CREATE TABLE IF NOT EXISTS session_clocks (
  session_date DATE PRIMARY KEY,
  table_started_at TIMESTAMPTZ,
  table_ended_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Administrador inicial:
INSERT INTO app_users (name, login, password_hash, role)
VALUES (
  'Caio Lupo',
  'caio lupo',
  'bb3bfa162c679b802b5d2d612e4d1117:074db96632037a1bd737f5cc3e5b9e7ac974e9dd46d07fe55d558cd0985fb02af359957b35e3c8d748e2b6d8b088436ded38ad40a0d39c81ea8f4a15f18bfa20',
  'admin'
)
ON CONFLICT (login) DO NOTHING;
