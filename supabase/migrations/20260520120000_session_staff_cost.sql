-- Custo operacional de staff por sessão (aba Faturamento / Rake)
ALTER TABLE poker_sessions
  ADD COLUMN IF NOT EXISTS staff_cost NUMERIC(12, 2) NOT NULL DEFAULT 0;
