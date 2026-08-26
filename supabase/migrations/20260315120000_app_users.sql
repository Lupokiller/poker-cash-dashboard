-- Usuarios do painel (login na plataforma)
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  login TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('administrador', 'gerente', 'floor')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS app_users_login_idx ON app_users (login);

-- Chefe inicial: Caio Lupo / senha 210803 (login: caio lupo, sem diferenciar maiusculas)
INSERT INTO app_users (name, login, password_hash, role)
VALUES (
  'Caio Lupo',
  'caio lupo',
  'bb3bfa162c679b802b5d2d612e4d1117:074db96632037a1bd737f5cc3e5b9e7ac974e9dd46d07fe55d558cd0985fb02af359957b35e3c8d748e2b6d8b088436ded38ad40a0d39c81ea8f4a15f18bfa20',
  'administrador'
)
ON CONFLICT (login) DO NOTHING;
