import { getDbPool } from './db';
import { hashPassword, verifyPassword } from './password';
import {
  AppUserRole,
  BOSS_LOGIN,
  isBossLogin,
  normalizeLogin,
  parseAppUserRole,
} from './userRoles';

export type { AppUserRole } from './userRoles';
export { BOSS_LOGIN, isBossLogin, normalizeLogin };

export interface AppUser {
  id: string;
  name: string;
  login: string;
  role: AppUserRole;
  createdAt: string;
  /** Usuario chefe (Caio) — protegido contra exclusao. */
  isBoss: boolean;
}

interface AppUserRow {
  id: string;
  name: string;
  login: string;
  password_hash: string;
  role: string;
  created_at: string;
}

export function isBossUser(user: Pick<AppUser, 'login'>): boolean {
  return isBossLogin(user.login);
}

function mapPublicUser(row: AppUserRow): AppUser {
  const role = parseAppUserRole(row.role) ?? 'floor';
  return {
    id: row.id,
    name: row.name,
    login: row.login,
    role: isBossLogin(row.login) ? 'administrador' : role,
    createdAt: row.created_at,
    isBoss: isBossLogin(row.login),
  };
}

export async function findUserByLogin(login: string): Promise<(AppUser & { passwordHash: string }) | null> {
  const normalized = normalizeLogin(login);
  const pool = getDbPool();
  const result = await pool.query<AppUserRow>(
    `SELECT id, name, login, password_hash, role, created_at
     FROM app_users WHERE login = $1`,
    [normalized]
  );
  const row = result.rows[0];
  if (!row) {
    return null;
  }
  return { ...mapPublicUser(row), passwordHash: row.password_hash };
}

export async function verifyUserLogin(login: string, password: string): Promise<AppUser | null> {
  const user = await findUserByLogin(login);
  if (!user) {
    return null;
  }
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return null;
  }
  const { passwordHash: _, ...publicUser } = user;
  return publicUser;
}

export async function findUserById(id: string): Promise<AppUser | null> {
  const pool = getDbPool();
  const result = await pool.query<AppUserRow>(
    `SELECT id, name, login, password_hash, role, created_at
     FROM app_users WHERE id = $1`,
    [id]
  );
  const row = result.rows[0];
  return row ? mapPublicUser(row) : null;
}

export async function listAppUsers(): Promise<AppUser[]> {
  const pool = getDbPool();
  const result = await pool.query<AppUserRow>(
    `SELECT id, name, login, password_hash, role, created_at
     FROM app_users
     ORDER BY created_at ASC`
  );
  return result.rows.map(mapPublicUser);
}

export async function createAppUser(input: {
  name: string;
  login: string;
  password: string;
  role: AppUserRole;
}): Promise<AppUser> {
  const name = input.name.trim();
  const login = normalizeLogin(input.login);
  if (!name || !login || !input.password) {
    throw new Error('Nome, login e senha sao obrigatorios.');
  }
  if (input.password.length < 4) {
    throw new Error('A senha deve ter pelo menos 4 caracteres.');
  }
  if (isBossLogin(login)) {
    throw new Error('Este login e reservado ao usuario chefe.');
  }
  const role = parseAppUserRole(input.role);
  if (!role) {
    throw new Error('Cargo invalido. Use administrador, gerente ou floor.');
  }

  const passwordHash = await hashPassword(input.password);
  const pool = getDbPool();

  try {
    const result = await pool.query<AppUserRow>(
      `INSERT INTO app_users (name, login, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, login, password_hash, role, created_at`,
      [name, login, passwordHash, role]
    );
    return mapPublicUser(result.rows[0]);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      throw new Error('Este login ja esta em uso.');
    }
    throw error;
  }
}

export async function deleteAppUser(userId: string, actorId: string): Promise<void> {
  if (!userId) {
    throw new Error('Usuario invalido.');
  }
  if (userId === actorId) {
    throw new Error('Voce nao pode excluir a si mesmo.');
  }

  const target = await findUserById(userId);
  if (!target) {
    throw new Error('Usuario nao encontrado.');
  }
  if (target.isBoss) {
    throw new Error('O usuario chefe nao pode ser excluido.');
  }

  const pool = getDbPool();
  const result = await pool.query(`DELETE FROM app_users WHERE id = $1`, [userId]);
  if (result.rowCount === 0) {
    throw new Error('Usuario nao encontrado.');
  }
}
