-- Cargos: administrador | gerente | floor (remove admin/user / Dono/Dealer)
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_role_check;

UPDATE app_users SET role = 'administrador' WHERE role IN ('admin', 'administrador');
UPDATE app_users SET role = 'floor' WHERE role IN ('user', 'floor');
UPDATE app_users SET role = 'gerente' WHERE role = 'gerente';
UPDATE app_users SET role = 'administrador' WHERE login = 'caio lupo';

ALTER TABLE app_users
  ADD CONSTRAINT app_users_role_check
  CHECK (role IN ('administrador', 'gerente', 'floor'));
