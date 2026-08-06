-- Tags e origem do jogador no diretório do clube.
ALTER TABLE player_profiles
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE player_profiles
  ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT '';

ALTER TABLE player_profiles DROP CONSTRAINT IF EXISTS player_profiles_origin_check;

ALTER TABLE player_profiles
  ADD CONSTRAINT player_profiles_origin_check
  CHECK (origin IN ('', 'indicacao', 'instagram', 'amigo', 'whatsapp', 'outro'));
