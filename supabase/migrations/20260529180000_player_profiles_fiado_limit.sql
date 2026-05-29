CREATE TABLE IF NOT EXISTS player_profiles (
  name_key TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  fiado_limit NUMERIC(12, 2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS player_profiles_display_name_idx ON player_profiles (display_name);
