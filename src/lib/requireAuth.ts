import { cookies } from 'next/headers';
import { AUTH_COOKIE, SessionPayload, verifySessionToken } from './auth';
import { canControlTable, canManageUsers } from './userRoles';

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) {
    return null;
  }
  return verifySessionToken(token);
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }
  return session;
}

/** Gestao de usuarios: Chefe ou Administrador. */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireSession();
  if (!canManageUsers(session.role, session.login)) {
    throw new Error('FORBIDDEN');
  }
  return session;
}

/** Mesa / staff: Chefe, Administrador ou Gerente. */
export async function requireTableManager(): Promise<SessionPayload> {
  const session = await requireSession();
  if (!canControlTable(session.role, session.login)) {
    throw new Error('FORBIDDEN');
  }
  return session;
}
