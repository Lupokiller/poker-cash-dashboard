ALTER TABLE registered_players
  ADD COLUMN IF NOT EXISTS buy_in_logs JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE player_profiles
  ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '';
