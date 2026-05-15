import { getDbPool } from './db';
import { hashPassword, verifyPassword } from './password';

export type AppUserRole = 'admin' | 'user';

export interface AppUser {
  id: string;
  name: string;
  login: string;
  role: AppUserRole;
  createdAt: string;
}

interface AppUserRow {
  id: string;
  name: string;
  login: string;
  password_hash: string;
  role: AppUserRole;
  created_at: string;
}

export function normalizeLogin(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function mapPublicUser(row: AppUserRow): AppUser {
  return {
    id: row.id,
    name: row.name,
    login: row.login,
    role: row.role,
    createdAt: row.created_at,
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

  const passwordHash = await hashPassword(input.password);
  const pool = getDbPool();

  try {
    const result = await pool.query<AppUserRow>(
      `INSERT INTO app_users (name, login, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, login, password_hash, role, created_at`,
      [name, login, passwordHash, input.role]
    );
    return mapPublicUser(result.rows[0]);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      throw new Error('Este login ja esta em uso.');
    }
    throw error;
  }
}
