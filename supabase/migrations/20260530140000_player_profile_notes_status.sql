ALTER TABLE player_profiles
  ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';

ALTER TABLE player_profiles
  ADD COLUMN IF NOT EXISTS club_status TEXT NOT NULL DEFAULT 'ativo';

ALTER TABLE player_profiles DROP CONSTRAINT IF EXISTS player_profiles_club_status_check;

ALTER TABLE player_profiles
  ADD CONSTRAINT player_profiles_club_status_check
  CHECK (club_status IN ('ativo', 'vip', 'inativo', 'bloqueado'));

ALTER TABLE player_profiles
  ADD COLUMN IF NOT EXISTS first_seen_at DATE;

UPDATE player_profiles pp
SET first_seen_at = sub.first_date
FROM (
  SELECT LOWER(TRIM(name)) AS name_key, MIN(date)::date AS first_date
  FROM registered_players
  GROUP BY LOWER(TRIM(name))
) sub
WHERE pp.name_key = sub.name_key AND pp.first_seen_at IS NULL;
