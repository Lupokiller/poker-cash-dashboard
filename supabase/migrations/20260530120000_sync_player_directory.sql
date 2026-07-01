-- Popula player_profiles com todos os jogadores já cadastrados em sessões.
INSERT INTO player_profiles (name_key, display_name, phone, fiado_limit)
SELECT DISTINCT ON (LOWER(TRIM(name)))
  LOWER(TRIM(name)),
  TRIM(name),
  COALESCE(phone, ''),
  0
FROM registered_players
ORDER BY LOWER(TRIM(name)),
  CASE WHEN COALESCE(phone, '') <> '' THEN 0 ELSE 1 END,
  created_at DESC
ON CONFLICT (name_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  phone = CASE
    WHEN EXCLUDED.phone <> '' THEN EXCLUDED.phone
    ELSE player_profiles.phone
  END,
  updated_at = NOW();
