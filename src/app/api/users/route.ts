import { NextResponse } from 'next/server';
import { databaseErrorResponse } from '@/lib/databaseErrorResponse';
import { requireAdmin } from '@/lib/requireAuth';
import { AppUserRole, createAppUser, listAppUsers } from '@/lib/usersStore';

export const runtime = 'nodejs';

function authErrorResponse(error: unknown) {
  const msg = error instanceof Error ? error.message : '';
  if (msg === 'UNAUTHORIZED') {
    return NextResponse.json({ message: 'Nao autorizado.' }, { status: 401 });
  }
  if (msg === 'FORBIDDEN') {
    return NextResponse.json({ message: 'Apenas administradores podem gerenciar usuarios.' }, { status: 403 });
  }
  return null;
}

export async function GET() {
  try {
    await requireAdmin();
    const users = await listAppUsers();
    return NextResponse.json(users);
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;
    return databaseErrorResponse(error, 'Nao foi possivel listar usuarios.');
  }
}

export async function POST(request: Request) {
  let body: { name?: string; login?: string; password?: string; role?: AppUserRole };
  try {
    body = (await request.json()) as { name?: string; login?: string; password?: string; role?: AppUserRole };
  } catch {
    return NextResponse.json({ message: 'JSON invalido.' }, { status: 400 });
  }

  try {
    await requireAdmin();

    const requestedRole = body.role === 'admin' ? 'admin' : 'user';

    const created = await createAppUser({
      name: body.name?.trim() ?? '',
      login: body.login?.trim() ?? '',
      password: body.password ?? '',
      role: requestedRole,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;

    const msg = error instanceof Error ? error.message : 'Nao foi possivel criar usuario.';
    if (msg.includes('obrigatorios') || msg.includes('login ja') || msg.includes('senha')) {
      return NextResponse.json({ message: msg }, { status: 400 });
    }

    return databaseErrorResponse(error, 'Nao foi possivel criar usuario.');
  }
}
