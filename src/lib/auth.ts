import { SignJWT, jwtVerify } from 'jose';
import type { NextRequest } from 'next/server';
import { isBossLogin, parseAppUserRole, type AppUserRole } from './userRoles';

export const AUTH_COOKIE = 'poker_auth';
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

export interface SessionPayload {
  sub: string;
  name: string;
  login: string;
  role: AppUserRole;
  isBoss: boolean;
}

function getSecretKey() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 16) {
    throw new Error('AUTH_SECRET nao configurado (minimo 16 caracteres).');
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: {
  id: string;
  name: string;
  login: string;
  role: AppUserRole;
}): Promise<string> {
  return new SignJWT({
    sub: user.id,
    name: user.name,
    login: user.login,
    role: user.role,
    isBoss: isBossLogin(user.login),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const sub = payload.sub;
    const name = payload.name;
    const login = typeof payload.login === 'string' ? payload.login : '';
    const role = parseAppUserRole(payload.role);
    if (typeof sub !== 'string' || !sub) {
      return null;
    }
    if (typeof name !== 'string' || !name) {
      return null;
    }
    if (!role) {
      return null;
    }
    return {
      sub,
      name,
      login,
      role,
      isBoss: Boolean(payload.isBoss) || isBossLogin(login),
    };
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(request: NextRequest): Promise<SessionPayload | null> {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) {
    return null;
  }
  return verifySessionToken(token);
}
