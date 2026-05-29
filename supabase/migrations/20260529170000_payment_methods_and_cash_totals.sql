-- Meio de pagamento por buy-in (Pix, Dinheiro, Fiado)
ALTER TABLE registered_players
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'pix';

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    WHERE t.relname = 'registered_players'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%payment_method%'
  LOOP
    EXECUTE format('ALTER TABLE registered_players DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE registered_players
  ADD CONSTRAINT registered_players_payment_method_check
  CHECK (payment_method IN ('pix', 'dinheiro', 'fiado'));

-- Totais de caixa por sessão finalizada
ALTER TABLE poker_sessions
  ADD COLUMN IF NOT EXISTS total_pix NUMERIC(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE poker_sessions
  ADD COLUMN IF NOT EXISTS total_dinheiro NUMERIC(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE poker_sessions
  ADD COLUMN IF NOT EXISTS total_fiado NUMERIC(12, 2) NOT NULL DEFAULT 0;
