import { NextResponse } from 'next/server';
import { databaseErrorResponse } from '@/lib/databaseErrorResponse';
import { requireAdmin } from '@/lib/requireAuth';
import { deleteAppUser } from '@/lib/usersStore';

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

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const userId = decodeURIComponent(id).trim();
  if (!userId) {
    return NextResponse.json({ message: 'Usuario invalido.' }, { status: 400 });
  }

  try {
    const session = await requireAdmin();
    await deleteAppUser(userId, session.sub);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;

    const msg = error instanceof Error ? error.message : '';
    if (
      msg.includes('nao pode') ||
      msg.includes('nao encontrado') ||
      msg.includes('invalido') ||
      msg.includes('si mesmo')
    ) {
      const status = msg.includes('nao encontrado') ? 404 : 400;
      return NextResponse.json({ message: msg }, { status });
    }

    return databaseErrorResponse(error, 'Nao foi possivel excluir o usuario.');
  }
}
