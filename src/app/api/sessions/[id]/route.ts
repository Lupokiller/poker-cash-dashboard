import { NextResponse } from 'next/server';
import { databaseErrorResponse } from '@/lib/databaseErrorResponse';
import { requireTableManager } from '@/lib/requireAuth';
import { updateSessionStaffCost } from '@/lib/sessionsStore';

export const runtime = 'nodejs';

function authErrorResponse(error: unknown) {
  const msg = error instanceof Error ? error.message : '';
  if (msg === 'UNAUTHORIZED') {
    return NextResponse.json({ message: 'Nao autorizado.' }, { status: 401 });
  }
  if (msg === 'FORBIDDEN') {
    return NextResponse.json({ message: 'Apenas gerente ou administrador podem alterar custos de staff.' }, { status: 403 });
  }
  return null;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  let body: { staffCost?: unknown };
  try {
    body = (await request.json()) as { staffCost?: unknown };
  } catch {
    return NextResponse.json({ message: 'JSON invalido.' }, { status: 400 });
  }

  const staffCost = Number(body.staffCost ?? 0);
  if (Number.isNaN(staffCost) || staffCost < 0) {
    return NextResponse.json({ message: 'Custo de staff invalido.' }, { status: 400 });
  }

  try {
    await requireTableManager();
    const updated = await updateSessionStaffCost(id, staffCost);
    if (!updated) {
      return NextResponse.json({ message: 'Sessao nao encontrada.' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    const authRes = authErrorResponse(error);
    if (authRes) return authRes;

    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('invalido')) {
      return NextResponse.json({ message: msg }, { status: 400 });
    }

    return databaseErrorResponse(error, 'Nao foi possivel salvar o custo de staff.');
  }
}
