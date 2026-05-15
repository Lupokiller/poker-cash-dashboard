import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AUTH_COOKIE, createSessionToken, SESSION_MAX_AGE_SEC } from '@/lib/auth';
import { databaseErrorResponse } from '@/lib/databaseErrorResponse';
import { verifyUserLogin } from '@/lib/usersStore';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: { username?: string; password?: string };
  try {
    body = (await request.json()) as { username?: string; password?: string };
  } catch {
    return NextResponse.json({ message: 'JSON invalido.' }, { status: 400 });
  }

  const username = body.username?.trim() ?? '';
  const password = body.password ?? '';

  if (!username || !password) {
    return NextResponse.json({ message: 'Usuario e senha sao obrigatorios.' }, { status: 400 });
  }

  try {
    const user = await verifyUserLogin(username, password);
    if (!user) {
      return NextResponse.json({ message: 'Usuario ou senha incorretos.' }, { status: 401 });
    }

    const token = await createSessionToken({ id: user.id, name: user.name, role: user.role });
    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SEC,
    });

    return NextResponse.json({
      ok: true,
      user: { id: user.id, name: user.name, role: user.role, login: user.login },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('AUTH_SECRET') || msg.includes('Banco nao configurado') || msg.includes('DATABASE_URL')) {
      return databaseErrorResponse(error, 'Autenticacao indisponivel.');
    }
    if (msg.includes('relation "app_users" does not exist')) {
      return NextResponse.json(
        { message: 'Tabela de usuarios nao existe. Execute a migracao app_users no Supabase (npm run db:push).' },
        { status: 503 }
      );
    }
    console.error(error);
    return NextResponse.json({ message: 'Nao foi possivel entrar.' }, { status: 500 });
  }
}
