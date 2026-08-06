-- Acerto do saldo (Pix/Dinheiro) separado do crédito de mesa (fiado no buy-in).
ALTER TABLE registered_players
  ADD COLUMN IF NOT EXISTS settlement_method TEXT;

ALTER TABLE registered_players DROP CONSTRAINT IF EXISTS registered_players_settlement_method_check;

ALTER TABLE registered_players
  ADD CONSTRAINT registered_players_settlement_method_check
  CHECK (settlement_method IS NULL OR settlement_method IN ('pix', 'dinheiro'));
