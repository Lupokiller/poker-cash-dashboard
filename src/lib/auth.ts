import { SignJWT, jwtVerify } from 'jose';
import type { NextRequest } from 'next/server';
import type { AppUserRole } from './usersStore';

export const AUTH_COOKIE = 'poker_auth';
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

export interface SessionPayload {
  sub: string;
  name: string;
  role: AppUserRole;
}

function getSecretKey() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 16) {
    throw new Error('AUTH_SECRET nao configurado (minimo 16 caracteres).');
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: { id: string; name: string; role: AppUserRole }): Promise<string> {
  return new SignJWT({ sub: user.id, name: user.name, role: user.role })
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
    const role = payload.role;
    if (typeof sub !== 'string' || !sub) {
      return null;
    }
    if (typeof name !== 'string' || !name) {
      return null;
    }
    if (role !== 'admin' && role !== 'user') {
      return null;
    }
    return { sub, name, role };
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
